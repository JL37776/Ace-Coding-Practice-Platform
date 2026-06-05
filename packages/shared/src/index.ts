export type ProblemType = "coding" | "sql" | "single_choice" | "multi_choice" | "short_answer";
export type QuestionType = "single" | "multiple" | "boolean" | "blank" | "coding";
export type Difficulty = "easy" | "medium" | "hard";
export type Language = "python" | "typescript" | "javascript" | "sql" | "csharp" | "java";
export type BankScope = "public" | "personal";
export type PracticeFeedbackMode = "instant" | "final";
export type PracticeSessionMode = "practice" | "exam";
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
  scope: BankScope;
  ownerUserId?: string;
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

export interface User {
  id: string;
  username: string;
  displayName: string;
  role: "admin" | "member";
}

export interface SystemSettings {
  allowedQuestionTypes: QuestionType[];
  allowedLanguages: Language[];
  aiQuestionGenerationEnabled: boolean;
  defaultScoreFormat: "percent_fraction";
}

export interface AuthSession {
  token: string;
  user: User;
}

export interface TopicNode {
  id: string;
  scope: BankScope;
  ownerUserId?: string;
  name: string;
  parentId?: string;
  scorePercent: number;
  done: number;
  total: number;
  children?: TopicNode[];
}

export interface TrainingSuite {
  id: string;
  scope: BankScope;
  ownerUserId?: string;
  topicId: string;
  title: string;
  description: string;
  questionCount: number;
  durationMinutes: number;
  scorePercent: number;
  done: number;
  total: number;
  allowedTypes: QuestionType[];
  feedbackMode?: PracticeFeedbackMode;
  metadata?: Record<string, unknown>;
}

export interface QuestionOption {
  id: string;
  text: string;
}

export interface QuestionMedia {
  type: "image" | "audio" | "video" | "file";
  url: string;
}

export interface Question {
  id: string;
  scope: BankScope;
  ownerUserId?: string;
  suiteId: string;
  type: QuestionType;
  title: string;
  description?: string;
  difficulty: Difficulty;
  tags: string[];
  media: QuestionMedia[];
  options?: QuestionOption[];
  answer?: unknown;
  explanation?: string;
  problemId?: string;
  metadata: Record<string, unknown>;
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
  userId: string;
  problemId: string;
  language: Language;
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

export interface PracticeProgress {
  suiteId: string;
  questionIndex: number;
  answers: Record<string, unknown>;
  updatedAt: string;
}

export interface DailyActivity {
  date: string;
  count: number;
}

export interface StudyDashboard {
  heatmap: DailyActivity[];
  progress?: PracticeProgress;
  todayCount: number;
  activeDays: number;
  totalCount: number;
}

export interface ApiEnvelope<T> {
  data: T;
}
