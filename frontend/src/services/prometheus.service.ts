import { apiClient } from './api-client';
import { NodeMetric, PodMetric, ClusterMetrics } from '@/types';

export const prometheusService = {
  getClusterMetrics: async () => {
    const { data } = await apiClient.get<ClusterMetrics>('/api/v1/metrics/cluster');
    return data;
  },

  getNodesMetrics: async () => {
    const { data } = await apiClient.get<NodeMetric[]>('/api/v1/metrics/nodes');
    return data;
  },

  getPodsMetrics: async (namespace?: string) => {
    const { data } = await apiClient.get<PodMetric[]>('/api/v1/metrics/pods', {
      params: namespace && namespace !== 'all' ? { namespace } : {},
    });
    return data;
  },

  getPodMetrics: async (podName: string, namespace: string) => {
    const { data } = await apiClient.get<PodMetric>(`/api/v1/metrics/pods/${podName}`, {
      params: { namespace },
    });
    return data;
  },

  getHistoricalMetrics: async (query: string, start: string, end: string, step = 60) => {
    const { data } = await apiClient.get('/api/v1/metrics/history', {
      params: { query, start, end, step },
    });
    return data;
  },
};
