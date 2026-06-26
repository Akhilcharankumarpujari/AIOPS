'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { k8sService } from '@/services/k8s.service';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Drawer } from '@/components/ui/drawer';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import {
  Search,
  RefreshCw,
  Trash2,
  Sliders,
  RotateCcw
} from 'lucide-react';

export default function KubernetesPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hasPermission } = useAuth();
  
  const [activeTab, setActiveTab] = useState('pods');
  const [search, setSearch] = useState('');
  const [namespaceFilter, setNamespaceFilter] = useState('all');

  // Drawer states
  const [selectedPod, setSelectedPod] = useState<{ name: string; namespace: string } | null>(null);
  const [podDrawerOpen, setPodDrawerOpen] = useState(false);
  const [podLogsTabActive, setPodLogsTabActive] = useState(false);

  // Dialog States
  const [scaleDeploymentName, setScaleDeploymentName] = useState<string | null>(null);
  const [scaleDeploymentNamespace, setScaleDeploymentNamespace] = useState<string>('');
  const [scaleReplicas, setScaleReplicas] = useState<number>(1);
  const [scaleDialogOpen, setScaleDialogOpen] = useState(false);

  // --- QUERY HOOKS ---
  const { data: namespaces } = useQuery({
    queryKey: ['namespaces'],
    queryFn: k8sService.listNamespaces,
  });

  const { data: pods, isLoading: podsLoading } = useQuery({
    queryKey: ['pods', namespaceFilter],
    queryFn: () => k8sService.listPods(namespaceFilter),
  });

  const { data: deployments, isLoading: deploysLoading } = useQuery({
    queryKey: ['deployments', namespaceFilter],
    queryFn: () => k8sService.listDeployments(namespaceFilter),
  });

  const { data: services, isLoading: servicesLoading } = useQuery({
    queryKey: ['services', namespaceFilter],
    queryFn: () => k8sService.listServices(namespaceFilter),
  });

  const { data: nodes, isLoading: nodesLoading } = useQuery({
    queryKey: ['nodes'],
    queryFn: k8sService.listNodes,
  });

  // Drawer Pod Data
  const { data: podDetails } = useQuery({
    queryKey: ['podDetails', selectedPod],
    queryFn: () => k8sService.getPodDetails(selectedPod!.name, selectedPod!.namespace),
    enabled: !!selectedPod,
  });

  const { data: podLogs } = useQuery({
    queryKey: ['podLogs', selectedPod, podLogsTabActive],
    queryFn: () => k8sService.getPodLogs(selectedPod!.name, selectedPod!.namespace, undefined, 150),
    enabled: !!selectedPod && podLogsTabActive,
  });

  const { data: podEvents } = useQuery({
    queryKey: ['podEvents', selectedPod],
    queryFn: () => k8sService.getPodEvents(selectedPod!.name, selectedPod!.namespace),
    enabled: !!selectedPod && !podLogsTabActive,
  });

  // --- MUTATION HOOKS ---
  const deletePodMutation = useMutation({
    mutationFn: ({ name, namespace }: { name: string; namespace: string }) =>
      k8sService.deletePod(name, namespace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pods'] });
      toast('Success', 'Pod deleted successfully', 'success');
    },
    onError: (err) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast('Action Failed', error.response?.data?.error?.message || 'Failed to delete pod', 'error');
    },
  });

  const scaleDeploymentMutation = useMutation({
    mutationFn: ({ name, namespace, replicas }: { name: string; namespace: string; replicas: number }) =>
      k8sService.scaleDeployment(name, namespace, replicas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      toast('Success', 'Deployment scaling triggered', 'success');
      setScaleDialogOpen(false);
    },
    onError: (err) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast('Action Failed', error.response?.data?.error?.message || 'Failed to scale deployment', 'error');
    },
  });

  const restartDeploymentMutation = useMutation({
    mutationFn: ({ name, namespace }: { name: string; namespace: string }) =>
      k8sService.restartDeployment(name, namespace),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deployments'] });
      toast('Success', 'Deployment rollout restart triggered', 'success');
    },
    onError: (err) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast('Action Failed', error.response?.data?.error?.message || 'Failed to restart deployment', 'error');
    },
  });

  // --- HANDLERS ---
  const handleOpenPodDrawer = (name: string, namespace: string) => {
    setSelectedPod({ name, namespace });
    setPodLogsTabActive(false);
    setPodDrawerOpen(true);
  };

  const handleOpenScaleDialog = (name: string, namespace: string, currentReplicas: number) => {
    setScaleDeploymentName(name);
    setScaleDeploymentNamespace(namespace);
    setScaleReplicas(currentReplicas);
    setScaleDialogOpen(true);
  };

  // Filter lists based on search string
  const filteredPods = (pods || []).filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) &&
      (namespaceFilter === 'all' || p.namespace === namespaceFilter)
  );

  const filteredDeployments = (deployments || []).filter(
    (d) =>
      d.name.toLowerCase().includes(search.toLowerCase()) &&
      (namespaceFilter === 'all' || d.namespace === namespaceFilter)
  );

  const filteredServices = (services || []).filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) &&
      (namespaceFilter === 'all' || s.namespace === namespaceFilter)
  );

  const namespaceOptions = [
    { value: 'all', label: 'All Namespaces' },
    ...(namespaces || []).map((ns) => ({ value: ns.name, label: ns.name })),
  ];

  const canWrite = hasPermission('kubernetes:write');

  return (
    <div className="space-y-6">
      
      {/* ── CONTROLS ROW ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex-grow flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search resource..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950/40 border-zinc-800 text-white placeholder-zinc-500 focus:border-purple-500"
            />
          </div>
          <Select
            options={namespaceOptions}
            value={namespaceFilter}
            onChange={(e) => setNamespaceFilter(e.target.value)}
            className="w-44 bg-zinc-950/40 border-zinc-800 text-white"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="text-zinc-400 hover:text-white border-zinc-800 flex items-center gap-2"
          onClick={() => {
            queryClient.invalidateQueries({ queryKey: [activeTab] });
            toast('Info', 'Refreshing Kubernetes resources', 'info');
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      {/* ── TABS PANEL ── */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-zinc-950/60 border border-zinc-800">
          <TabsTrigger value="pods">Pods</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="nodes">Nodes</TabsTrigger>
          <TabsTrigger value="namespaces">Namespaces</TabsTrigger>
        </TabsList>

        {/* ── PODS TAB CONTENT ── */}
        <TabsContent value="pods">
          <Card className="glass-panel text-white border-zinc-800">
            <CardHeader>
              <CardTitle className="text-md">Pod Instances</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {podsLoading ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">Loading pods...</div>
              ) : filteredPods.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">No pods found</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Namespace</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Restarts</th>
                      <th className="py-3 px-4 font-semibold">Node</th>
                      <th className="py-3 px-4 font-semibold">CPU/Mem</th>
                      {canWrite && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredPods.map((p) => {
                      const statusMap: Record<string, 'success' | 'warning' | 'destructive' | 'info'> = {
                        Running: 'success',
                        Pending: 'warning',
                        Failed: 'destructive',
                        Succeeded: 'info',
                      };
                      return (
                        <tr key={p.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                          <td className="py-3 px-4 font-semibold">
                            <button
                              onClick={() => handleOpenPodDrawer(p.name, p.namespace)}
                              className="text-purple-400 hover:text-purple-300 hover:underline"
                            >
                              {p.name}
                            </button>
                          </td>
                          <td className="py-3 px-4 text-zinc-400">{p.namespace}</td>
                          <td className="py-3 px-4">
                            <Badge variant={statusMap[p.status] || 'outline'}>{p.status}</Badge>
                          </td>
                          <td className="py-3 px-4">{p.restarts || 0}</td>
                          <td className="py-3 px-4 text-zinc-400">{p.node_name || 'N/A'}</td>
                          <td className="py-3 px-4 text-zinc-400">
                            {p.cpu_usage ? `${Math.round(p.cpu_usage * 1000)}m` : '0m'} /{' '}
                            {p.memory_usage ? `${Math.round(p.memory_usage / (1024 * 1024))}Mi` : '0Mi'}
                          </td>
                          {canWrite && (
                            <td className="py-3 px-4 text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 border-zinc-800 text-zinc-400 hover:text-white"
                                onClick={() => deletePodMutation.mutate({ name: p.name, namespace: p.namespace })}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 px-2 border-zinc-800 text-purple-400 hover:bg-purple-500/10"
                                onClick={() => deletePodMutation.mutate({ name: p.name, namespace: p.namespace })}
                                title="Restart Pod (K8s recreate)"
                              >
                                <RotateCcw className="h-3.5 w-3.5" />
                              </Button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── DEPLOYMENTS TAB CONTENT ── */}
        <TabsContent value="deployments">
          <Card className="glass-panel text-white border-zinc-800">
            <CardHeader>
              <CardTitle className="text-md">Kubernetes Deployments</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {deploysLoading ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">Loading deployments...</div>
              ) : filteredDeployments.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">No deployments found</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Namespace</th>
                      <th className="py-3 px-4 font-semibold">Ready Replicas</th>
                      <th className="py-3 px-4 font-semibold">Replicas (Target)</th>
                      <th className="py-3 px-4 font-semibold">Created Time</th>
                      {canWrite && <th className="py-3 px-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredDeployments.map((d) => (
                      <tr key={d.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-semibold text-zinc-200">{d.name}</td>
                        <td className="py-3 px-4 text-zinc-400">{d.namespace}</td>
                        <td className="py-3 px-4">
                          <Badge variant={d.ready_replicas === d.replicas ? 'success' : 'warning'}>
                            {d.ready_replicas} / {d.replicas}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-300">{d.replicas}</td>
                        <td className="py-3 px-4 text-zinc-400">{new Date(d.created_at).toLocaleString()}</td>
                        {canWrite && (
                          <td className="py-3 px-4 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 border-zinc-800 text-zinc-400 hover:text-white"
                              onClick={() => handleOpenScaleDialog(d.name, d.namespace, d.replicas)}
                            >
                              <Sliders className="h-3.5 w-3.5 mr-1" />
                              Scale
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 border-zinc-800 text-purple-400 hover:bg-purple-500/10"
                              onClick={() => restartDeploymentMutation.mutate({ name: d.name, namespace: d.namespace })}
                            >
                              <RotateCcw className="h-3.5 w-3.5 mr-1" />
                              Restart
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── SERVICES TAB CONTENT ── */}
        <TabsContent value="services">
          <Card className="glass-panel text-white border-zinc-800">
            <CardHeader>
              <CardTitle className="text-md">Services Routing</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {servicesLoading ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">Loading services...</div>
              ) : filteredServices.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">No services found</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Namespace</th>
                      <th className="py-3 px-4 font-semibold">Type</th>
                      <th className="py-3 px-4 font-semibold">Cluster IP</th>
                      <th className="py-3 px-4 font-semibold">Ports</th>
                      <th className="py-3 px-4 font-semibold">Created Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredServices.map((s) => (
                      <tr key={s.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-semibold text-zinc-200">{s.name}</td>
                        <td className="py-3 px-4 text-zinc-400">{s.namespace}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{s.type}</Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-300 font-mono">{s.cluster_ip}</td>
                        <td className="py-3 px-4 text-zinc-400 font-mono">
                          {s.ports.map((p) => `${p.port}:${p.target_port}/${p.protocol}`).join(', ')}
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{new Date(s.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NODES TAB CONTENT ── */}
        <TabsContent value="nodes">
          <Card className="glass-panel text-white border-zinc-800">
            <CardHeader>
              <CardTitle className="text-md">Cluster Nodes</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {nodesLoading ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">Loading nodes...</div>
              ) : !nodes || nodes.length === 0 ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">No nodes found</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">OS Image</th>
                      <th className="py-3 px-4 font-semibold">Kubelet</th>
                      <th className="py-3 px-4 font-semibold">CPU capacity/alloc</th>
                      <th className="py-3 px-4 font-semibold">Memory capacity/alloc</th>
                    </tr>
                  </thead>
                  <tbody>
                    {nodes.map((n) => (
                      <tr key={n.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-semibold text-zinc-200">{n.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={n.status === 'Ready' ? 'success' : 'destructive'}>{n.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{n.os_image}</td>
                        <td className="py-3 px-4 text-zinc-400">{n.kubelet_version}</td>
                        <td className="py-3 px-4 text-zinc-300">
                          {n.cpu_capacity} / {n.cpu_allocatable}
                        </td>
                        <td className="py-3 px-4 text-zinc-300">
                          {n.memory_capacity} / {n.memory_allocatable}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── NAMESPACES TAB CONTENT ── */}
        <TabsContent value="namespaces">
          <Card className="glass-panel text-white border-zinc-800">
            <CardHeader>
              <CardTitle className="text-md">Namespaces</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {namespaces === undefined ? (
                <div className="h-40 flex items-center justify-center text-zinc-500">Loading namespaces...</div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Name</th>
                      <th className="py-3 px-4 font-semibold">Status</th>
                      <th className="py-3 px-4 font-semibold">Created Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {namespaces.map((ns) => (
                      <tr key={ns.name} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                        <td className="py-3 px-4 font-semibold text-zinc-200">{ns.name}</td>
                        <td className="py-3 px-4">
                          <Badge variant={ns.status === 'Active' ? 'success' : 'warning'}>{ns.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-zinc-400">{new Date(ns.created_at).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── POD DETAIL DRAWER ── */}
      <Drawer
        isOpen={podDrawerOpen}
        onClose={() => setPodDrawerOpen(false)}
        title={selectedPod ? `Pod: ${selectedPod.name}` : ''}
      >
        {selectedPod && podDetails && (
          <div className="space-y-6 text-sm">
            {/* Meta statistics */}
            <div className="grid grid-cols-2 gap-3 p-4 rounded bg-zinc-950/50 border border-zinc-800 text-xs">
              <div>
                <span className="text-zinc-500 block">Namespace</span>
                <span className="font-semibold text-zinc-200">{podDetails.namespace}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">IP</span>
                <span className="font-semibold text-zinc-200">{podDetails.ip || 'N/A'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Node</span>
                <span className="font-semibold text-zinc-200 truncate block">{podDetails.node_name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-zinc-500 block">Restarts</span>
                <span className="font-semibold text-zinc-200">{podDetails.restarts || 0}</span>
              </div>
            </div>

            {/* Logs vs Events Switcher */}
            <div className="flex border-b border-zinc-800">
              <button
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  !podLogsTabActive
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
                onClick={() => setPodLogsTabActive(false)}
              >
                Events
              </button>
              <button
                className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
                  podLogsTabActive
                    ? 'border-purple-500 text-purple-400'
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
                onClick={() => setPodLogsTabActive(true)}
              >
                Console Logs
              </button>
            </div>

            {/* Tab contents */}
            {podLogsTabActive ? (
              <div className="space-y-2">
                <span className="text-xs text-zinc-500 font-medium">Last 150 log lines:</span>
                <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap">
                  {podLogs || 'No logs found or empty.'}
                </pre>
              </div>
            ) : (
              <div className="space-y-3">
                <span className="text-xs text-zinc-500 font-medium">Recent events:</span>
                {(!podEvents || podEvents.length === 0) ? (
                  <div className="text-zinc-500 text-xs py-4 text-center">No recent events found.</div>
                ) : (
                  <div className="space-y-2 overflow-y-auto max-h-80 pr-1">
                    {podEvents.map((evt, idx) => (
                      <div key={idx} className="p-2.5 bg-zinc-950/40 border border-zinc-900 rounded text-xs space-y-1">
                        <div className="flex justify-between font-semibold">
                          <span className={evt.type === 'Warning' ? 'text-amber-400' : 'text-zinc-300'}>{evt.reason}</span>
                          <span className="text-zinc-500">{evt.count}x</span>
                        </div>
                        <p className="text-zinc-400 text-[11px] leading-relaxed">{evt.message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </Drawer>

      {/* ── SCALE DEPLOYMENT DIALOG ── */}
      <Dialog
        isOpen={scaleDialogOpen}
        onClose={() => setScaleDialogOpen(false)}
        title="Scale Deployment"
        footer={
          <>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setScaleDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-500 text-white"
              onClick={() =>
                scaleDeploymentMutation.mutate({
                  name: scaleDeploymentName!,
                  namespace: scaleDeploymentNamespace,
                  replicas: scaleReplicas,
                })
              }
            >
              Apply Replicas
            </Button>
          </>
        }
      >
        {scaleDeploymentName && (
          <div className="space-y-4">
            <p className="text-zinc-300">
              Input the target replicas for deployment <strong>{scaleDeploymentName}</strong>:
            </p>
            <div className="flex items-center space-x-3">
              <span className="text-xs text-zinc-500">Replicas:</span>
              <Input
                type="number"
                min="0"
                max="20"
                value={scaleReplicas}
                onChange={(e) => setScaleReplicas(parseInt(e.target.value) || 0)}
                className="w-24 bg-zinc-950/40 border-zinc-800 text-white text-center"
              />
            </div>
          </div>
        )}
      </Dialog>

    </div>
  );
}
