import { config } from "../config.js";
import type { JudgeProvider } from "./judge-provider.js";
import { AzureContainerAppsJudgeProvider } from "./azure-container-apps-provider.js";
import { MockJudgeProvider } from "./mock-provider.js";

export function createJudgeProvider(): JudgeProvider {
  if (config.judgeProvider === "azure-container-apps") {
    return new AzureContainerAppsJudgeProvider();
  }

  return new MockJudgeProvider();
}
