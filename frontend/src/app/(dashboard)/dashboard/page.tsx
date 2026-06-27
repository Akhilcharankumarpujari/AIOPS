'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { k8sService } from '@/services/k8s.service';
import { prometheusService } from '@/services/prometheus.service';
import { incidentsService } from '@/services/incidents.service';
import { alertsService } from '@/services/alerts.service';
import { healthService } from '@/services/health.service';
import { Incident, Pod } from '@/types';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { ShieldCheck, Cpu, Activity, AlertTriangle } from 'lucide-react';

const COLORS = ['#8b5cf6', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function DashboardPage() {
  const [start, setStart] = useState<string>('');
  const [end, setEnd] = useState<string>('');

  useEffect(() => {
    // Generate ISO timestamps for PromQL range query
    setStart(new Date(Date.now() - 3600 * 1000).toISOString());
    setEnd(new Date().toISOString());
  }, []);

  // --- HEALTH & METRICS QUERIES ---
  const { 
    data: readinessData, 
    isLoading: readinessLoading, 
    error: readinessError,
    refetch: refetchReadiness 
  } = useQuery({
    queryKey: ['readiness'],
    queryFn: healthService.checkReady,
    refetchInterval: 15000,
  });

  const { 
    data: clusterHealth, 
    isLoading: healthLoading, 
    error: healthError,
    refetch: refetchHealth 
  } = useQuery({
    queryKey: ['clusterHealth'],
    queryFn: k8sService.getClusterHealth,
    refetchInterval: 15000,
  });

  const { 
    data: nodes, 
    isLoading: nodesLoading, 
    refetch: refetchNodes 
  } = useQuery({
    queryKey: ['nodes'],
    queryFn: async () => {
      try { return await k8sService.listNodes(); }
      catch { return [] as import('@/types').K8sNode[]; }
    },
    retry: false,
  });

  const { 
    data: pods, 
    isLoading: podsLoading, 
    refetch: refetchPods 
  } = useQuery({
    queryKey: ['pods'],
    queryFn: async () => {
      try { return await k8sService.listPods(); }
      catch { return [] as import('@/types').Pod[]; }
    },
    retry: false,
  });

  const { 
    data: deployments, 
    isLoading: deploysLoading, 
    refetch: refetchDeployments 
  } = useQuery({
    queryKey: ['deployments'],
    queryFn: async () => {
      try { return await k8sService.listDeployments(); }
      catch { return [] as import('@/types').Deployment[]; }
    },
    retry: false,
  });

  const { 
    data: incidentsData, 
    isLoading: incidentsLoading, 
    error: incidentsError,
    refetch: refetchIncidents 
  } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => incidentsService.listIncidents({ page: 1, size: 100 }),
    retry: 1,
  });

  const { 
    data: alerts, 
    isLoading: alertsLoading, 
    error: alertsError,
    refetch: refetchAlerts 
  } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsService.listAlerts({ limit: 100 }),
    retry: 1,
  });

  const { 
    data: nodeMetrics, 
    isLoading: nodeMetricsLoading, 
    refetch: refetchNodeMetrics 
  } = useQuery({
    queryKey: ['nodeMetrics'],
    queryFn: async () => {
      try { return await prometheusService.getNodesMetrics(); }
      catch { return []; }
    },
    refetchInterval: 15000,
    retry: false,
  });

  // --- PROMETHEUS TIME SERIES QUERIES ---
  const { data: cpuHistory } = useQuery({
    queryKey: ['cpuHistory', start, end],
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
    queryKey: ['memHistory', start, end],
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
    queryKey: ['netHistory', start, end],
    queryFn: () => prometheusService.getHistoricalMetrics(
      '(sum(rate(node_network_receive_bytes_total[5m])) + sum(rate(node_network_transmit_bytes_total[5m]))) / 1024 / 1024',
      start,
      end,
      120
    ),
    enabled: !!start && !!end,
    refetchInterval: 15000,
  });

  const refetchAll = () => {
    refetchReadiness();
    refetchHealth();
    refetchNodes();
    refetchPods();
    refetchDeployments();
    refetchIncidents();
    refetchAlerts();
    refetchNodeMetrics();
  };

  // --- LOADING STATE: only block on core data ---
  const isCoreLoading = readinessLoading || healthLoading || incidentsLoading || alertsLoading;
  if (isCoreLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="glass-panel text-white border-zinc-800 h-32">
              <div className="h-4 bg-zinc-800/40 rounded m-4 w-2/3"></div>
              <div className="h-8 bg-zinc-800/20 rounded mx-4 my-2"></div>
            </Card>
          ))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-zinc-800/30 rounded-lg"></div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-80 bg-zinc-800/20 rounded-lg"></div>
          <div className="h-80 bg-zinc-800/20 rounded-lg"></div>
        </div>
      </div>
    );
  }

  // --- ERROR STATE: only show when core backend is truly unreachable ---
  const isCoreError = (readinessError || incidentsError || alertsError) &&
    // Only treat as fatal if it's a network/auth error, not a 404
    (() => {
      const err = (readinessError || incidentsError || alertsError) as { response?: { status?: number } } | null;
      return !err?.response?.status || err.response.status === 401 || err.response.status === 403 || err.response.status >= 500;
    })();

  if (isCoreError) {
    return (
      <div className="h-[30rem] flex flex-col items-center justify-center text-center space-y-4">
        <div className="p-3 bg-red-500/15 rounded-full border border-red-500/20">
          <AlertTriangle className="h-8 w-8 text-red-500" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-zinc-100">API Connection Failed</h3>
          <p className="text-sm text-zinc-400 max-w-md mt-1">
            Failed to connect to the AIOps backend server. Please ensure the backend is running and your API URL is correct in Settings.
          </p>
        </div>
        <button
          onClick={refetchAll}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded font-medium text-xs transition-colors"
        >
          Retry Connection
        </button>
      </div>
    );
  }

  // --- DATA CALCULATIONS ---
  const nodeCount = nodes?.length || clusterHealth?.nodes?.total || 0;
  const podCount = pods?.length || clusterHealth?.pods?.total || 0;
  const deploymentsCount = deployments?.length || 0;

  // Cluster health status evaluation
  const getClusterHealthStatus = () => {
    if (!readinessData) {
      return { status: 'Unknown', color: 'text-zinc-500', desc: 'Readiness check pending' };
    }
    if (readinessData.status === 'not_ready') {
      return { status: 'Unhealthy', color: 'text-red-500', desc: 'Database or dependencies offline' };
    }
    if (clusterHealth && clusterHealth.status) {
      const status = clusterHealth.status.toLowerCase();
      if (status === 'unhealthy') {
        return { status: 'Unhealthy', color: 'text-red-500', desc: 'Kubernetes API reports failures' };
      }
      if (status === 'degraded') {
        return { status: 'Degraded', color: 'text-amber-500', desc: 'Some nodes or pods are failing' };
      }
    }
    return { status: 'Healthy', color: 'text-emerald-400', desc: 'All control plane components online' };
  };

  const healthInfo = getClusterHealthStatus();

  // Alerts evaluations
  const activeAlerts = alerts?.length || 0;
  const firingAlertsCount = alerts?.filter(a => a.status === 'firing').length || 0;
  const criticalAlertsCount = alerts?.filter(a => a.severity === 'critical' || a.severity === 'high').length || 0;

  // Incidents evaluations
  const openIncidents = incidentsData?.total || 0;
  const criticalIncidentsCount = incidentsData?.items.filter(
    (inc: Incident) => inc.severity === 'critical' || inc.severity === 'high'
  ).length || 0;

  // Averages for gauges
  const avgCpu = nodeMetrics && nodeMetrics.length > 0
    ? Math.round(nodeMetrics.reduce((acc, curr) => acc + curr.cpu_usage_pct, 0) / nodeMetrics.length)
    : 0;

  const avgMem = nodeMetrics && nodeMetrics.length > 0
    ? Math.round(nodeMetrics.reduce((acc, curr) => acc + curr.memory_usage_pct, 0) / nodeMetrics.length)
    : 0;

  const avgDisk = nodeMetrics && nodeMetrics.length > 0
    ? Math.round(nodeMetrics.reduce((acc, curr) => acc + curr.disk_usage_pct, 0) / nodeMetrics.length)
    : 0;

  // Combine CPU, Mem and Network history into unified chart array
  const combineHistoryData = () => {
    const dataMap: Record<string, { time: string; cpu: number; memory: number; network: number }> = {};

    const processSeries = (res: { series?: { samples: { timestamp: string; value: number }[] }[] } | undefined, key: 'cpu' | 'memory' | 'network') => {
      if (!res || !res.series || res.series.length === 0) return;
      res.series[0].samples.forEach((sample) => {
        const timeStr = new Date(sample.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        if (!dataMap[timeStr]) {
          dataMap[timeStr] = { time: timeStr, cpu: 0, memory: 0, network: 0 };
        }
        dataMap[timeStr][key] = Math.round(sample.value * 100) / 100;
      });
    };

    processSeries(cpuHistory, 'cpu');
    processSeries(memHistory, 'memory');
    processSeries(netHistory, 'network');

    return Object.values(dataMap).sort((a, b) => a.time.localeCompare(b.time));
  };

  const chartData = combineHistoryData();
  const isHistoryChartEmpty = chartData.length === 0;

  // Calculate dynamic pod allocation distribution for pie chart
  const getPodStatusData = () => {
    if (!pods || pods.length === 0) {
      if (clusterHealth && clusterHealth.pods) {
        return [
          { name: 'Running', value: clusterHealth.pods.running || 0 },
          { name: 'Pending', value: clusterHealth.pods.pending || 0 },
          { name: 'Failed', value: clusterHealth.pods.failed || 0 },
          { name: 'Unknown', value: clusterHealth.pods.unknown || 0 },
        ].filter(v => v.value > 0);
      }
      return [];
    }

    const counts: Record<string, number> = { Running: 0, Pending: 0, Failed: 0, Succeeded: 0, Unknown: 0 };
    pods.forEach((p: Pod) => {
      const status = p.status || 'Unknown';
      counts[status] = (counts[status] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .filter((item) => item.value > 0);
  };

  const podStatusData = getPodStatusData();

  // Generate dynamic incident trend for last 7 days from live data
  const getIncidentTrendData = () => {
    if (!incidentsData || !incidentsData.items || incidentsData.items.length === 0) {
      return [];
    }

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const trendMap: Record<string, { day: string; open: number; resolved: number }> = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayName = days[d.getDay()];
      trendMap[dayName] = { day: dayName, open: 0, resolved: 0 };
    }

    incidentsData.items.forEach((inc: Incident) => {
      const date = new Date(inc.created_at);
      const dayName = days[date.getDay()];
      if (trendMap[dayName]) {
        if (inc.status === 'resolved' || inc.status === 'closed') {
          trendMap[dayName].resolved += 1;
        } else {
          trendMap[dayName].open += 1;
        }
      }
    });

    return Object.values(trendMap);
  };

  const incidentTrendData = getIncidentTrendData();

  return (
    <div className="space-y-6">
      
      {/* ── METRIC CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Cluster Health */}
        <Card className="glass-panel text-white hover:border-purple-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-zinc-400">Cluster Health</span>
            <ShieldCheck className={`h-5 w-5 ${healthInfo.color}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${healthInfo.color}`}>{healthInfo.status}</div>
            <p className="text-xs text-zinc-400 mt-1">{healthInfo.desc}</p>
          </CardContent>
        </Card>

        {/* Nodes & Pods */}
        <Card className="glass-panel text-white hover:border-purple-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-zinc-400">Kubernetes Nodes</span>
            <Cpu className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{nodeCount} Nodes / {podCount} Pods</div>
            <p className="text-xs text-zinc-400 mt-1">{deploymentsCount} running deployments</p>
          </CardContent>
        </Card>

        {/* Active Alerts */}
        <Card className="glass-panel text-white hover:border-purple-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-zinc-400">Active Alerts</span>
            <AlertTriangle className={`h-5 w-5 ${activeAlerts > 0 ? 'text-amber-400 animate-pulse' : 'text-zinc-400'}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{firingAlertsCount} Firing</div>
            <p className="text-xs text-zinc-400 mt-1">
              {criticalAlertsCount > 0 ? `${criticalAlertsCount} critical / high priority` : 'No critical alerts active'}
            </p>
          </CardContent>
        </Card>

        {/* Open Incidents */}
        <Card className="glass-panel text-white hover:border-purple-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-zinc-400">Open Incidents</span>
            <Activity className="h-5 w-5 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openIncidents} Active</div>
            <p className="text-xs text-zinc-400 mt-1">
              {criticalIncidentsCount > 0 ? `${criticalIncidentsCount} critical / high priority` : 'No critical incidents'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── METRIC PROGRESS GUARDS ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <Card className="glass-panel text-white p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 font-medium">Cluster CPU Usage</span>
            <span className="font-bold text-purple-400">{avgCpu}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all duration-500" style={{ width: `${avgCpu}%` }} />
          </div>
        </Card>

        <Card className="glass-panel text-white p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 font-medium">Cluster Memory Usage</span>
            <span className="font-bold text-indigo-400">{avgMem}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="bg-indigo-500 h-2 rounded-full transition-all duration-500" style={{ width: `${avgMem}%` }} />
          </div>
        </Card>

        <Card className="glass-panel text-white p-5 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400 font-medium">Cluster Disk Usage</span>
            <span className="font-bold text-emerald-400">{avgDisk}%</span>
          </div>
          <div className="w-full bg-zinc-800 rounded-full h-2">
            <div className="bg-emerald-500 h-2 rounded-full transition-all duration-500" style={{ width: `${avgDisk}%` }} />
          </div>
        </Card>
      </div>

      {/* ── CHARTS SECTIONS ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* CPU & Memory time-series */}
        <Card className="glass-panel text-white lg:col-span-2">
          <CardHeader>
            <span className="text-md font-semibold">Cluster Resource Load</span>
          </CardHeader>
          <CardContent className="h-80">
            {isHistoryChartEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Activity className="h-8 w-8 text-zinc-700 animate-pulse" />
                <span className="text-xs">No live CPU/Memory metrics received from Prometheus</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorMem" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                  <Area type="monotone" dataKey="cpu" name="CPU (%)" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} />
                  <Area type="monotone" dataKey="memory" name="Memory (%)" stroke="#6366f1" fillOpacity={1} fill="url(#colorMem)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Pod status break down */}
        <Card className="glass-panel text-white">
          <CardHeader>
            <span className="text-md font-semibold">Pod Allocation Status</span>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            {podStatusData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Cpu className="h-8 w-8 text-zinc-700 animate-pulse" />
                <span className="text-xs">No active pods deployed in cluster</span>
              </div>
            ) : (
              <>
                <div className="w-full h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={podStatusData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {podStatusData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                
                <div className="grid grid-cols-2 gap-4 w-full mt-4 text-xs text-zinc-400">
                  {podStatusData.map((item, idx) => (
                    <div key={item.name} className="flex items-center space-x-2">
                      <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span>{item.name}: <strong>{item.value}</strong></span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Incident Trend Chart */}
        <Card className="glass-panel text-white lg:col-span-2">
          <CardHeader>
            <span className="text-md font-semibold">Incident Triage Velocity</span>
          </CardHeader>
          <CardContent className="h-80">
            {incidentTrendData.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Activity className="h-8 w-8 text-zinc-700 animate-pulse" />
                <span className="text-xs">No incident statistics recorded</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={incidentTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="day" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                  <Bar dataKey="open" name="Opened" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Network Metrics Load */}
        <Card className="glass-panel text-white">
          <CardHeader>
            <span className="text-md font-semibold">Aggregate Network Traffic</span>
          </CardHeader>
          <CardContent className="h-80">
            {isHistoryChartEmpty ? (
              <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-2">
                <Activity className="h-8 w-8 text-zinc-700 animate-pulse" />
                <span className="text-xs">No live network metrics received from Prometheus</span>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                  <XAxis dataKey="time" stroke="#71717a" />
                  <YAxis stroke="#71717a" />
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                  <Area type="monotone" dataKey="network" name="Bandwidth (MB/s)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
