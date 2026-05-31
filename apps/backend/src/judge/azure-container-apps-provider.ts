import type { JudgeResult } from "@ace/shared";
import type { JudgeProvider } from "./judge-provider.js";
import { config } from "../config.js";

export class AzureContainerAppsJudgeProvider implements JudgeProvider {
  async enqueue({ submission }: Parameters<JudgeProvider["enqueue"]>[0]): Promise<JudgeResult> {
    const jobName = config.azure.jobs[submission.language as keyof typeof config.azure.jobs];

    if (!config.azure.subscriptionId || !config.azure.resourceGroup || !jobName) {
      throw new Error(`Azure Container Apps job is not configured for ${submission.language}`);
    }

    // The first production version should call the Azure ARM API to start a
    // Container Apps Job execution with this submission id. Keep that detail
    // behind the provider so the API routes do not care where code runs.
    return {
      status: "queued",
      stdout: `Queued ${submission.id} for Azure Container Apps Job ${jobName}`,
      stderr: "",
      durationMs: 0,
      testcaseResults: []
    };
  }
}
