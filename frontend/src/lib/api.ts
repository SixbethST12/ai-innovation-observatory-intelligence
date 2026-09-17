import axios from "axios";

const client = axios.create({ baseURL: "/api" });

export type Publication = {
  id: number;
  title: string;
  institution: string;
  source_url: string;
  published_date: string | null;
  document_type: string | null;
  abstract: string | null;
  ai_summary: string | null;
  ai_topics: string | null;
  ai_relevance: string | null;
  ai_engine: string | null;
  ai_processed: boolean;
};

export type Stats = {
  total_publications: number;
  total_processed: number;
  total_institutions: number;
  total_topics: number;
};

export type TopicCount = { topic: string; count: number };
export type InstitutionCount = { institution: string; count: number };
export type EmergingTopic = { topic: string; recent: number; prior: number; score: number };

export const getStats = () => client.get<Stats>("/stats").then(r => r.data);
export const getTimeline = () =>
  client.get<{ month: string; count: number }[]>("/stats/timeline").then(r => r.data);

export const getPublications = (params: Record<string, unknown> = {}) =>
  client.get<Publication[]>("/publications", { params }).then(r => r.data);
export const getPublication = (id: number) =>
  client.get<Publication>(`/publications/${id}`).then(r => r.data);

export const searchPublications = (q: string, params: Record<string, unknown> = {}) =>
  client.get<{ query: string; count: number; results: Publication[] }>("/search", {
    params: { q, ...params },
  }).then(r => r.data);

export const getTrends = () => client.get<TopicCount[]>("/trends").then(r => r.data);
export const getTrendTimeline = () =>
  client.get<Record<string, Record<string, number>>>("/trends/timeline").then(r => r.data);
export const getEmerging = (months_back = 3, top_n = 5) =>
  client.get<EmergingTopic[]>("/trends/emerging", { params: { months_back, top_n } }).then(r => r.data);
export const getInstitutions = () =>
  client.get<InstitutionCount[]>("/trends/institutions").then(r => r.data);

export type GlanceTopic = { topic: string; recent: number; prior: number; score: number };
export type GlanceData = {
  topics: GlanceTopic[];
  narrative: string;
  disclaimer: string;
  engine: string;
};
export const getGlance = (months_back = 3) =>
  client.get<GlanceData>("/trends/glance", { params: { months_back } }).then(r => r.data);

// Admin
export type JobState = {
  status: "idle" | "running" | "done" | "error";
  started_at: string | null;
  finished_at: string | null;
  result: any;
  error: string | null;
};
export type AdminLogs = {
  total_publications: number;
  processed: number;
  pending: number;
  by_source: { institution: string; count: number }[];
  jobs: { collect: JobState; ai: JobState };
};
export type AdminSource = { name: string; url: string; method: string };
export type AdminTopic  = { slug: string; label: string; keywords: string[] };

export const getAdminLogs    = () => client.get<AdminLogs>("/admin/logs").then(r => r.data);
export const getAdminSystem  = () => client.get("/admin/system").then(r => r.data);
export const getAdminSources = () => client.get<AdminSource[]>("/admin/sources").then(r => r.data);
export const getAdminTopics  = () => client.get<AdminTopic[]>("/admin/topics").then(r => r.data);
export const triggerCollect  = () => client.post("/admin/collect").then(r => r.data);
export const triggerAI       = () => client.post("/admin/process-ai").then(r => r.data);

// Users
export type AppUser = {
  id: number;
  username: string;
  role: "analyst" | "admin";
  full_name: string;
  created_at: string;
};
export const getUsers   = () => client.get<AppUser[]>("/admin/users").then(r => r.data);
export const createUser = (payload: { username: string; password: string; role: string; full_name: string }) =>
  client.post<AppUser>("/admin/users", payload).then(r => r.data);
export const deleteUser = (id: number) =>
  client.delete(`/admin/users/${id}`).then(r => r.data);

// Services
export type ServiceStatus = {
  name: string;
  running: boolean;
  pid: number | null;
  healthy: boolean;
  health_url: string;
};
export const getServices        = () => client.get<ServiceStatus[]>("/admin/services").then(r => r.data);
export const restartService     = (name: string) => client.post(`/admin/services/${name}/restart`).then(r => r.data);
export const getServiceLogs     = (name: string, lines = 60) =>
  client.get<{ service: string; lines: string[] }>(`/admin/services/${name}/logs`, { params: { lines } }).then(r => r.data);

// ============================================================
// System alerts
// ============================================================
export type SystemAlert = {
  id: string;
  level: "critical" | "high" | "medium" | "info" | "success";
  title: string;
  message: string;
  timestamp: string;
  source: string;
};

export const getAlerts = () =>
  client.get<SystemAlert[]>("/admin/alerts").then(r => r.data);

// ============================================================
// Trend insights
// ============================================================
export type InsightsData = {
  bullets: string[];
  narrative: string;
  disclaimer: string;
  engine: string;
};

export const getInsights = (months_back = 3) =>
  client.get<InsightsData>("/trends/insights", { params: { months_back } }).then(r => r.data);

// ============================================================
// Alert rules (server-side)
// ============================================================
export type AlertRule = {
  id: number;
  keyword: string;
  source: string | null;
  topic: string | null;
  priority: string;
  created_by: string | null;
  active: boolean;
};

export type RuleMatch = {
  match_id: number;
  matched_at: string;
  rule: { id: number; keyword: string; source: string; topic: string; priority: string };
  publication: {
    id: number;
    title: string;
    institution: string;
    source_url: string;
    published_date: string | null;
  };
};

export const getRules = () => client.get<AlertRule[]>("/admin/rules").then(r => r.data);

export const createRule = (payload: {
  keyword: string; source: string; topic: string; priority: string; created_by?: string;
}) => client.post<AlertRule>("/admin/rules", payload).then(r => r.data);

export const deleteRule = (id: number) =>
  client.delete(`/admin/rules/${id}`).then(r => r.data);

export const getRuleMatches = (limit = 50) =>
  client.get<RuleMatch[]>("/admin/rules/matches", { params: { limit } }).then(r => r.data);

// ============================================================
// Activity + scheduler
// ============================================================
export type ActivityEvent = {
  type: "job" | "rule_match" | "publication";
  level: "info" | "success" | "high" | "medium";
  title: string;
  message: string;
  timestamp: string;
};

export type SchedulerStatus = {
  running: boolean;
  interval_minutes: number | null;
  next_run: string | null;
};

export const getActivity = (limit = 15) =>
  client.get<ActivityEvent[]>("/admin/activity", { params: { limit } }).then(r => r.data);

export const getSchedulerStatus = () =>
  client.get<SchedulerStatus>("/admin/scheduler/status").then(r => r.data);

export const startScheduler = (interval_minutes = 60) =>
  client.post("/admin/scheduler/start", { interval_minutes }).then(r => r.data);

export const stopScheduler = () =>
  client.post("/admin/scheduler/stop").then(r => r.data);

export const retryFailed = () =>
  client.post("/admin/retry-failed").then(r => r.data);
