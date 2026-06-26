'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { incidentsService } from '@/services/incidents.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/contexts/toast-context';
import { Brain, ShieldAlert, Cpu, Sparkles, CheckCircle2, ChevronRight, RefreshCw, Layers } from 'lucide-react';

export default function AIRCAPage() {
  const queryClient = useQueryClient();
  const searchParams = useSearchParams();
  const { toast } = useToast();
  
  const queryIncidentId = searchParams.get('incident_id');
  const [selectedAnalysisId, setSelectedAnalysisId] = useState<string | null>(null);

  // Fetch AI history list
  const { data: aiHistory, isLoading: isHistoryLoading } = useQuery({
    queryKey: ['aiHistory'],
    queryFn: () => incidentsService.getAIAnalysisHistory({ page: 1, size: 20 }),
  });

  // Fetch detailed report for the selected analysis
  const { data: selectedAnalysis, isLoading: isAnalysisLoading } = useQuery({
    queryKey: ['aiAnalysis', selectedAnalysisId],
    queryFn: () => incidentsService.getAIAnalysis(selectedAnalysisId!),
    enabled: !!selectedAnalysisId,
  });

  // Fetch specific incident details if linked from incident dashboard
  const { data: activeIncident } = useQuery({
    queryKey: ['activeIncident', queryIncidentId],
    queryFn: () => incidentsService.getIncident(queryIncidentId!),
    enabled: !!queryIncidentId,
  });

  // --- MUTATION HOOKS ---
  const analyzeMutation = useMutation({
    mutationFn: (payload: { type: 'incident' | 'pod' | 'alert'; id: string; namespace?: string }) => {
      if (payload.type === 'incident') {
        return incidentsService.analyzeIncident(payload.id);
      } else if (payload.type === 'alert') {
        return incidentsService.analyzeAlert(payload.id);
      } else {
        return incidentsService.analyzePod(payload.id, payload.namespace);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['aiHistory'] });
      setSelectedAnalysisId(data.id);
      toast('Success', 'AI analysis complete! Report generated.', 'success');
    },
    onError: (err: any) => {
      toast('AI Diagnostic Failure', err.response?.data?.error?.message || 'RCA Engine error', 'error');
    },
  });

  // Auto-trigger if incident_id query param is passed and no analysis history exists for it
  useEffect(() => {
    if (queryIncidentId && aiHistory) {
      const match = aiHistory.items.find((h) => h.incident_id === queryIncidentId);
      if (match) {
        setSelectedAnalysisId(match.id);
      } else {
        // Auto trigger
        analyzeMutation.mutate({ type: 'incident', id: queryIncidentId });
      }
    }
  }, [queryIncidentId, aiHistory]);

  // Handle click on list
  const handleSelectReport = (id: string) => {
    setSelectedAnalysisId(id);
  };

  const currentReport = selectedAnalysis || (aiHistory?.items.length && !selectedAnalysisId ? aiHistory.items[0] : null);

  const getScoreColor = (score: number) => {
    if (score >= 0.8) return 'bg-emerald-500 text-emerald-400';
    if (score >= 0.5) return 'bg-amber-500 text-amber-400';
    return 'bg-red-500 text-red-400';
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* ── LEFT PANEL: REPORT LIST ── */}
      <Card className="glass-panel text-white border-zinc-800 lg:col-span-1 h-[36rem] flex flex-col">
        <CardHeader className="border-b border-zinc-800/60 flex flex-row items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Sparkles className="h-4.5 w-4.5 text-purple-400" />
            Diagnostic Reports
          </span>
          {queryIncidentId && (
            <Button
              variant="outline"
              size="xs"
              className="text-[10px] h-6 border-purple-500/20 text-purple-400"
              onClick={() => analyzeMutation.mutate({ type: 'incident', id: queryIncidentId })}
            >
              Analyze Incident
            </Button>
          )}
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
          {isHistoryLoading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs">Loading report logs...</div>
          ) : !aiHistory || aiHistory.items.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs text-center px-4">
              No diagnostic runs found. Visit Pods or Incidents to trigger AI Root Cause Analysis.
            </div>
          ) : (
            aiHistory.items.map((hist) => {
              const active = currentReport?.id === hist.id;
              return (
                <button
                  key={hist.id}
                  onClick={() => handleSelectReport(hist.id)}
                  className={`w-full text-left p-3 rounded-lg border text-xs transition-all flex justify-between items-center ${
                    active
                      ? 'bg-purple-950/20 border-purple-500 text-zinc-100'
                      : 'bg-zinc-950/30 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="space-y-1 pr-2 truncate">
                    <span className="font-semibold block text-zinc-200 truncate">
                      {hist.root_cause ? hist.root_cause.substring(0, 45) + '...' : 'System RCA Diagnostic'}
                    </span>
                    <div className="flex items-center space-x-2 text-[10px] text-zinc-500">
                      <span className="uppercase">{hist.analysis_type}</span>
                      <span>•</span>
                      <span>{new Date(hist.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <ChevronRight className={`h-4 w-4 shrink-0 ${active ? 'text-purple-400' : 'text-zinc-600'}`} />
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── RIGHT PANEL: DETAILED REPORT VIEW ── */}
      <div className="lg:col-span-2">
        {analyzeMutation.isPending || isAnalysisLoading ? (
          <Card className="glass-panel text-white border-zinc-800 h-[36rem] flex flex-col items-center justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-zinc-800 animate-spin" />
            </div>
            <p className="mt-4 text-xs text-zinc-500 font-medium animate-pulse">Running AI Root Cause Diagnostic model...</p>
          </Card>
        ) : !currentReport ? (
          <Card className="glass-panel text-white border-zinc-800 h-[36rem] flex flex-col items-center justify-center text-center p-6">
            <Brain className="h-12 w-12 text-zinc-600 mb-3" />
            <p className="text-sm font-semibold">Select a Diagnostic Report</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Select an existing audit record from the left sidebar or trigger a new AI RCA analysis from incidents.
            </p>
          </Card>
        ) : (
          <Card className="glass-panel text-white border-zinc-800 min-h-[36rem] flex flex-col">
            <CardHeader className="border-b border-zinc-800/60 flex flex-row items-center justify-between">
              <div>
                <span className="text-md font-bold block text-zinc-200">AI Root Cause Report</span>
                <span className="text-xs text-zinc-500 font-mono">ID: {currentReport.id}</span>
              </div>
              <Badge variant="outline" className="border-purple-500/20 text-purple-400 uppercase text-[10px]">
                {currentReport.provider} / {currentReport.model}
              </Badge>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6 text-xs text-zinc-300">
              
              {/* Incident summary */}
              {currentReport.impact && (
                <div className="space-y-1.5">
                  <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Incident Impact Summary</span>
                  <p className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg text-zinc-300 leading-relaxed">
                    {currentReport.impact}
                  </p>
                </div>
              )}

              {/* Diagnostic split: Root Cause and Confidence */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="md:col-span-2 space-y-1.5">
                  <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">AI Root Cause Analysis</span>
                  <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-lg">
                    <p className="font-semibold text-sm text-zinc-100 mb-2">Isolated Root Cause:</p>
                    <p className="leading-relaxed text-zinc-300 font-medium">
                      {currentReport.root_cause || 'Determining precise logs root cause...'}
                    </p>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Confidence Indicator</span>
                  <div className="p-4 bg-zinc-950/80 border border-zinc-800 rounded-lg flex flex-col justify-center items-center h-[92px]">
                    <span className={`text-2xl font-bold ${getScoreColor(currentReport.confidence_score).split(' ')[1]}`}>
                      {Math.round(currentReport.confidence_score * 100)}%
                    </span>
                    <div className="w-full bg-zinc-800 rounded-full h-1.5 mt-2">
                      <div
                        className={`h-1.5 rounded-full transition-all duration-500 ${getScoreColor(currentReport.confidence_score).split(' ')[0]}`}
                        style={{ width: `${currentReport.confidence_score * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations list */}
              {currentReport.recommendations && currentReport.recommendations.length > 0 && (
                <div className="space-y-2">
                  <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Remediation Recommendations</span>
                  <div className="space-y-2">
                    {currentReport.recommendations.map((rec, index) => {
                      const actionText = typeof rec === 'string' ? rec : rec.action;
                      return (
                        <div key={index} className="flex items-start space-x-3 p-2.5 rounded bg-zinc-950/40 border border-zinc-900">
                          <CheckCircle2 className="h-4.5 w-4.5 text-purple-400 shrink-0 mt-0.5" />
                          <span className="text-zinc-300 font-medium">{actionText}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Timeline Context */}
              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">RCA Diagnostic Timeline</span>
                <div className="relative border-l border-zinc-800 pl-4 ml-2 space-y-3">
                  <div className="relative">
                    <span className="absolute -left-[20px] top-1 h-2 w-2 rounded-full bg-purple-500" />
                    <span className="text-zinc-500 block text-[10px]">T1: Alert Received</span>
                    <p className="text-zinc-400">RCA Hub initiated diagnostics based on Prometheus firing alerts</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[20px] top-1 h-2 w-2 rounded-full bg-indigo-500" />
                    <span className="text-zinc-500 block text-[10px]">T2: Log Traces Pulled</span>
                    <p className="text-zinc-400">Pulled relevant Loki log traces from active crashloop pods</p>
                  </div>
                  <div className="relative">
                    <span className="absolute -left-[20px] top-1 h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-zinc-500 block text-[10px]">T3: Analysis Finalized</span>
                    <p className="text-zinc-400">AI analyzed traces and returned recommendations to dashboard</p>
                  </div>
                </div>
              </div>

            </CardContent>
          </Card>
        )}
      </div>

    </div>
  );
}
