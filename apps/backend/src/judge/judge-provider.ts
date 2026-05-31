import type { JudgeResult, Submission, TestCase } from "@ace/shared";

export interface JudgeProvider {
  enqueue(input: { submission: Submission; testCases: TestCase[] }): Promise<JudgeResult>;
}
