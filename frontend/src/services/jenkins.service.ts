import { apiClient } from './api-client';
import { JenkinsJob, JenkinsBuild, AIAnalysis, JenkinsJobDetail } from '@/types';

export const jenkinsService = {
  listJobs: async () => {
    const { data } = await apiClient.get<{ jobs: JenkinsJob[] }>('/api/v1/jenkins/jobs');
    return data;
  },

  getJobDetails: async (jobName: string) => {
    const { data } = await apiClient.get<JenkinsJobDetail>(`/api/v1/jenkins/jobs/${jobName}`);
    return data;
  },

  getBuildHistory: async (jobName: string, limit = 25) => {
    const { data } = await apiClient.get<{ builds: JenkinsBuild[] }>(`/api/v1/jenkins/jobs/${jobName}/builds`, {
      params: { limit },
    });
    return data;
  },

  getBuildDetails: async (jobName: string, buildNumber: number) => {
    const { data } = await apiClient.get<JenkinsBuild>(`/api/v1/jenkins/jobs/${jobName}/builds/${buildNumber}`);
    return data;
  },

  triggerBuild: async (jobName: string, parameters?: Record<string, string>) => {
    const { data } = await apiClient.post(`/api/v1/jenkins/jobs/${jobName}/build`, {
      parameters: parameters || {},
    });
    return data;
  },

  cancelBuild: async (jobName: string, buildNumber: number) => {
    const { data } = await apiClient.post(`/api/v1/jenkins/jobs/${jobName}/builds/${buildNumber}/cancel`);
    return data;
  },

  getBuildLogs: async (jobName: string, buildNumber: number) => {
    const { data } = await apiClient.get<{ console_output: string }>(`/api/v1/jenkins/jobs/${jobName}/builds/${buildNumber}/logs`);
    return data;
  },

  analyzeBuild: async (jobName: string, buildNumber: number) => {
    const { data } = await apiClient.post<AIAnalysis>(`/api/v1/jenkins/jobs/${jobName}/builds/${buildNumber}/analyze`);
    return data;
  },
};
