'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { alertsService } from '@/services/alerts.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import { AlertTriangle, ShieldCheck, Clock, Search, Sliders } from 'lucide-react';

export default function AlertsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');

  const { data: alerts, isLoading, refetch } = useQuery({
    queryKey: ['alerts'],
    queryFn: () => alertsService.listAlerts({ limit: 100 }),
    refetchInterval: 15000,
  });

  const { data: history } = useQuery({
    queryKey: ['alertsHistory'],
    queryFn: () => alertsService.listAlertsHistory(50),
  });

  // Simulated actions
  const handleSilenceAlert = (alertName: string) => {
    toast('Alert Silenced', `Simulated silencing rule for alert "${alertName}" created in Alertmanager.`, 'success');
  };

  const handleResolveAlert = (alertName: string) => {
    toast('Alert Resolved', `Simulated resolution command sent for "${alertName}".`, 'success');
  };

  const filteredAlerts = (alerts || []).filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) &&
      (severityFilter === 'all' || a.severity.toLowerCase() === severityFilter.toLowerCase())
  );

  const getSeverityBadge = (sev: string) => {
    const variants: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'outline' | 'info'> = {
      low: 'outline',
      medium: 'info',
      high: 'warning',
      critical: 'destructive',
    };
    return <Badge variant={variants[sev.toLowerCase()] || 'info'}>{sev}</Badge>;
  };

  return (
    <div className="space-y-6">
      
      {/* ── CONTROLS ROW ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-card p-4 rounded-lg border border-border">
        <div className="flex-grow flex items-center space-x-3 w-full sm:w-auto">
          <div className="relative flex-grow sm:max-w-xs">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-zinc-500" />
            <Input
              placeholder="Search alert name..."
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
            className="w-44 bg-zinc-950/40 border-zinc-800 text-white"
          />
        </div>
        
        <Button
          variant="outline"
          size="sm"
          className="text-zinc-400 hover:text-white border-zinc-800 flex items-center gap-2"
          onClick={() => {
            refetch();
            toast('Info', 'Refreshed Alertmanager status', 'info');
          }}
        >
          <RefreshCw className="h-4 w-4" />
          Sync Status
        </Button>
      </div>

      {/* ── ACTIVE FIRING ALERTS ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader className="flex flex-row items-center justify-between">
          <span className="text-md font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4.5 w-4.5 text-red-400" />
            Firing Alerts (Prometheus Alertmanager)
          </span>
          <Badge variant="destructive">{filteredAlerts.length} Firing</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="h-32 flex items-center justify-center text-zinc-500 text-xs">Querying alert configurations...</div>
          ) : filteredAlerts.length === 0 ? (
            <div className="h-32 flex flex-col items-center justify-center text-zinc-500 text-xs space-y-2">
              <ShieldCheck className="h-8 w-8 text-emerald-500 mb-1" />
              <span>All rules healthy. No alerts firing.</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredAlerts.map((alert) => (
                <div key={alert.id} className="p-4 rounded-lg bg-zinc-950/50 border border-zinc-800 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between items-start">
                      <span className="font-semibold text-sm text-zinc-200">{alert.name}</span>
                      {getSeverityBadge(alert.severity)}
                    </div>
                    <p className="text-zinc-400 text-xs mt-1">
                      {alert.annotations?.description || alert.annotations?.summary || 'No annotation summary provided.'}
                    </p>
                  </div>
                  
                  {/* Labels display */}
                  <div className="flex flex-wrap gap-1.5 py-1">
                    {Object.entries(alert.labels || {}).map(([k, v]) => (
                      <span key={k} className="text-[10px] bg-zinc-900 border border-zinc-800 rounded px-1.5 py-0.5 text-zinc-500">
                        {k}: <strong className="text-zinc-400">{v}</strong>
                      </span>
                    ))}
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-900/60">
                    <Button
                      variant="outline"
                      size="xs"
                      className="h-6 text-[10px] border-zinc-800 text-zinc-400 hover:text-white"
                      onClick={() => handleSilenceAlert(alert.name)}
                    >
                      Silence
                    </Button>
                    <Button
                      size="xs"
                      className="h-6 text-[10px] bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-600 hover:text-white"
                      onClick={() => handleResolveAlert(alert.name)}
                    >
                      Resolve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── RESOLVED ALERTS HISTORY ── */}
      <Card className="glass-panel text-white border-zinc-800">
        <CardHeader>
          <CardTitle className="text-md flex items-center gap-2">
            <Clock className="h-4.5 w-4.5 text-zinc-400" />
            Alert History Audit Logs
          </CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {(!history || history.length === 0) ? (
            <div className="h-28 flex items-center justify-center text-zinc-500 text-xs">No historical alerts recorded.</div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500">
                  <th className="py-2 px-3 font-semibold">Alert Name</th>
                  <th className="py-2 px-3 font-semibold">Severity</th>
                  <th className="py-2 px-3 font-semibold">Status</th>
                  <th className="py-2 px-3 font-semibold">Fired At</th>
                  <th className="py-2 px-3 font-semibold">Resolved At</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                    <td className="py-2 px-3 font-semibold text-zinc-300">{h.name}</td>
                    <td className="py-2 px-3">{getSeverityBadge(h.severity)}</td>
                    <td className="py-2 px-3">
                      <Badge variant="success">Resolved</Badge>
                    </td>
                    <td className="py-2 px-3 text-zinc-500">{new Date(h.starts_at).toLocaleString()}</td>
                    <td className="py-2 px-3 text-zinc-400">
                      {h.ends_at ? new Date(h.ends_at).toLocaleString() : 'N/A'}
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

// Sub imports helper since Input and Select are in the same folder but separate components
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { RefreshCw } from 'lucide-react';
