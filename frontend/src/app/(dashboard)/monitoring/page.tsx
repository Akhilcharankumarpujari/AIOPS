'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { prometheusService } from '@/services/prometheus.service';
import { k8sService } from '@/services/k8s.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { RefreshCw, Cpu, Activity, HardDrive, Network, AlertTriangle } from 'lucide-react';

export default function MonitoringPage() {
  const { toast } = useToast();
  const [selectedNamespace, setSelectedNamespace] = useState('all');
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  useEffect(() => {
    setStart(new Date(Date.now() - 3600 * 1000).toISOString());
    setEnd(new Date().toISOString());
  }, []);

  // --- QUERY HOOKS ---
  const { 
    data: nodeMetrics, 
    isLoading: nodesLoading, 
    error: nodesError,
    refetch: refetchNodes 
  } = useQuery({
    queryKey: ['nodeMetrics'],
    queryFn: prometheusService.getNodesMetrics,
    refetchInterval: 15000,
  });

  const { 
    data: podMetrics, 
    isLoading: podsLoading, 
    error: podsError,
    refetch: refetchPods 
  } = useQuery({
    queryKey: ['podMetrics', selectedNamespace],
    queryFn: () => prometheusService.getPodsMetrics(selectedNamespace),
    refetchInterval: 15000,
  });

  const { data: namespaces } = useQuery({
    queryKey: ['namespaces'],
    queryFn: k8sService.listNamespaces,
  });

  // Prometheus range time-series queries
  const { data: cpuHistory } = useQuery({
    queryKey: ['cpuHistoryMonitor', start, end],
    queryFn: () => prometheusService.getHistoricalMetrics(
      '100 * (1 - avg(rate(node_cpu_seconds_total{mode="idle"}[5m])))',
      start,
      end,
      120
    ),
    enabled: !!start && !!end,
    refetchInterval: 15000,
  });

  const { data: memHistory } = useQuery({
    queryKey: ['memHistoryMonitor', start, end],
    queryFn: () => prometheusService.getHistoricalMetrics(
      'avg(100 * (1 - (node_memory_MemAvailable_bytes / node_memory_MemTotal_bytes)))',
      start,
      end,
      120
    ),
    enabled: !!start && !!end,
    refetchInterval: 15000,
  });

  const { data: netHistory } = useQuery({
    queryKey: ['netHistoryMonitor', start, end],
    queryFn: () => prometheusService.getHistoricalMetrics(
      '(sum(rate(node_network_receive_bytes_total[5m])) + sum(rate(node_network_transmit_bytes_total[5m]))) / 1024 / 1024',
      start,
      end,
      120
    ),
    enabled: !!start && !!end,
    refetchInterval: 15000,
  });

  const handleManualRefresh = () => {
    refetchNodes();
    refetchPods();
    toast('Info', 'Refreshed active metrics', 'info');
  };

  const nsOptions = [
    { value: 'all', label: 'All Namespaces' },
    ...(namespaces || []).map((ns) => ({ value: ns.name, label: ns.name })),
  ];

  // Combine CPU, Mem and Network history into unified chart array
  const combineHistoryData = () => {
    const dataMap: Record<string, { time: string; cpu: number; mem: number; net: number }> = {};

    const processSeries = (res: { series?: { samples: { timestamp: string; value: number }[] }[] } | undefined, key: 'cpu' | 'mem' | 'net') => {
      if (!res || !res.series || res.series.length === 0) return;
      res.series[0].samples.forEach((sample) => {
        const timeStr = new Date(sample.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!dataMap[timeStr]) {
          dataMap[timeStr] = { time: timeStr, cpu: 0, mem: 0, net: 0 };
        }
        dataMap[timeStr][key] = Math.round(sample.value * 100) / 100;
      });
    };

    processSeries(cpuHistory, 'cpu');
    processSeries(memHistory, 'mem');
    processSeries(netHistory, 'net');

    return Object.values(dataMap).sort((a, b) => a.time.localeCompare(b.time));
  };

  const chartData = combineHistoryData();
  const isHistoryChartEmpty = chartData.length === 0;

  // --- LOADING STATE ---
  if (nodesLoading || podsLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-16 bg-zinc-800/30 rounded-lg"></div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-72 bg-zinc-800/20 rounded-lg"></div>
          <div className="h-72 bg-zinc-800/20 rounded-lg"></div>
        </div>
        <div className="h-60 bg-zinc-800/20 rounded-lg"></div>
      </div>
    );
  }

  // --- ERROR STATE ---
  if (nodesError || podsError) {
    return (
      <div className="h-[30rem] flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 bg-red-500/15 rounded-full border border-red-500/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-100">Metrics Fetch Failed</h3>
          <p className="text-sm text-zinc-400 max-w-md mt-1">
            Could not retrieve cluster metrics from Prometheus. Check if the Prometheus server is running.
          </p>
        </div>
        <button
          onClick={handleManualRefresh}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-xs transition-colors"
        >
          Retry Fetching
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* ── HEADER ROWS ── */}
      <div className="flex justify-between items-center bg-card p-4 rounded-lg border border-border">
        <div className="flex items-center space-x-3">
          <span className="text-xs text-zinc-500 font-semibold">Namespace Filter:</span>
          <Select
            options={nsOptions}
            value={selectedNamespace}
            onChange={(e) => setSelectedNamespace(e.target.value)}
            className="w-44 bg-zinc-950/40 border-zinc-800 text-white"
          />
        </div>
        <Button
          variant="outline"
          size="sm"
          className="text-zinc-400 hover:text-white border-zinc-800 flex items-center gap-2"
          onClick={handleManualRefresh}
        >
          <RefreshCw className="h-4 w-4" />
          Force Reload
        </Button>
      </div>

      {/* ── HISTORICAL GRAPH TRENDS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* CPU & Memory time-series */}
        <Card className="glass-panel text-white">
          <CardHeader>
            <span className="text-md font-semibold flex items-center gap-2">
              <Cpu className="h-4.5 w-4.5 text-purple-400" />
              Node CPU & Memory load (Last Hour)
            </span>
          </CardHeader>
          <CardContent className="h-72">
            {isHistoryChartEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Activity className="h-8 w-8 text-zinc-700 animate-pulse" />
                <span className="text-xs">No Node CPU/Memory metrics available from Prometheus</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="memGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#8b5cf6" fillOpacity={1} fill="url(#cpuGrad)" strokeWidth={2} />
                  <Area type="monotone" dataKey="mem" name="Memory (%)" stroke="#6366f1" fillOpacity={1} fill="url(#memGrad)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Network bandwidth trend */}
        <Card className="glass-panel text-white">
          <CardHeader>
            <span className="text-md font-semibold flex items-center gap-2">
              <Network className="h-4.5 w-4.5 text-blue-400" />
              Network Traffic Volume (TX/RX)
            </span>
          </CardHeader>
          <CardContent className="h-72">
            {isHistoryChartEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Activity className="h-8 w-8 text-zinc-700 animate-pulse" />
                <span className="text-xs">No Network Bandwidth metrics available from Prometheus</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                  <Area type="monotone" dataKey="net" name="Bandwidth (MB/s)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.08} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>

      {/* ── NODES METRIC LOAD TABLE ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <HardDrive className="h-4.5 w-4.5 text-zinc-400" />
            Active Node Metrics (Prometheus)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!nodeMetrics || nodeMetrics.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-xs">No active node metrics available</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-4 font-semibold">Node Name</th>
                  <th className="py-3 px-4 font-semibold">CPU Usage</th>
                  <th className="py-3 px-4 font-semibold">Memory Usage</th>
                  <th className="py-3 px-4 font-semibold">Disk Space</th>
                  <th className="py-3 px-4 font-semibold">Net RX</th>
                  <th className="py-3 px-4 font-semibold">Net TX</th>
                </tr>
              </thead>
              <tbody>
                {nodeMetrics.map((node) => (
                  <tr key={node.node_name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 font-semibold text-zinc-200">{node.node_name}</td>
                    <td className="py-3 px-4 font-mono">
                      <span className={node.cpu_usage_pct > 80 ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                        {node.cpu_usage_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">
                      <span className={node.memory_usage_pct > 85 ? 'text-red-400 font-bold' : 'text-zinc-300'}>
                        {node.memory_usage_pct}%
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{node.disk_usage_pct}%</td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{(node.network_rx_bytes_sec / (1024 * 1024)).toFixed(2)} MB/s</td>
                    <td className="py-3 px-4 font-mono text-zinc-400">{(node.network_tx_bytes_sec / (1024 * 1024)).toFixed(2)} MB/s</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── PODS LOAD METRICS ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <Activity className="h-4.5 w-4.5 text-zinc-400" />
            Top Heavy Pods Load (Prometheus)
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!podMetrics || podMetrics.length === 0 ? (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-xs">No active pod metrics inside selected namespace</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-4 font-semibold">Pod Name</th>
                  <th className="py-3 px-4 font-semibold">Namespace</th>
                  <th className="py-3 px-4 font-semibold">CPU cores</th>
                  <th className="py-3 px-4 font-semibold">Memory</th>
                  <th className="py-3 px-4 font-semibold">Restarts</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {podMetrics.map((pod) => (
                  <tr key={pod.pod_name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 font-semibold text-zinc-200">{pod.pod_name}</td>
                    <td className="py-3 px-4 text-zinc-400">{pod.namespace}</td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{(pod.cpu_cores * 1000).toFixed(0)}m</td>
                    <td className="py-3 px-4 font-mono text-zinc-300">{(pod.memory_bytes / (1024 * 1024)).toFixed(1)} MiB</td>
                    <td className="py-3 px-4 text-zinc-300">{pod.restarts}</td>
                    <td className="py-3 px-4">
                      <Badge variant={pod.status === 'Running' ? 'success' : 'warning'}>{pod.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
