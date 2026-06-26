import { apiClient } from './api-client';

export interface LokiLogEntry {
  timestamp: string;
  line: string;
  labels: Record<string, string>;
  severity?: string;
}

export const lokiService = {
  searchLogs: async (params: {
    query?: string;
    namespace?: string;
    pod?: string;
    deployment?: string;
    severity?: string;
    start?: string;
    end?: string;
    limit?: number;
  }) => {
    const { data } = await apiClient.get<{ query: string; entries: LokiLogEntry[] }>('/api/v1/logs/search', {
      params,
    });
    return data;
  },

  getPodLogs: async (podName: string, namespace = 'default', limit = 100) => {
    const { data } = await apiClient.get<LokiLogEntry[]>(`/api/v1/logs/pods/${podName}`, {
      params: { namespace, limit },
    });
    return data;
  },

  getNamespaceLogs: async (namespace: string, limit = 100) => {
    const { data } = await apiClient.get<LokiLogEntry[]>(`/api/v1/logs/namespaces/${namespace}`, {
      params: { limit },
    });
    return data;
  },

  getLogAnalytics: async (duration = '1h') => {
    const { data } = await apiClient.get('/api/v1/logs/analytics', {
      params: { duration },
    });
    return data;
  },

  getLiveLogsUrl: (query?: string, namespace?: string, pod?: string) => {
    const params = new URLSearchParams();
    if (query) params.append('query', query);
    if (namespace) params.append('namespace', namespace);
    if (pod) params.append('pod', pod);

    const token = typeof window !== 'undefined' ? localStorage.getItem('access_token') : null;
    if (token) params.append('token', token); // Optional token auth in query param or we can let custom EventSource handle it

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
    return `${baseUrl}/api/v1/logs/live?${params.toString()}`;
  },
};
