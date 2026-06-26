import { apiClient } from './api-client';
import { Incident, IncidentEvent, AIAnalysis } from '@/types';

export const incidentsService = {
  listIncidents: async (params: {
    status?: string[];
    severity?: string[];
    system_id?: string;
    assignee_id?: string;
    search?: string;
    page?: number;
    size?: number;
  }) => {
    const { data } = await apiClient.get<{ items: Incident[]; total: number; page: number; size: number; pages: number }>('/api/v1/incidents/', {
      params,
    });
    return data;
  },

  createIncident: async (payload: {
    title: string;
    description?: string;
    severity?: string;
    priority?: string;
    system_id?: string;
    labels?: Record<string, string>;
  }) => {
    const { data } = await apiClient.post<Incident>('/api/v1/incidents/', payload);
    return data;
  },

  getIncident: async (id: string) => {
    const { data } = await apiClient.get<Incident>(`/api/v1/incidents/${id}`);
    return data;
  },

  updateIncident: async (id: string, payload: {
    title?: string;
    description?: string;
    severity?: string;
    priority?: string;
  }) => {
    const { data } = await apiClient.put<Incident>(`/api/v1/incidents/${id}`, payload);
    return data;
  },

  deleteIncident: async (id: string) => {
    await apiClient.delete(`/api/v1/incidents/${id}`);
  },

  assignIncident: async (id: string, assigneeId: string | null) => {
    const { data } = await apiClient.post<Incident>(`/api/v1/incidents/${id}/assign`, {
      assignee_id: assigneeId,
    });
    return data;
  },

  transitionStatus: async (id: string, status: string, message?: string) => {
    const { data } = await apiClient.post<Incident>(`/api/v1/incidents/${id}/status`, {
      status,
      message,
    });
    return data;
  },

  getTimeline: async (id: string) => {
    const { data } = await apiClient.get<IncidentEvent[]>(`/api/v1/incidents/${id}/timeline`);
    return data;
  },

  // AI RCA Endpoints
  analyzeIncident: async (incidentId: string) => {
    const { data } = await apiClient.post<AIAnalysis>('/api/v1/ai/analyze/incident', {
      incident_id: incidentId,
    });
    return data;
  },

  analyzeAlert: async (alertId: string) => {
    const { data } = await apiClient.post<AIAnalysis>('/api/v1/ai/analyze/alert', {
      alert_id: alertId,
    });
    return data;
  },

  analyzePod: async (podName: string, namespace = 'default') => {
    const { data } = await apiClient.post<AIAnalysis>('/api/v1/ai/analyze/pod', {
      pod_name: podName,
      namespace,
    });
    return data;
  },

  getAIAnalysisHistory: async (params: {
    incident_id?: string;
    provider?: string;
    page?: number;
    size?: number;
  }) => {
    const { data } = await apiClient.get<{ total: number; items: AIAnalysis[] }>('/api/v1/ai/history', {
      params,
    });
    return data;
  },

  getAIAnalysis: async (analysisId: string) => {
    const { data } = await apiClient.get<AIAnalysis>(`/api/v1/ai/history/${analysisId}`);
    return data;
  },
};
