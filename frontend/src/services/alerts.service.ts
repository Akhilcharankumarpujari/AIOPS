import { apiClient } from './api-client';
import { Alert } from '@/types';

export const alertsService = {
  listAlerts: async (params: {
    status?: string;
    severity?: string;
    system_id?: string;
    incident_id?: string;
    namespace?: string;
    pod?: string;
    limit?: number;
    offset?: number;
  }) => {
    const { data } = await apiClient.get<Alert[]>('/api/v1/alerts/', {
      params,
    });
    return data;
  },

  listCorrelatedAlerts: async () => {
    const { data } = await apiClient.get<unknown[]>('/api/v1/alerts/incidents');
    return data;
  },

  listAlertsHistory: async (limit = 100, offset = 0) => {
    const { data } = await apiClient.get<Alert[]>('/api/v1/alerts/history', {
      params: { limit, offset },
    });
    return data;
  },

  getAlert: async (id: string) => {
    const { data } = await apiClient.get<Alert>(`/api/v1/alerts/${id}`);
    return data;
  },
};
