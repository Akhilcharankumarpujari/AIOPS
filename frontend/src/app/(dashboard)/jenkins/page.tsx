'use client';

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { jenkinsService } from '@/services/jenkins.service';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog } from '@/components/ui/dialog';
import { Drawer } from '@/components/ui/drawer';
import { Input } from '@/components/ui/input';
import { useToast } from '@/contexts/toast-context';
import { useAuth } from '@/contexts/auth-context';
import { Play, Brain, RefreshCw, CheckCircle2 } from 'lucide-react';
import { JenkinsBuild, AIAnalysis } from '@/types';

export default function JenkinsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { hasPermission } = useAuth();

  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  
  // Dialogs & Drawers
  const [triggerJobName, setTriggerJobName] = useState<string | null>(null);
  const [triggerParams, setTriggerParams] = useState<string>('');
  const [triggerDialogOpen, setTriggerDialogOpen] = useState(false);

  const [consoleLogBuild, setConsoleLogBuild] = useState<{ name: string; num: number } | null>(null);
  const [consoleLogOpen, setConsoleLogOpen] = useState(false);

  const [aiReportDetails, setAiReportDetails] = useState<AIAnalysis | null>(null);
  const [aiReportOpen, setAiReportOpen] = useState(false);

  // --- QUERY HOOKS ---
  const { data: jobsList, isLoading: jobsLoading, error: jobsError } = useQuery({
    queryKey: ['jenkinsJobs'],
    queryFn: jenkinsService.listJobs,
    retry: false,
  });

  const { data: jobDetails } = useQuery({
    queryKey: ['jenkinsJobDetails', selectedJob],
    queryFn: () => jenkinsService.getJobDetails(selectedJob!),
    enabled: !!selectedJob,
  });

  const { data: consoleLogs, isLoading: isLogsLoading } = useQuery({
    queryKey: ['jenkinsLogs', consoleLogBuild],
    queryFn: () => jenkinsService.getBuildLogs(consoleLogBuild!.name, consoleLogBuild!.num),
    enabled: !!consoleLogBuild,
  });

  // --- MUTATION HOOKS ---
  const triggerBuildMutation = useMutation({
    mutationFn: ({ name, params }: { name: string; params?: Record<string, string> }) =>
      jenkinsService.triggerBuild(name, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenkinsJobs'] });
      if (selectedJob) queryClient.invalidateQueries({ queryKey: ['jenkinsJobDetails', selectedJob] });
      setTriggerDialogOpen(false);
      setTriggerParams('');
      toast('Success', 'Jenkins build triggered successfully', 'success');
    },
    onError: (err) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast('Action Failed', error.response?.data?.error?.message || 'Failed to trigger build', 'error');
    },
  });

  const cancelBuildMutation = useMutation({
    mutationFn: ({ name, num }: { name: string; num: number }) =>
      jenkinsService.cancelBuild(name, num),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['jenkinsJobs'] });
      if (selectedJob) queryClient.invalidateQueries({ queryKey: ['jenkinsJobDetails', selectedJob] });
      toast('Success', 'Build cancelled successfully', 'success');
    },
  });

  const analyzeBuildMutation = useMutation({
    mutationFn: ({ name, num }: { name: string; num: number }) =>
      jenkinsService.analyzeBuild(name, num),
    onSuccess: (data) => {
      setAiReportDetails(data);
      setAiReportOpen(true);
      toast('Success', 'AI build failure analysis complete', 'success');
    },
    onError: (err) => {
      const error = err as { response?: { data?: { error?: { message?: string } } } };
      toast('RCA Diagnostic Failure', error.response?.data?.error?.message || 'Failed to analyze logs', 'error');
    },
  });

  // --- HANDLERS ---
  const handleOpenTriggerDialog = (name: string) => {
    setTriggerJobName(name);
    setTriggerDialogOpen(true);
  };

  const handleOpenLogsDrawer = (name: string, num: number) => {
    setConsoleLogBuild({ name, num });
    setConsoleLogOpen(true);
  };

  const parseTriggerParams = (): Record<string, string> => {
    const res: Record<string, string> = {};
    if (!triggerParams) return res;
    
    triggerParams.split(',').forEach((p) => {
      const parts = p.split('=');
      if (parts.length === 2) {
        res[parts[0].trim()] = parts[1].trim();
      }
    });
    return res;
  };

  const getResultBadge = (res: string | null) => {
    if (!res) return <Badge variant="warning">Building</Badge>;
    const colors: Record<string, 'success' | 'destructive' | 'outline' | 'warning' | 'info'> = {
      SUCCESS: 'success',
      FAILURE: 'destructive',
      ABORTED: 'outline',
      UNSTABLE: 'warning',
    };
    return <Badge variant={colors[res] || 'info'}>{res}</Badge>;
  };

  const getJobColor = (color: string) => {
    if (color === 'blue') return 'bg-emerald-500';
    if (color === 'red') return 'bg-red-500';
    if (color.includes('_anime')) return 'bg-amber-500 animate-pulse';
    return 'bg-zinc-500';
  };

  const canWrite = hasPermission('jenkins:write');
  const canAnalyze = hasPermission('jenkins:analyze');

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      
      {/* ── LEFT PANEL: JOBS LIST ── */}
      <Card className="glass-panel text-white border-zinc-800 lg:col-span-1 h-[36rem] flex flex-col">
        <CardHeader className="border-b border-zinc-800/60 flex flex-row items-center justify-between">
          <span className="text-sm font-semibold flex items-center gap-2">
            <Play className="h-4.5 w-4.5 text-purple-400" />
            CI/CD Pipelines
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-7 px-2 border-zinc-800 text-zinc-400 hover:text-white"
            onClick={() => queryClient.invalidateQueries({ queryKey: ['jenkinsJobs'] })}
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-2">
          {jobsLoading ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs">Querying Jenkins jobs...</div>
          ) : jobsError ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-4 space-y-3">
              <span className="text-zinc-500 text-xs">Jenkins service is offline or unconfigured</span>
              <Badge variant="destructive" className="uppercase text-[9px]">Offline Mode (Fallback active)</Badge>
            </div>
          ) : !jobsList || jobsList.jobs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500 text-xs">No jobs configured in Jenkins</div>
          ) : (
            jobsList.jobs.map((job) => {
              const active = selectedJob === job.name;
              return (
                <button
                  key={job.name}
                  onClick={() => setSelectedJob(job.name)}
                  className={`w-full text-left p-3.5 rounded-lg border text-xs transition-all flex items-center justify-between ${
                    active
                      ? 'bg-purple-950/20 border-purple-500 text-zinc-100'
                      : 'bg-zinc-950/30 border-zinc-800 hover:border-zinc-700 text-zinc-400'
                  }`}
                >
                  <div className="flex items-center space-x-3.5 truncate pr-2">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${getJobColor(job.color)}`} />
                    <span className="font-semibold truncate block text-zinc-200">{job.name}</span>
                  </div>
                  {canWrite && (
                    <Button
                      size="xs"
                      className="h-6 text-[10px] bg-purple-600 hover:bg-purple-500 text-white shrink-0"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenTriggerDialog(job.name);
                      }}
                    >
                      Build
                    </Button>
                  )}
                </button>
              );
            })
          )}
        </CardContent>
      </Card>

      {/* ── RIGHT PANEL: JOB DETAILS & RECENT BUILDS ── */}
      <div className="lg:col-span-2">
        {!selectedJob ? (
          <Card className="glass-panel text-white border-zinc-800 h-[36rem] flex flex-col items-center justify-center text-center p-6">
            <Play className="h-12 w-12 text-zinc-600 mb-3 animate-pulse" />
            <p className="text-sm font-semibold">Select a Jenkins Job</p>
            <p className="text-xs text-zinc-500 max-w-sm mt-1">
              Select a job from the pipeline panel to browse build history, triggers, console logs, and run AI Diagnostics.
            </p>
          </Card>
        ) : !jobDetails ? (
          <Card className="glass-panel text-white border-zinc-800 h-[36rem] flex flex-col items-center justify-center">
            <div className="relative w-12 h-12">
              <div className="absolute inset-0 rounded-full border-4 border-t-purple-500 border-zinc-800 animate-spin" />
            </div>
            <p className="mt-4 text-xs text-zinc-500">Querying build detail records...</p>
          </Card>
        ) : (
          <Card className="glass-panel text-white border-zinc-800 min-h-[36rem] flex flex-col">
            <CardHeader className="border-b border-zinc-800/60 flex flex-row items-center justify-between">
              <div>
                <span className="text-md font-bold text-zinc-200 block">{jobDetails.name}</span>
                <span className="text-xs text-zinc-500 truncate block max-w-md">{jobDetails.url}</span>
              </div>
              <div className="flex gap-2">
                {canWrite && (
                  <Button
                    className="bg-purple-600 hover:bg-purple-500 text-white text-xs h-8"
                    onClick={() => handleOpenTriggerDialog(jobDetails.name)}
                  >
                    Build Now
                  </Button>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="p-6 space-y-6 text-xs text-zinc-300">
              
              {/* Health Reports */}
              {jobDetails.health_report && jobDetails.health_report.length > 0 && (
                <div className="space-y-2">
                  <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Health Reports</span>
                  <div className="p-3 bg-zinc-950/60 border border-zinc-900 rounded-lg flex items-center space-x-3 text-zinc-300">
                    <span className="text-2xl">{jobDetails.health_report[0]?.score >= 80 ? '☀️' : '🌦️'}</span>
                    <div>
                      <p className="font-semibold text-zinc-200">Pipeline Score: {jobDetails.health_report[0]?.score || 0}%</p>
                      <p className="text-zinc-500 mt-0.5">{jobDetails.health_report[0]?.description}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Builds Table */}
              <div className="space-y-3">
                <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Recent Builds History</span>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-zinc-800 text-zinc-500">
                        <th className="py-2.5 px-3 font-semibold">Build</th>
                        <th className="py-2.5 px-3 font-semibold">Result</th>
                        <th className="py-2.5 px-3 font-semibold">Duration</th>
                        <th className="py-2.5 px-3 font-semibold">Date</th>
                        <th className="py-2.5 px-3 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobDetails.builds.map((build: JenkinsBuild) => (
                        <tr key={build.number} className="border-b border-zinc-900/60 hover:bg-zinc-800/10">
                          <td className="py-2 px-3 font-semibold text-zinc-300">#{build.number}</td>
                          <td className="py-2 px-3">{getResultBadge(build.result)}</td>
                          <td className="py-2 px-3 text-zinc-400">
                            {build.duration ? `${Math.round(build.duration / 1000)}s` : 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-zinc-500">
                            {build.timestamp ? new Date(build.timestamp).toLocaleString() : 'N/A'}
                          </td>
                          <td className="py-2 px-3 text-right space-x-2">
                            <Button
                              variant="outline"
                              size="xs"
                              className="h-6 text-[10px] border-zinc-800 text-zinc-400 hover:text-white"
                              onClick={() => handleOpenLogsDrawer(jobDetails.name, build.number)}
                            >
                              Logs
                            </Button>
                            {build.result === 'FAILURE' && canAnalyze && (
                              <Button
                                size="xs"
                                className="h-6 text-[10px] bg-purple-950/40 border border-purple-500/30 text-purple-400 hover:bg-purple-600 hover:text-white"
                                onClick={() =>
                                  analyzeBuildMutation.mutate({
                                    name: jobDetails.name,
                                    num: build.number,
                                  })
                                }
                              >
                                <Brain className="h-3.5 w-3.5 mr-1" />
                                AI RCA
                              </Button>
                            )}
                            {build.building && canWrite && (
                              <Button
                                size="xs"
                                className="h-6 text-[10px] bg-red-950/40 border border-red-500/30 text-red-400"
                                onClick={() =>
                                  cancelBuildMutation.mutate({
                                    name: jobDetails.name,
                                    num: build.number,
                                  })
                                }
                              >
                                Cancel
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

            </CardContent>
          </Card>
        )}
      </div>

      {/* ── TRIGGER PIPELINE DIALOG ── */}
      <Dialog
        isOpen={triggerDialogOpen}
        onClose={() => setTriggerDialogOpen(false)}
        title="Trigger Jenkins Job"
        footer={
          <>
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-400 hover:text-white"
              onClick={() => setTriggerDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              className="bg-purple-600 hover:bg-purple-500 text-white"
              onClick={() =>
                triggerBuildMutation.mutate({
                  name: triggerJobName!,
                  params: parseTriggerParams(),
                })
              }
            >
              Queue Build
            </Button>
          </>
        }
      >
        {triggerJobName && (
          <div className="space-y-4">
            <p className="text-zinc-300">
              Set optional build parameters for <strong>{triggerJobName}</strong>:
            </p>
            <div className="space-y-1">
              <label className="text-[10px] text-zinc-500">Parameters (Comma separated key=value):</label>
              <Input
                placeholder="BRANCH=main, ENVIRONMENT=staging"
                value={triggerParams}
                onChange={(e) => setTriggerParams(e.target.value)}
                className="bg-zinc-950/40 border-zinc-800 text-white text-xs"
              />
            </div>
          </div>
        )}
      </Dialog>

      {/* ── CONSOLE LOGS DRAWER ── */}
      <Drawer
        isOpen={consoleLogOpen}
        onClose={() => setConsoleLogOpen(false)}
        title={consoleLogBuild ? `Console Output: #${consoleLogBuild.num}` : ''}
      >
        {consoleLogBuild && (
          <div className="space-y-4 text-xs">
            {isLogsLoading ? (
              <div className="h-40 flex items-center justify-center text-zinc-500">Fetching console log lines...</div>
            ) : (
              <pre className="p-3 bg-zinc-950 border border-zinc-800 rounded text-[10px] font-mono text-zinc-300 overflow-x-auto max-h-[30rem] overflow-y-auto whitespace-pre-wrap leading-relaxed">
                {consoleLogs?.console_output || 'Empty console logs or build still starting.'}
              </pre>
            )}
          </div>
        )}
      </Drawer>

      {/* ── AI BUILD FAILURE DIAGNOSTIC REPORT DRAWER ── */}
      <Drawer
        isOpen={aiReportOpen}
        onClose={() => setAiReportOpen(false)}
        title="AI Build Failure Diagnostic"
      >
        {aiReportDetails && (
          <div className="space-y-5 text-xs text-zinc-300">
            <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800 space-y-1">
              <span className="text-purple-400 font-bold text-sm block">Isolated Root Cause</span>
              <p className="leading-relaxed text-zinc-200 font-medium">{aiReportDetails.root_cause}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-3 rounded bg-zinc-950/50 border border-zinc-900">
                <span className="text-zinc-500 block text-[10px]">Confidence</span>
                <span className="text-sm font-bold text-purple-400">{Math.round(aiReportDetails.confidence_score * 100)}%</span>
              </div>
              <div className="p-3 rounded bg-zinc-950/50 border border-zinc-900">
                <span className="text-zinc-500 block text-[10px]">Diagnostics model</span>
                <span className="text-sm font-bold text-zinc-300 uppercase">{aiReportDetails.model}</span>
              </div>
            </div>

            {aiReportDetails.recommendations && aiReportDetails.recommendations.length > 0 && (
              <div className="space-y-2">
                <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Actionable Remediation</span>
                <div className="space-y-2">
                  {aiReportDetails.recommendations.map((rec: string | { action: string }, idx: number) => {
                    const action = typeof rec === 'string' ? rec : rec.action;
                    return (
                      <div key={idx} className="flex items-start space-x-3 p-2.5 rounded bg-zinc-950/40 border border-zinc-900">
                        <CheckCircle2 className="h-4.5 w-4.5 text-purple-400 shrink-0 mt-0.5" />
                        <span className="text-zinc-300 font-medium">{action}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {aiReportDetails.impact && (
              <div className="space-y-1">
                <span className="font-semibold text-zinc-400 block uppercase tracking-wider text-[10px]">Impact Summary</span>
                <p className="p-3 bg-zinc-950/50 rounded text-zinc-400 leading-relaxed border border-zinc-900">
                  {aiReportDetails.impact}
                </p>
              </div>
            )}
          </div>
        )}
      </Drawer>

    </div>
  );
}
