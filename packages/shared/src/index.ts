export type ProblemType = "coding" | "sql" | "single_choice" | "multi_choice" | "short_answer";
export type Difficulty = "easy" | "medium" | "hard";
export type SubmissionStatus =
  | "queued"
  | "running"
  | "accepted"
  | "wrong_answer"
  | "compile_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "memory_limit_exceeded"
  | "system_error";

export interface Problem {
  id: string;
  title: string;
  slug: string;
  type: ProblemType;
  difficulty: Difficulty;
  tags: string[];
  statement: string;
  configJson: Record<string, unknown>;
  version: number;
  published: boolean;
}

export interface TestCase {
  id: string;
  problemId: string;
  visibility: "sample" | "hidden";
  inputJson: unknown;
  expectedJson: unknown;
  weight: number;
  order: number;
}

export interface Submission {
  id: string;
  problemId: string;
  language: "python" | "javascript";
  sourceCode: string;
  status: SubmissionStatus;
  result?: JudgeResult;
  createdAt: string;
  updatedAt: string;
}

export interface JudgeResult {
  status: SubmissionStatus;
  stdout: string;
  stderr: string;
  durationMs: number;
  testcaseResults: Array<{
    testcaseId: string;
    status: SubmissionStatus;
    stdout?: string;
    stderr?: string;
    durationMs?: number;
  }>;
}

export interface CreateSubmissionInput {
  problemId: string;
  language: Submission["language"];
  sourceCode: string;
}

export interface ApiEnvelope<T> {
  data: T;
}
