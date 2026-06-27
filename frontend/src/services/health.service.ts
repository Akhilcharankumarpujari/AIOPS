import { apiClient } from './api-client';

export interface ReadinessResponse {
  status: 'ready' | 'not_ready';
  service: string;
  version: string;
  environment: string;
  dependencies: Record<string, { status: 'up' | 'down'; error?: string | null }>;
}

export const healthService = {
  checkReady: async () => {
    const { data } = await apiClient.get<ReadinessResponse>('/api/v1/health/ready');
    return data;
  },
  checkLive: async () => {
    const { data } = await apiClient.get<{ status: 'ok'; service: string; version: string; environment: string }>('/api/v1/health/live');
    return data;
  }
};
