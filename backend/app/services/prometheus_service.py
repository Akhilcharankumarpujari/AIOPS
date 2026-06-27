from __future__ import annotations

import asyncio
import logging
import math
import time
import uuid
from datetime import datetime, UTC
from typing import Any, cast

import httpx
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppException
from app.models.metrics import MetricsSnapshot
from app.schemas.prometheus import (
    ClusterMetricsResponse,
    HistoricalSeries,
    HistoricalSeriesSample,
    HistoricalMetricsResponse,
    NamespaceMetricsResponse,
    NodeMetricsResponse,
    PodMetricsResponse,
)

logger = logging.getLogger(__name__)


class MemoryCache:
    def __init__(self, default_ttl_seconds: int = 15) -> None:
        self._cache: dict[str, tuple[float, Any]] = {}
        self.default_ttl = default_ttl_seconds

    def get(self, key: str) -> Any | None:
        if key not in self._cache:
            return None
        expires_at, value = self._cache[key]
        if time.time() > expires_at:
            del self._cache[key]
            return None
        return value

    def set(self, key: str, value: Any, ttl_seconds: int | None = None) -> None:
        ttl = ttl_seconds if ttl_seconds is not None else self.default_ttl
        self._cache[key] = (time.time() + ttl, value)

    def clear(self) -> None:
        self._cache.clear()


# Global cache instance
_metrics_cache = MemoryCache()


def _safe_float(value: Any, default: float = 0.0) -> float:
    """Safely convert a Prometheus value string to float, handling NaN/Inf."""
    try:
        v = float(value)
        if math.isnan(v) or math.isinf(v):
            return default
        return v
    except (TypeError, ValueError):
        return default


class PrometheusService:
    def __init__(self, prometheus_url: str, session: AsyncSession) -> None:
        self.prometheus_url = prometheus_url.rstrip("/")
        self.session = session
        self.cache = _metrics_cache

    async def _query_instant(self, query: str) -> list[dict[str, Any]]:
        """Execute an instant PromQL query. Returns empty list on no-data (never raises on empty)."""
        cached = self.cache.get(query)
        if cached is not None:
            return cast(list[dict[str, Any]], cached)

        url = f"{self.prometheus_url}/api/v1/query"
        logger.info("prometheus_instant_query query=%r", query)
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params={"query": query}, timeout=10.0)
                logger.info(
                    "prometheus_instant_response status=%s query=%r",
                    resp.status_code,
                    query[:80],
                )
                if resp.status_code != 200:
                    logger.error(
                        "prometheus_query_failed status=%s body=%s query=%r",
                        resp.status_code,
                        resp.text[:500],
                        query,
                    )
                    raise AppException(
                        status_code=502,
                        code="prometheus_api_error",
                        message=f"Prometheus API returned error status {resp.status_code}",
                    )

                data = resp.json()
                if data.get("status") != "success":
                    logger.error(
                        "prometheus_query_error error=%r query=%r",
                        data.get("error"),
                        query,
                    )
                    raise AppException(
                        status_code=502,
                        code="prometheus_api_error",
                        message=f"Prometheus query error: {data.get('error', 'unknown error')}",
                    )

                result = data.get("data", {}).get("result", [])
                logger.info(
                    "prometheus_instant_result count=%d query=%r",
                    len(result),
                    query[:80],
                )
                self.cache.set(query, result)
                return cast(list[dict[str, Any]], result)
        except httpx.RequestError as e:
            logger.exception("prometheus_connection_failed url=%s", url)
            raise AppException(
                status_code=503,
                code="prometheus_connection_error",
                message="Failed to connect to the Prometheus server.",
            ) from e

    async def _query_range(
        self,
        query: str,
        start: datetime,
        end: datetime,
        step: int,
    ) -> list[dict[str, Any]]:
        """Execute a range PromQL query. Returns empty list on no-data."""
        url = f"{self.prometheus_url}/api/v1/query_range"
        # Prometheus accepts RFC3339 or Unix timestamps. Use Unix epoch for safety.
        params = {
            "query": query,
            "start": str(start.timestamp()),
            "end": str(end.timestamp()),
            "step": str(step),
        }
        logger.info(
            "prometheus_range_query query=%r start=%s end=%s step=%s",
            query[:80],
            params["start"],
            params["end"],
            step,
        )
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(url, params=params, timeout=15.0)
                logger.info(
                    "prometheus_range_response status=%s query=%r",
                    resp.status_code,
                    query[:80],
                )
                if resp.status_code != 200:
                    logger.error(
                        "prometheus_range_failed status=%s body=%s query=%r",
                        resp.status_code,
                        resp.text[:500],
                        query,
                    )
                    raise AppException(
                        status_code=502,
                        code="prometheus_api_error",
                        message=f"Prometheus API returned error status {resp.status_code}",
                    )

                data = resp.json()
                if data.get("status") != "success":
                    logger.error(
                        "prometheus_range_error error=%r query=%r",
                        data.get("error"),
                        query,
                    )
                    raise AppException(
                        status_code=502,
                        code="prometheus_api_error",
                        message=f"Prometheus query error: {data.get('error', 'unknown error')}",
                    )

                result = data.get("data", {}).get("result", [])
                logger.info(
                    "prometheus_range_result series_count=%d query=%r",
                    len(result),
                    query[:80],
                )
                return cast(list[dict[str, Any]], result)
        except httpx.RequestError as e:
            logger.exception("prometheus_connection_failed url=%s", url)
            raise AppException(
                status_code=503,
                code="prometheus_connection_error",
                message="Failed to connect to the Prometheus server.",
            ) from e

    async def get_nodes_metrics(self) -> list[NodeMetricsResponse]:
        """
        Fetch per-node CPU, Memory, Disk, and Network metrics.

        Disk query: mountpoint="/" is not available in Minikube/containerized envs.
        Use largest ext4/real filesystem instead, deduplicating by device.
        """
        # CPU: percentage idle inverted, averaged across all CPUs per instance
        cpu_q = '100 * (1 - avg by(instance) (rate(node_cpu_seconds_total{mode="idle"}[5m])))'

        # Memory: used percentage
        mem_q = "100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes))"

        # Disk: exclude tmpfs, overlay and other virtual filesystems; take the max
        # (the underlying real disk) using topk to pick one representative per instance
        disk_q = (
            'max by(instance) ('
            '  100 * (1 - (node_filesystem_avail_bytes{fstype!~"tmpfs|overlay|rootfs|squashfs|fuse.*|devtmpfs"}'
            '  / node_filesystem_size_bytes{fstype!~"tmpfs|overlay|rootfs|squashfs|fuse.*|devtmpfs"}))'
            ')'
        )

        rx_q = "sum by(instance) (rate(node_network_receive_bytes_total[5m]))"
        tx_q = "sum by(instance) (rate(node_network_transmit_bytes_total[5m]))"

        cpu_res, mem_res, disk_res, rx_res, tx_res = await asyncio.gather(
            self._query_instant(cpu_q),
            self._query_instant(mem_q),
            self._query_instant(disk_q),
            self._query_instant(rx_q),
            self._query_instant(tx_q),
        )

        logger.info(
            "nodes_metrics_raw cpu=%d mem=%d disk=%d rx=%d tx=%d",
            len(cpu_res), len(mem_res), len(disk_res), len(rx_res), len(tx_res),
        )

        nodes_data: dict[str, dict[str, float]] = {}

        def get_instance(metric: dict[str, str]) -> str:
            # Prefer 'instance' label; fall back to 'node' label (for kube-state-metrics)
            val = metric.get("instance") or metric.get("node") or "unknown"
            return val.split(":")[0]  # strip port

        for r in cpu_res:
            inst = get_instance(r["metric"])
            nodes_data.setdefault(inst, {})["cpu"] = _safe_float(r["value"][1])
        for r in mem_res:
            inst = get_instance(r["metric"])
            nodes_data.setdefault(inst, {})["memory"] = _safe_float(r["value"][1])
        for r in disk_res:
            inst = get_instance(r["metric"])
            # Keep the highest disk usage across mountpoints (already max by instance above)
            val = _safe_float(r["value"][1])
            existing = nodes_data.setdefault(inst, {}).get("disk", 0.0)
            nodes_data[inst]["disk"] = max(existing, val)
        for r in rx_res:
            inst = get_instance(r["metric"])
            nodes_data.setdefault(inst, {})["rx"] = _safe_float(r["value"][1])
        for r in tx_res:
            inst = get_instance(r["metric"])
            nodes_data.setdefault(inst, {})["tx"] = _safe_float(r["value"][1])

        # If Prometheus has data but no instance could be determined, fall back to
        # an aggregated single-node entry using the cluster averages.
        if not nodes_data and (cpu_res or mem_res):
            logger.warning("nodes_metrics_no_instance_label - using aggregated fallback")
            agg: dict[str, float] = {}
            if cpu_res:
                agg["cpu"] = _safe_float(cpu_res[0]["value"][1])
            if mem_res:
                agg["memory"] = _safe_float(mem_res[0]["value"][1])
            if disk_res:
                agg["disk"] = _safe_float(disk_res[0]["value"][1])
            if rx_res:
                agg["rx"] = _safe_float(rx_res[0]["value"][1])
            if tx_res:
                agg["tx"] = _safe_float(tx_res[0]["value"][1])
            nodes_data["cluster"] = agg

        result = [
            NodeMetricsResponse(
                node_name=name,
                cpu_usage_pct=round(stats.get("cpu", 0.0), 2),
                memory_usage_pct=round(stats.get("memory", 0.0), 2),
                disk_usage_pct=round(stats.get("disk", 0.0), 2),
                network_rx_bytes_sec=round(stats.get("rx", 0.0), 2),
                network_tx_bytes_sec=round(stats.get("tx", 0.0), 2),
            )
            for name, stats in nodes_data.items()
        ]
        logger.info("nodes_metrics_result count=%d", len(result))
        return result

    async def get_pods_metrics(self, namespace: str | None = None) -> list[PodMetricsResponse]:
        ns_filter = f'namespace="{namespace}"' if namespace else ""
        container_filter = f'container!="",{ns_filter}'.strip(",")
        common_filter = f"{ns_filter}".strip(",")

        cpu_q = f"sum by(pod, namespace) (rate(container_cpu_usage_seconds_total{{{container_filter}}}[5m]))"
        mem_q = f"sum by(pod, namespace) (container_memory_working_set_bytes{{{container_filter}}})"
        restarts_q = f"sum by(pod, namespace) (kube_pod_container_status_restarts_total{{{common_filter}}})"
        status_q = f"sum by(pod, namespace, phase) (kube_pod_status_phase{{{common_filter}}})"

        cpu_res, mem_res, restarts_res, status_res = await asyncio.gather(
            self._query_instant(cpu_q),
            self._query_instant(mem_q),
            self._query_instant(restarts_q),
            self._query_instant(status_q),
        )

        pods_data: dict[tuple[str, str], dict[str, Any]] = {}

        for r in cpu_res:
            key = (r["metric"].get("pod", "unknown"), r["metric"].get("namespace", "default"))
            pods_data.setdefault(key, {})["cpu"] = _safe_float(r["value"][1])
        for r in mem_res:
            key = (r["metric"].get("pod", "unknown"), r["metric"].get("namespace", "default"))
            pods_data.setdefault(key, {})["memory"] = int(_safe_float(r["value"][1]))
        for r in restarts_res:
            key = (r["metric"].get("pod", "unknown"), r["metric"].get("namespace", "default"))
            pods_data.setdefault(key, {})["restarts"] = int(_safe_float(r["value"][1]))
        for r in status_res:
            key = (r["metric"].get("pod", "unknown"), r["metric"].get("namespace", "default"))
            # phase label (kube-state-metrics v2+) or status label (older)
            phase = r["metric"].get("phase") or r["metric"].get("status", "Unknown")
            if _safe_float(r["value"][1]) > 0:
                pods_data.setdefault(key, {})["status"] = phase

        return [
            PodMetricsResponse(
                pod_name=k[0],
                namespace=k[1],
                cpu_cores=round(stats.get("cpu", 0.0), 6),
                memory_bytes=stats.get("memory", 0),
                restarts=stats.get("restarts", 0),
                status=stats.get("status", "Running"),
            )
            for k, stats in pods_data.items()
        ]

    async def get_pod_metrics(self, name: str, namespace: str = "default") -> PodMetricsResponse:
        pods = await self.get_pods_metrics(namespace)
        for p in pods:
            if p.pod_name == name:
                return p
        raise AppException(
            status_code=404,
            code="prometheus_pod_not_found",
            message=f"Metrics for pod '{name}' in namespace '{namespace}' not found.",
        )

    async def get_namespace_metrics(self, namespace: str) -> NamespaceMetricsResponse:
        pods = await self.get_pods_metrics(namespace)
        cpu_sum = sum(p.cpu_cores for p in pods)
        mem_sum = sum(p.memory_bytes for p in pods)
        return NamespaceMetricsResponse(
            namespace=namespace,
            pod_count=len(pods),
            cpu_cores=cpu_sum,
            memory_bytes=mem_sum,
        )

    async def get_cluster_metrics(self) -> ClusterMetricsResponse:
        # Use kube-state-metrics for node/pod counts
        nodes_q = "count(kube_node_info)"
        nodes_ready_q = 'count(kube_node_status_condition{condition="Ready", status="true"})'
        pods_q = "count(kube_pod_info)"
        # kube-state-metrics v2 uses 'phase' label; v1 uses no label but group by phase
        pods_running_q = 'sum(kube_pod_status_phase{phase="Running"})'
        pods_failed_q = 'sum(kube_pod_status_phase{phase="Failed"})'
        ns_pods_q = "sum by(namespace) (kube_pod_info)"

        n_res, nr_res, p_res, pr_res, pf_res, ns_res = await asyncio.gather(
            self._query_instant(nodes_q),
            self._query_instant(nodes_ready_q),
            self._query_instant(pods_q),
            self._query_instant(pods_running_q),
            self._query_instant(pods_failed_q),
            self._query_instant(ns_pods_q),
        )

        n_total = int(_safe_float(n_res[0]["value"][1])) if n_res else 0
        n_ready = int(_safe_float(nr_res[0]["value"][1])) if nr_res else 0
        p_total = int(_safe_float(p_res[0]["value"][1])) if p_res else 0
        p_running = int(_safe_float(pr_res[0]["value"][1])) if pr_res else 0
        p_failed = int(_safe_float(pf_res[0]["value"][1])) if pf_res else 0

        namespaces_summary = []
        for ns_item in ns_res:
            ns_name = ns_item["metric"].get("namespace", "unknown")
            ns_pods_count = int(_safe_float(ns_item["value"][1]))
            try:
                ns_metrics = await self.get_namespace_metrics(ns_name)
                namespaces_summary.append(ns_metrics)
            except Exception:
                namespaces_summary.append(
                    NamespaceMetricsResponse(
                        namespace=ns_name,
                        pod_count=ns_pods_count,
                        cpu_cores=0.0,
                        memory_bytes=0,
                    )
                )

        return ClusterMetricsResponse(
            nodes_total=n_total,
            nodes_ready=n_ready,
            pods_total=p_total,
            pods_running=p_running,
            pods_failed=p_failed,
            namespaces=namespaces_summary,
        )

    async def get_historical_metrics(
        self,
        query: str,
        start: datetime,
        end: datetime,
        step: int,
        save_snapshot: bool = False,
        incident_id: uuid.UUID | None = None,
        system_id: uuid.UUID | None = None,
        summary: str | None = None,
    ) -> HistoricalMetricsResponse:
        raw_result = await self._query_range(query, start, end, step)

        series_list = []
        all_values = []

        for r in raw_result:
            samples = []
            for v in r.get("values", []):
                ts = datetime.fromtimestamp(float(v[0]), UTC)
                val = _safe_float(v[1])
                samples.append(HistoricalSeriesSample(timestamp=ts, value=val))
                all_values.append(val)
            if samples:
                series_list.append(
                    HistoricalSeries(metric_labels=r.get("metric", {}), samples=samples)
                )

        snapshot_id = None
        if save_snapshot:
            min_val = min(all_values) if all_values else 0.0
            max_val = max(all_values) if all_values else 0.0
            avg_val = sum(all_values) / len(all_values) if all_values else 0.0

            db_samples = [
                {
                    "metric": r["metric"],
                    "values": [[int(float(v[0])), _safe_float(v[1])] for v in r.get("values", [])],
                }
                for r in raw_result
            ]

            snapshot = MetricsSnapshot(
                id=uuid.uuid4(),
                incident_id=incident_id,
                system_id=system_id,
                source="prometheus",
                query=query,
                time_range_start=start,
                time_range_end=end,
                step_seconds=step,
                summary=summary,
                samples=db_samples,
                statistics={
                    "min": min_val,
                    "max": max_val,
                    "avg": avg_val,
                    "count": len(all_values),
                },
                captured_at=datetime.now(UTC),
            )
            self.session.add(snapshot)
            await self.session.commit()
            snapshot_id = snapshot.id

        return HistoricalMetricsResponse(
            query=query,
            start_time=start,
            end_time=end,
            step_seconds=step,
            series=series_list,
            snapshot_id=snapshot_id,
        )
