import type { JudgeResult } from "@ace/shared";
import type { JudgeProvider } from "./judge-provider.js";

export class RemoteRunnerJudgeProvider implements JudgeProvider {
  async enqueue(): Promise<JudgeResult> {
    return {
      status: "queued",
      stdout: "Queued for remote runner service",
      stderr: "",
      durationMs: 0,
      testcaseResults: []
    };
  }
}
