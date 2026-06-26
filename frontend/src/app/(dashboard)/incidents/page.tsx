'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '@/services/incidents.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Drawer } from '@/components/ui/drawer';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { usersService } from '@/services/users.service';
import {
  Search,
  Activity,
  AlertTriangle,
  Clock,
  User,
  ArrowRight,
  Brain,
  MessageSquarePlus,
  RefreshCw,
  Plus
} from 'lucide-react';
import Link from 'next/link';

export default function IncidentsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();

  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);

  // Drawer selected incident
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [incidentDrawerOpen, setIncidentDrawerOpen] = useState(false);
  const [transitionMsg, setTransitionMsg] = useState('');

  // Fetch Incidents List
  const { data: incidentsList, isLoading: listLoading } = useQuery({
    queryKey: ['incidents', severityFilter, statusFilter, search, page],
    queryFn: () =>
      incidentsService.listIncidents({
        status: statusFilter !== 'all' ? [statusFilter] : undefined,
        severity: severityFilter !== 'all' ? [severityFilter] : undefined,
        search: search || undefined,
        page,
        size: 10,
      }),
  });

  // Fetch Incident Details
  const { data: incidentDetail } = useQuery({
    queryKey: ['incidentDetail', selectedIncidentId],
    queryFn: () => incidentsService.getIncident(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // Fetch Incident Timeline
  const { data: timeline } = useQuery({
    queryKey: ['incidentTimeline', selectedIncidentId],
    queryFn: () => incidentsService.getTimeline(selectedIncidentId!),
    enabled: !!selectedIncidentId,
  });

  // Fetch Users (for assignment)
  const { data: users } = useQuery({
    queryKey: ['users'],
    queryFn: usersService.listUsers,
  });

  // --- MUTATION HOOKS ---
  const assignMutation = useMutation({
    mutationFn: ({ id, assigneeId }: { id: string; assigneeId: string | null }) =>
      incidentsService.assignIncident(id, assigneeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentDetail', selectedIncidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast('Success', 'Incident assigned successfully', 'success');
    },
  });

  const transitionMutation = useMutation({
    mutationFn: ({ id, status, message }: { id: string; status: string; message: string }) =>
      incidentsService.transitionStatus(id, status, message),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidentDetail', selectedIncidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidentTimeline', selectedIncidentId] });
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      setTransitionMsg('');
      toast('Success', 'Incident status updated', 'success');
    },
    onError: (err: any) => {
      toast('Failed to Transition', err.response?.data?.error?.message || 'Unauthorized action', 'error');
    },
  });

  const createIncidentMutation = useMutation({
    mutationFn: (payload: { title: string; description: string; severity: string }) =>
      incidentsService.createIncident(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['incidents'] });
      toast('Success', 'Created new incident ticket', 'success');
    },
  });

  // Handle open drawer
  const handleOpenDrawer = (id: string) => {
    setSelectedIncidentId(id);
    setIncidentDrawerOpen(true);
  };

  const severityMap: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
    low: 'outline',
    medium: 'info',
    high: 'warning',
    critical: 'destructive',
  };

  const statusMap: Record<string, 'default' | 'secondary' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
    open: 'destructive',
    acknowledged: 'warning',
    resolved: 'success',
    closed: 'secondary',
  };

  return (
    <div className="space-y-6">
      
      {/* ── CONTROLS ROW ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex-grow flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search incident..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-zinc-950/40 border-zinc-800 text-white"
            />
          </div>
          <Select
            options={[
              { value: 'all', label: 'All Severities' },
              { value: 'low', label: 'Low' },
              { value: 'medium', label: 'Medium' },
              { value: 'high', label: 'High' },
              { value: 'critical', label: 'Critical' },
            ]}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-36 bg-zinc-950/40 border-zinc-800 text-white"
          />
          <Select
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'open', label: 'Open' },
              { value: 'acknowledged', label: 'Acknowledged' },
              { value: 'resolved', label: 'Resolved' },
              { value: 'closed', label: 'Closed' },
            ]}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-36 bg-zinc-950/40 border-zinc-800 text-white"
          />
        </div>
        
        <Button
          className="bg-purple-600 hover:bg-purple-500 text-white flex items-center gap-2 text-xs h-9"
          onClick={() => {
            const title = prompt('Enter Incident Title:');
            const desc = prompt('Enter Description:');
            if (title) {
              createIncidentMutation.mutate({ title, description: desc || '', severity: 'high' });
            }
          }}
        >
          <Plus className="h-4 w-4" />
          New Ticket
        </Button>
      </div>

      {/* ── TICKET TABLE ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader>
          <span className="text-md font-semibold">Active Incident Dashboard</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {listLoading ? (
            <div className="h-40 flex items-center justify-center text-zinc-500">Querying incident dashboard...</div>
          ) : !incidentsList || incidentsList.items.length === 0 ? (
            <div className="h-40 flex items-center justify-center text-zinc-500">No active incidents found.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-400">
                  <th className="py-3 px-4 font-semibold">Num</th>
                  <th className="py-3 px-4 font-semibold">Title</th>
                  <th className="py-3 px-4 font-semibold">Severity</th>
                  <th className="py-3 px-4 font-semibold">Status</th>
                  <th className="py-3 px-4 font-semibold">Assignee</th>
                  <th className="py-3 px-4 font-semibold">Detected At</th>
                  <th className="py-3 px-4 font-semibold text-right">RCA Report</th>
                </tr>
              </thead>
              <tbody>
                {incidentsList.items.map((inc: any) => (
                  <tr key={inc.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                    <td className="py-3 px-4 font-mono font-semibold text-zinc-400">#{inc.incident_number}</td>
                    <td className="py-3 px-4">
                      <button
                        onClick={() => handleOpenDrawer(inc.id)}
                        className="font-semibold text-purple-400 hover:text-purple-300 hover:underline text-left block"
                      >
                        {inc.title}
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={severityMap[inc.severity.toLowerCase()] || 'outline'}>{inc.severity}</Badge>
                    </td>
                    <td className="py-3 px-4">
                      <Badge variant={statusMap[inc.status.toLowerCase()] || 'outline'}>{inc.status}</Badge>
                    </td>
                    <td className="py-3 px-4 text-zinc-300">
                      {inc.assignee?.full_name || 'Unassigned'}
                    </td>
                    <td className="py-3 px-4 text-zinc-400">{new Date(inc.detected_at).toLocaleString()}</td>
                    <td className="py-3 px-4 text-right">
                      <Link href={`/ai?incident_id=${inc.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 text-purple-400 hover:text-purple-300 hover:bg-purple-500/10">
                          <Brain className="h-4.5 w-4.5 mr-1" />
                          RCA
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* ── PAGINATION CONTROLS ── */}
      {incidentsList && incidentsList.pages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-800 text-zinc-400"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Prev
          </Button>
          <span className="text-xs text-zinc-400">
            Page {page} of {incidentsList.pages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="border-zinc-800 text-zinc-400"
            disabled={page === incidentsList.pages}
            onClick={() => setPage(page + 1)}
          >
            Next
          </Button>
        </div>
      )}

      {/* ── INCIDENT TIMELINE DRAWER ── */}
      <Drawer
        isOpen={incidentDrawerOpen}
        onClose={() => setIncidentDrawerOpen(false)}
        title={incidentDetail ? `Incident: #${incidentDetail.incident_number}` : ''}
      >
        {incidentDetail && (
          <div className="space-y-6 text-xs text-zinc-300">
            
            {/* Title / Description */}
            <div className="space-y-1">
              <span className="text-md font-bold text-zinc-100 block">{incidentDetail.title}</span>
              <p className="text-zinc-400">{incidentDetail.description || 'No description provided.'}</p>
            </div>

            {/* Quick Metadata fields */}
            <div className="grid grid-cols-2 gap-4 p-4 rounded bg-zinc-950/50 border border-zinc-800">
              <div>
                <span className="text-zinc-500 block">Severity / Priority</span>
                <span className="font-semibold uppercase text-zinc-300">
                  {incidentDetail.severity} / {incidentDetail.priority}
                </span>
              </div>
              <div>
                <span className="text-zinc-500 block">Current Status</span>
                <Badge variant={statusMap[incidentDetail.status.toLowerCase()] || 'outline'}>
                  {incidentDetail.status}
                </Badge>
              </div>
              <div>
                <span className="text-zinc-500 block">Assignee</span>
                <Select
                  options={[
                    { value: '', label: 'Unassigned' },
                    ...(users || []).map((u) => ({ value: u.id, label: u.full_name })),
                  ]}
                  value={incidentDetail.assignee_id || ''}
                  onChange={(e) =>
                    assignMutation.mutate({
                      id: incidentDetail.id,
                      assigneeId: e.target.value || null,
                    })
                  }
                  className="w-full h-8 text-[11px] bg-zinc-900 border-zinc-800 text-zinc-300 mt-1"
                />
              </div>
              <div>
                <span className="text-zinc-500 block">Detected Time</span>
                <span className="text-zinc-400 font-mono inline-block mt-1.5">
                  {new Date(incidentDetail.detected_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Transition Status Form */}
            <div className="space-y-2 p-4 rounded bg-zinc-950/40 border border-zinc-900">
              <span className="font-bold text-zinc-200 block">Transition Status</span>
              
              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="h-8 flex-1 bg-zinc-800 hover:bg-zinc-700 text-white"
                  disabled={incidentDetail.status === 'acknowledged'}
                  onClick={() =>
                    transitionMutation.mutate({
                      id: incidentDetail.id,
                      status: 'acknowledged',
                      message: transitionMsg || 'Acknowledged incident ticket',
                    })
                  }
                >
                  Acknowledge
                </Button>
                <Button
                  size="sm"
                  className="h-8 flex-1 bg-emerald-700 hover:bg-emerald-600 text-white"
                  disabled={incidentDetail.status === 'resolved'}
                  onClick={() =>
                    transitionMutation.mutate({
                      id: incidentDetail.id,
                      status: 'resolved',
                      message: transitionMsg || 'Mitigated and resolved build issues',
                    })
                  }
                >
                  Resolve
                </Button>
                <Button
                  size="sm"
                  className="h-8 flex-1 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-red-400"
                  disabled={incidentDetail.status === 'closed'}
                  onClick={() =>
                    transitionMutation.mutate({
                      id: incidentDetail.id,
                      status: 'closed',
                      message: transitionMsg || 'Closing ticket logs',
                    })
                  }
                >
                  Close
                </Button>
              </div>

              <div className="space-y-1 mt-2">
                <label className="text-[10px] text-zinc-500">Add log comment/reason:</label>
                <div className="relative">
                  <Input
                    placeholder="Type transition log message..."
                    value={transitionMsg}
                    onChange={(e) => setTransitionMsg(e.target.value)}
                    className="bg-zinc-950/70 border-zinc-800 h-8 pr-10 text-xs"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1 h-6 w-6 text-zinc-500 hover:text-white"
                    onClick={() => {
                      if (!transitionMsg) return;
                      transitionMutation.mutate({
                        id: incidentDetail.id,
                        status: incidentDetail.status,
                        message: transitionMsg,
                      });
                    }}
                  >
                    <MessageSquarePlus className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Incident timeline audit log */}
            <div className="space-y-3">
              <span className="font-semibold text-zinc-400 block flex items-center gap-1.5">
                <Clock className="h-4 w-4 text-zinc-500" />
                Audit Logs & Comments
              </span>
              
              <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-4 max-h-60 overflow-y-auto">
                {(!timeline || timeline.length === 0) ? (
                  <div className="text-zinc-500 text-xs py-2">No audit timeline logs.</div>
                ) : (
                  timeline.map((evt) => (
                    <div key={evt.id} className="relative space-y-1">
                      {/* Timeline dot marker */}
                      <span className="absolute -left-[21px] top-1.5 h-2.5 w-2.5 rounded-full bg-purple-500 ring-4 ring-card" />
                      <div className="flex justify-between items-center text-[10px] text-zinc-500">
                        <span className="font-semibold text-zinc-300">{evt.actor?.full_name || 'System AutoAgent'}</span>
                        <span className="font-mono">{new Date(evt.created_at).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-zinc-400 leading-relaxed">{evt.message}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        )}
      </Drawer>

    </div>
  );
}
