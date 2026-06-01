import { config } from "../config.js";
import type { JudgeProvider } from "./judge-provider.js";
import { AzureContainerAppsJudgeProvider } from "./azure-container-apps-provider.js";
import { DockerJudgeProvider } from "./docker-provider.js";
import { MockJudgeProvider } from "./mock-provider.js";
import { RemoteRunnerJudgeProvider } from "./remote-runner-provider.js";

export function createJudgeProvider(): JudgeProvider {
  if (config.judgeProvider === "docker") {
    return new DockerJudgeProvider();
  }

  if (config.judgeProvider === "remote-runner") {
    return new RemoteRunnerJudgeProvider();
  }

  if (config.judgeProvider === "azure-container-apps") {
    return new AzureContainerAppsJudgeProvider();
  }

  return new MockJudgeProvider();
}
