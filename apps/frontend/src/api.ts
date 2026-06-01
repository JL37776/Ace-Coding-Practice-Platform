import type {
  ApiEnvelope,
  AuthSession,
  CreateSubmissionInput,
  Problem,
  Question,
  Submission,
  SystemSettings,
  TopicNode,
  TrainingSuite,
  User
} from "@ace/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";
let authToken = window.localStorage.getItem("ace_token") || "";

export function setAuthToken(token: string) {
  authToken = token;
  window.localStorage.setItem("ace_token", token);
}

export function clearAuthToken() {
  authToken = "";
  window.localStorage.removeItem("ace_token");
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(authToken ? { authorization: `Bearer ${authToken}` } : {}),
      ...(init?.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export const api = {
  login: (input: { username: string; password: string }) =>
    request<AuthSession>("/api/auth/login", { method: "POST", body: JSON.stringify(input) }),
  register: (input: { username: string; password: string; displayName: string }) =>
    request<AuthSession>("/api/auth/register", { method: "POST", body: JSON.stringify(input) }),
  me: () => request<User>("/api/auth/me"),
  settings: () => request<SystemSettings>("/api/settings"),
  listTopics: () => request<TopicNode[]>("/api/topics"),
  createTopic: (input: { scope: "public" | "personal"; parentId?: string; name: string }) =>
    request<TopicNode>("/api/topics", { method: "POST", body: JSON.stringify(input) }),
  deleteTopic: (id: string) =>
    request<void>(`/api/topics/${id}`, { method: "DELETE" }),
  listSuites: (topicId?: string, scope?: "public" | "personal") => {
    const params = new URLSearchParams();
    if (topicId) params.set("topicId", topicId);
    if (scope) params.set("scope", scope);
    return request<TrainingSuite[]>(`/api/suites${params.size ? `?${params}` : ""}`);
  },
  createSuite: (input: {
    scope: "public" | "personal";
    topicId: string;
    title: string;
    description: string;
    questionCount: number;
    durationMinutes: number;
    allowedTypes: Array<"single" | "multiple" | "boolean" | "blank" | "coding">;
    feedbackMode?: "instant" | "final";
  }) => request<TrainingSuite>("/api/suites", { method: "POST", body: JSON.stringify(input) }),
  deleteSuite: (id: string) =>
    request<void>(`/api/suites/${id}`, { method: "DELETE" }),
  listQuestions: (suiteId?: string, scope?: "public" | "personal") => {
    const params = new URLSearchParams();
    if (suiteId) params.set("suiteId", suiteId);
    if (scope) params.set("scope", scope);
    return request<Question[]>(`/api/questions${params.size ? `?${params}` : ""}`);
  },
  parseTopicRaw: (input: { scope: "public" | "personal"; topicId: string; raw: string }) =>
    request<{ suite: TrainingSuite; questions: Question[] }>("/api/topic-raw/parse", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  importTopicRaw: (input: { scope: "public" | "personal"; topicId: string; raw: string }) =>
    request<{ suite: TrainingSuite; questions: Question[] }>("/api/topic-raw/import", {
      method: "POST",
      body: JSON.stringify(input)
    }),
  listProblems: () => request<Problem[]>("/api/problems"),
  getProblem: (id: string) => request<Problem>(`/api/problems/${id}`),
  createSubmission: (input: CreateSubmissionInput) =>
    request<Submission>("/api/submissions", { method: "POST", body: JSON.stringify(input) }),
  getSubmission: (id: string) => request<Submission>(`/api/submissions/${id}`),
  listSubmissions: () => request<Submission[]>("/api/submissions")
};
