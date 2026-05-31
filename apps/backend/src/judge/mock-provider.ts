import type { JudgeResult } from "@ace/shared";
import type { JudgeProvider } from "./judge-provider.js";

export class MockJudgeProvider implements JudgeProvider {
  async enqueue({ submission, testCases }: Parameters<JudgeProvider["enqueue"]>[0]): Promise<JudgeResult> {
    const started = Date.now();
    await new Promise((resolve) => setTimeout(resolve, 350));

    return {
      status: "accepted",
      stdout: `Mock judge accepted ${submission.language} submission ${submission.id}`,
      stderr: "",
      durationMs: Date.now() - started,
      testcaseResults: testCases.map((testCase) => ({
        testcaseId: testCase.id,
        status: "accepted",
        durationMs: 1
      }))
    };
  }
}
