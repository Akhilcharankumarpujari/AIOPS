import { apiClient } from './api-client';
import { Namespace, Pod, Deployment, Service, K8sNode, K8sEvent, ClusterMetrics } from '@/types';

export const k8sService = {
  getClusterHealth: async () => {
    const { data } = await apiClient.get<ClusterMetrics>('/api/v1/k8s/cluster/health');
    return data;
  },

  listNamespaces: async () => {
    const { data } = await apiClient.get<Namespace[]>('/api/v1/k8s/namespaces');
    return data;
  },

  listPods: async (namespace?: string) => {
    const { data } = await apiClient.get<Pod[]>('/api/v1/k8s/pods', {
      params: namespace && namespace !== 'all' ? { namespace } : {},
    });
    return data;
  },

  getPodDetails: async (name: string, namespace: string) => {
    const { data } = await apiClient.get<any>(`/api/v1/k8s/pods/${name}`, {
      params: { namespace },
    });
    return data;
  },

  getPodLogs: async (name: string, namespace: string, container?: string, tailLines = 100) => {
    const { data } = await apiClient.get<string>(`/api/v1/k8s/pods/${name}/logs`, {
      params: { namespace, container, tail_lines: tailLines },
    });
    return data;
  },

  getPodEvents: async (name: string, namespace: string) => {
    const { data } = await apiClient.get<K8sEvent[]>(`/api/v1/k8s/pods/${name}/events`, {
      params: { namespace },
    });
    return data;
  },

  deletePod: async (name: string, namespace: string) => {
    const { data } = await apiClient.delete(`/api/v1/k8s/pods`, {
      params: { name, namespace },
    });
    return data;
  },

  listDeployments: async (namespace?: string) => {
    const { data } = await apiClient.get<Deployment[]>('/api/v1/k8s/deployments', {
      params: namespace && namespace !== 'all' ? { namespace } : {},
    });
    return data;
  },

  scaleDeployment: async (name: string, namespace: string, replicas: number) => {
    const { data } = await apiClient.post(`/api/v1/k8s/deployments/${name}/scale`, { replicas }, {
      params: { namespace },
    });
    return data;
  },

  restartDeployment: async (name: string, namespace: string) => {
    const { data } = await apiClient.post(`/api/v1/k8s/deployments/${name}/restart`, null, {
      params: { namespace },
    });
    return data;
  },

  rollbackDeployment: async (name: string, namespace: string, revision: number | null = null) => {
    const { data } = await apiClient.post(`/api/v1/k8s/deployments/${name}/rollback`, { revision }, {
      params: { namespace },
    });
    return data;
  },

  listNodes: async () => {
    const { data } = await apiClient.get<K8sNode[]>('/api/v1/k8s/nodes');
    return data;
  },

  listServices: async (namespace?: string) => {
    const { data } = await apiClient.get<Service[]>('/api/v1/k8s/services', {
      params: namespace && namespace !== 'all' ? { namespace } : {},
    });
    return data;
  },
};
