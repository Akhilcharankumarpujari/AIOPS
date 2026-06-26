export interface User {
  id: string;
  email: string;
  full_name: string;
  status: 'active' | 'disabled';
  is_verified: boolean;
  roles: Role[];
  permissions: string[];
  created_at: string;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
}

export interface TokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface AuthResponse {
  user: User;
  tokens: TokenPair;
}

// Kubernetes Types
export interface Namespace {
  name: string;
  status: string;
  created_at: string;
}

export interface Pod {
  name: string;
  namespace: string;
  status: 'Running' | 'Pending' | 'Failed' | 'Succeeded' | 'Unknown';
  node_name?: string;
  ip?: string;
  cpu_usage?: number;
  memory_usage?: number;
  created_at: string;
  restarts: number;
}

export interface Deployment {
  name: string;
  namespace: string;
  replicas: number;
  available_replicas: number;
  ready_replicas: number;
  updated_replicas: number;
  strategy: string;
  created_at: string;
}

export interface Service {
  name: string;
  namespace: string;
  type: string;
  cluster_ip: string;
  ports: { port: number; protocol: string; target_port?: number | string }[];
  selector?: Record<string, string>;
  created_at: string;
}

export interface K8sNode {
  name: string;
  status: 'Ready' | 'NotReady' | 'Unknown';
  cpu_capacity: string;
  cpu_allocatable: string;
  memory_capacity: string;
  memory_allocatable: string;
  kubelet_version: string;
  os_image: string;
}

export interface K8sEvent {
  type: string;
  reason: string;
  message: string;
  source: string;
  count: number;
  first_timestamp: string;
  last_timestamp: string;
}

// Metrics Types
export interface NodeMetric {
  node_name: string;
  cpu_usage_pct: number;
  memory_usage_pct: number;
  disk_usage_pct: number;
  network_rx_bytes_sec: number;
  network_tx_bytes_sec: number;
}

export interface PodMetric {
  pod_name: string;
  namespace: string;
  cpu_usage_cores: number;
  memory_usage_bytes: number;
  restarts: number;
  status: string;
}

export interface ClusterMetrics {
  cpu_usage_pct: number;
  memory_usage_pct: number;
  disk_usage_pct: number;
  pods_count: number;
  nodes_count: number;
  active_deployments: number;
}

// Loki Log Types
export interface LogLine {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug' | 'unknown';
  message: string;
}

// Incident Types
export interface Incident {
  id: string;
  incident_number: string;
  title: string;
  description: string;
  status: 'open' | 'acknowledged' | 'resolved' | 'closed';
  severity: 'low' | 'medium' | 'high' | 'critical';
  priority: string;
  system_id?: string;
  creator_id: string;
  assignee_id?: string;
  assignee?: { id: string; email: string; full_name: string } | null;
  detected_at: string;
  acknowledged_at?: string | null;
  mitigated_at?: string | null;
  resolved_at?: string | null;
  closed_at?: string | null;
  labels?: Record<string, string>;
  created_at: string;
  updated_at: string;
  events?: IncidentEvent[];
  comments?: IncidentComment[];
}

export interface IncidentEvent {
  id: string;
  incident_id: string;
  event_type: string;
  actor_id?: string | null;
  actor?: { id: string; email: string; full_name: string } | null;
  message: string;
  data?: Record<string, unknown>;
  created_at: string;
}

export interface IncidentComment {
  id: string;
  incident_id: string;
  author_id: string;
  author_name: string;
  content: string;
  created_at: string;
}

// AI Analysis Types
export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

export interface AIAnalysis {
  id: string;
  incident_id?: string;
  analysis_type: string;
  provider: string;
  model: string;
  status: string;
  root_cause: string;
  confidence_score: number;
  severity?: string;
  impact?: string;
  recommendations: (string | { action: string })[];
  remediation_steps: string[];
  related_components: string[];
  token_usage: TokenUsage;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

export interface JenkinsJob {
  name: string;
  url: string;
  color: string;
  last_build_number?: number;
  last_build_status?: string;
}

export interface JenkinsHealthReport {
  score: number;
  description: string;
}

export interface JenkinsJobDetail extends JenkinsJob {
  health_report?: JenkinsHealthReport[];
  health_reports?: JenkinsHealthReport[];
  builds: JenkinsBuild[];
}


export interface JenkinsBuild {
  number: number;
  url: string;
  result: 'SUCCESS' | 'FAILURE' | 'ABORTED' | 'UNSTABLE' | 'BUILDING' | null;
  duration: number;
  timestamp: number;
  estimated_duration: number;
  building: boolean;
}

// Alert Types
export interface Alert {
  id: string;
  name: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'firing' | 'resolved';
  labels: Record<string, string>;
  annotations: Record<string, string>;
  starts_at: string;
  ends_at?: string;
}

export interface LoginRequest {
  email: string;
  password?: string;
}

export interface RegisterRequest {
  email: string;
  full_name: string;
  password?: string;
}

