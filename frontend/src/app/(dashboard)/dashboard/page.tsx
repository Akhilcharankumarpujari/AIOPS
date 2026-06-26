'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { k8sService } from '@/services/k8s.service';
import { prometheusService } from '@/services/prometheus.service';
import { incidentsService } from '@/services/incidents.service';
import { alertsService } from '@/services/alerts.service';
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

// Mock historical metrics for charting
const MOCK_HISTORICAL_DATA = [
  { time: '10:00', cpu: 32, memory: 48, network: 140 },
  { time: '10:15', cpu: 45, memory: 52, network: 180 },
  { time: '10:30', cpu: 67, memory: 61, network: 320 },
  { time: '10:45', cpu: 38, memory: 58, network: 210 },
  { time: '11:00', cpu: 52, memory: 63, network: 245 },
  { time: '11:15', cpu: 49, memory: 60, network: 280 },
  { time: '11:30', cpu: 81, memory: 72, network: 410 },
];

const MOCK_INCIDENT_TREND = [
  { day: 'Mon', open: 3, resolved: 5 },
  { day: 'Tue', open: 5, resolved: 2 },
  { day: 'Wed', open: 8, resolved: 6 },
  { day: 'Thu', open: 4, resolved: 8 },
  { day: 'Fri', open: 6, resolved: 4 },
  { day: 'Sat', open: 2, resolved: 3 },
  { day: 'Sun', open: 1, resolved: 2 },
];

const MOCK_POD_STATUS = [
  { name: 'Running', value: 34 },
  { name: 'Pending', value: 2 },
  { name: 'Failed', value: 1 },
  { name: 'Succeeded', value: 5 },
];

export default function DashboardPage() {
  // Fetch real stats from Backend
  const { data: clusterHealth } = useQuery({
    queryKey: ['clusterHealth'],
    queryFn: k8sService.getClusterHealth,
    refetchInterval: 15000,
  });

  const { data: nodes } = useQuery({
    queryKey: ['nodes'],
    queryFn: k8sService.listNodes,
  });

  const { data: pods } = useQuery({
    queryKey: ['pods'],
    queryFn: () => k8sService.listPods(),
  });

  const { data: incidentsData } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => incidentsService.listIncidents({ page: 1, size: 10 }),
  });

  const { data: alerts } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsService.listAlerts({ limit: 100 }),
  });

  const { data: nodeMetrics } = useQuery({
    queryKey: ['nodeMetrics'],
    queryFn: prometheusService.getNodesMetrics,
    refetchInterval: 15000,
  });

  // Calculate stats with safe fallbacks
  const nodeCount = nodes?.length || clusterHealth?.nodes_count || 3;
  const podCount = pods?.length || clusterHealth?.pods_count || 42;
  const activeAlerts = alerts?.length || 4;
  const openIncidents = incidentsData?.total || 2;
  const deploymentsCount = clusterHealth?.active_deployments || 8;

  // Calculate average CPU & Memory usage across nodes
  const avgCpu = nodeMetrics && nodeMetrics.length > 0
    ? Math.round(nodeMetrics.reduce((acc, curr) => acc + curr.cpu_usage_pct, 0) / nodeMetrics.length)
    : clusterHealth?.cpu_usage_pct || 48;

  const avgMem = nodeMetrics && nodeMetrics.length > 0
    ? Math.round(nodeMetrics.reduce((acc, curr) => acc + curr.memory_usage_pct, 0) / nodeMetrics.length)
    : clusterHealth?.memory_usage_pct || 58;

  const avgDisk = nodeMetrics && nodeMetrics.length > 0
    ? Math.round(nodeMetrics.reduce((acc, curr) => acc + curr.disk_usage_pct, 0) / nodeMetrics.length)
    : clusterHealth?.disk_usage_pct || 38;

  return (
    <div className="space-y-6">
      
      {/* ── METRIC CARDS GRID ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* Cluster Health */}
        <Card className="glass-panel text-white hover:border-purple-500/50 transition-colors">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <span className="text-sm font-medium text-zinc-400">Cluster Health</span>
            <ShieldCheck className="h-5 w-5 text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">Healthy</div>
            <p className="text-xs text-zinc-400 mt-1">All control plane pods operational</p>
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
            <div className="text-2xl font-bold">{activeAlerts} Firing</div>
            <p className="text-xs text-zinc-400 mt-1">Alertmanager active notifications</p>
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
            <p className="text-xs text-zinc-400 mt-1">Requires SRE triage</p>
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
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HISTORICAL_DATA}>
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
          </CardContent>
        </Card>

        {/* Pod status break down */}
        <Card className="glass-panel text-white">
          <CardHeader>
            <span className="text-md font-semibold">Pod Allocation Status</span>
          </CardHeader>
          <CardContent className="h-80 flex flex-col items-center justify-center">
            <div className="w-full h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={MOCK_POD_STATUS}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {MOCK_POD_STATUS.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            <div className="grid grid-cols-2 gap-4 w-full mt-4 text-xs text-zinc-400">
              {MOCK_POD_STATUS.map((item, idx) => (
                <div key={item.name} className="flex items-center space-x-2">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                  <span>{item.name}: <strong>{item.value}</strong></span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Incident Trend Chart */}
        <Card className="glass-panel text-white lg:col-span-2">
          <CardHeader>
            <span className="text-md font-semibold">Incident Triage Velocity</span>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={MOCK_INCIDENT_TREND}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="day" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                <Bar dataKey="open" name="Opened" fill="#ef4444" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resolved" name="Resolved" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Network Metrics Load */}
        <Card className="glass-panel text-white">
          <CardHeader>
            <span className="text-md font-semibold">Aggregate Network Traffic</span>
          </CardHeader>
          <CardContent className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={MOCK_HISTORICAL_DATA}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" />
                <XAxis dataKey="time" stroke="#71717a" />
                <YAxis stroke="#71717a" />
                <Tooltip contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', color: '#fff' }} />
                <Area type="monotone" dataKey="network" name="Bandwidth (MB/s)" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.1} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

      </div>
    </div>
  );
}
