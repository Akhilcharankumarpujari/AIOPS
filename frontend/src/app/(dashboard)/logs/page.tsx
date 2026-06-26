'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lokiService } from '@/services/loki.service';
import { k8sService } from '@/services/k8s.service';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { useToast } from '@/contexts/toast-context';
import { ShieldAlert, Play, Square, Download, Search, Terminal } from 'lucide-react';

interface LogMessage {
  timestamp: string;
  message: string;
  level: string;
}

export default function LogsPage() {
  const { toast } = useToast();
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const [namespace, setNamespace] = useState('default');
  const [selectedPod, setSelectedPod] = useState('all');
  const [query, setQuery] = useState('');
  const [severityFilter, setSeverityFilter] = useState('all');
  
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);

  // Fetch K8s data for dropdown selectors
  const { data: namespaces } = useQuery({
    queryKey: ['namespaces'],
    queryFn: k8sService.listNamespaces,
  });

  const { data: pods } = useQuery({
    queryKey: ['pods', namespace],
    queryFn: () => k8sService.listPods(namespace),
  });

  // Query logs historically
  const { data: historicalLogs, isLoading: isLogsLoading, refetch: fetchHistory } = useQuery({
    queryKey: ['logs', namespace, selectedPod, query, severityFilter],
    queryFn: () =>
      lokiService.searchLogs({
        namespace,
        pod: selectedPod !== 'all' ? selectedPod : undefined,
        query: query || undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined,
        limit: 100,
      }),
    enabled: !isStreaming,
  });

  // Map historical logs when loaded
  useEffect(() => {
    if (historicalLogs && !isStreaming) {
      const mapped = historicalLogs.entries.map((e) => ({
        timestamp: e.timestamp || new Date().toISOString(),
        message: e.line || '',
        level: e.severity || e.labels?.level || 'info',
      }));
      setLogs(mapped);
    }
  }, [historicalLogs, isStreaming]);

  // Clean up streaming on unmount
  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, []);

  // Autoscroll console logs
  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  const startStreaming = () => {
    if (isStreaming) return;
    
    setLogs([]);
    setIsStreaming(true);
    toast('Info', 'Log stream connection starting...', 'info');

    const sseUrl = lokiService.getLiveLogsUrl(
      query || undefined,
      namespace,
      selectedPod !== 'all' ? selectedPod : undefined
    );

    const es = new EventSource(sseUrl);
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const raw = JSON.parse(event.data);
        const newLine: LogMessage = {
          timestamp: raw.timestamp || new Date().toISOString(),
          message: raw.line || raw.message || '',
          level: raw.severity || raw.level || 'info',
        };
        setLogs((prev) => [...prev.slice(-499), newLine]); // Max 500 lines cache
      } catch (err) {
        // SSE might send plain lines
        const newLine: LogMessage = {
          timestamp: new Date().toISOString(),
          message: event.data,
          level: 'info',
        };
        setLogs((prev) => [...prev.slice(-499), newLine]);
      }
    };

    es.onerror = () => {
      stopStreaming();
      toast('Warning', 'Live log stream disconnected', 'warning');
    };
  };

  const stopStreaming = () => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    setIsStreaming(false);
  };

  const handleDownloadLogs = () => {
    if (logs.length === 0) {
      toast('Warning', 'No log lines to download', 'warning');
      return;
    }

    const content = logs
      .map((l) => `[${new Date(l.timestamp).toISOString()}] [${l.level.toUpperCase()}] ${l.message}`)
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `loki-${namespace}-${selectedPod}-logs.txt`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast('Success', 'Downloaded log file', 'success');
  };

  const nsOptions = (namespaces || []).map((ns) => ({ value: ns.name, label: ns.name }));
  const podOptions = [
    { value: 'all', label: 'All Pods' },
    ...(pods || []).map((p) => ({ value: p.name, label: p.name })),
  ];

  const severityOptions = [
    { value: 'all', label: 'All Levels' },
    { value: 'info', label: 'Info' },
    { value: 'warn', label: 'Warning' },
    { value: 'error', label: 'Error' },
    { value: 'debug', label: 'Debug' },
  ];

  return (
    <div className="space-y-6">
      
      {/* ── CONTROL BOARD ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 bg-card p-4 rounded-lg border border-border">
        
        {/* Namespace */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Namespace</label>
          <Select
            options={nsOptions}
            value={namespace}
            onChange={(e) => {
              setNamespace(e.target.value);
              setSelectedPod('all');
            }}
            className="w-full bg-zinc-950/40 border-zinc-800 text-white"
            disabled={isStreaming}
          />
        </div>

        {/* Pod Selector */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Pod</label>
          <Select
            options={podOptions}
            value={selectedPod}
            onChange={(e) => setSelectedPod(e.target.value)}
            className="w-full bg-zinc-950/40 border-zinc-800 text-white"
            disabled={isStreaming}
          />
        </div>

        {/* Query Input */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Query Search</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-zinc-500" />
            <Input
              placeholder="Filter text..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-8 h-9 bg-zinc-950/40 border-zinc-800 text-white"
              disabled={isStreaming}
            />
          </div>
        </div>

        {/* Severity */}
        <div className="space-y-1">
          <label className="text-[10px] font-semibold text-zinc-500 uppercase">Severity Level</label>
          <Select
            options={severityOptions}
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="w-full bg-zinc-950/40 border-zinc-800 text-white"
            disabled={isStreaming}
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-end space-x-2">
          {isStreaming ? (
            <Button
              className="flex-1 bg-red-600 hover:bg-red-500 text-white h-9"
              onClick={stopStreaming}
            >
              <Square className="h-3.5 w-3.5 mr-1.5" />
              Stop
            </Button>
          ) : (
            <Button
              className="flex-1 bg-purple-600 hover:bg-purple-500 text-white h-9"
              onClick={startStreaming}
            >
              <Play className="h-3.5 w-3.5 mr-1.5" />
              Stream
            </Button>
          )}

          <Button
            variant="outline"
            className="border-zinc-800 text-zinc-400 hover:text-white h-9"
            onClick={handleDownloadLogs}
            title="Download Logs"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>

      </div>

      {/* ── CONSOLE VIEWPORT ── */}
      <Card className="glass-panel text-white border-zinc-800 overflow-hidden glow-active">
        <CardHeader className="py-3 bg-zinc-950 border-b border-zinc-800 flex flex-row items-center justify-between">
          <span className="text-xs font-mono font-bold text-zinc-400 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-purple-400" />
            CONSOLE TERMINAL: {namespace} / {selectedPod}
          </span>
          {isStreaming && (
            <span className="flex items-center space-x-1.5 text-[10px] text-purple-400 font-semibold uppercase animate-pulse">
              <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
              <span>Streaming Live</span>
            </span>
          )}
        </CardHeader>
        
        <CardContent className="p-4 bg-zinc-950/70 h-[28rem] overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1">
          {isLogsLoading ? (
            <div className="h-full flex items-center justify-center text-zinc-500">Querying Loki historical logs...</div>
          ) : logs.length === 0 ? (
            <div className="h-full flex items-center justify-center text-zinc-500">No log entries matching search criteria.</div>
          ) : (
            logs.map((l, index) => {
              const levelColor: Record<string, string> = {
                error: 'text-red-400 font-semibold',
                warn: 'text-amber-400 font-semibold',
                info: 'text-zinc-400',
                debug: 'text-zinc-500',
              };
              const color = levelColor[l.level.toLowerCase()] || 'text-zinc-400';
              return (
                <div key={index} className="hover:bg-zinc-800/10 py-0.5 rounded px-2">
                  <span className="text-zinc-600 select-none mr-2 font-light">[{new Date(l.timestamp).toLocaleTimeString()}]</span>
                  <span className={`mr-2 uppercase tracking-wide text-[9px] px-1 rounded ${color}`}>[{l.level}]</span>
                  <span className="text-zinc-300 whitespace-pre-wrap">{l.message}</span>
                </div>
              );
            })
          )}
          <div ref={consoleEndRef} />
        </CardContent>
      </Card>

    </div>
  );
}
