import type { ApiEnvelope, CreateSubmissionInput, Problem, Submission } from "@ace/shared";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(init?.headers || {})
    }
  });
  if (!response.ok) throw new Error(await response.text());
  const payload = (await response.json()) as ApiEnvelope<T>;
  return payload.data;
}

export const api = {
  listProblems: () => request<Problem[]>("/api/problems"),
  getProblem: (id: string) => request<Problem>(`/api/problems/${id}`),
  createSubmission: (input: CreateSubmissionInput) =>
    request<Submission>("/api/submissions", { method: "POST", body: JSON.stringify(input) }),
  getSubmission: (id: string) => request<Submission>(`/api/submissions/${id}`),
  listSubmissions: () => request<Submission[]>("/api/submissions")
};
