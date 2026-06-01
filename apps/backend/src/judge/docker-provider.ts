import { spawn } from "node:child_process";
import type { JudgeResult } from "@ace/shared";
import { config } from "../config.js";
import { store } from "../store.js";
import type { JudgeProvider } from "./judge-provider.js";

export class DockerJudgeProvider implements JudgeProvider {
  async enqueue({ submission, testCases }: Parameters<JudgeProvider["enqueue"]>[0]): Promise<JudgeResult> {
    const problem = store.getProblem(submission.problemId);
    if (!problem) {
      throw new Error(`Problem not found for submission ${submission.id}`);
    }

    const image = config.docker.images[submission.language];
    const started = Date.now();

    try {
      const output = await runDocker(image, JSON.stringify({ submission, problem, testCases }));
      const result = JSON.parse(output.stdout || "{}") as JudgeResult;
      return {
        ...result,
        durationMs: result.durationMs || Date.now() - started,
        stderr: [result.stderr, output.stderr].filter(Boolean).join("\n").slice(0, 8000)
      };
    } catch (error) {
      return {
        status: "system_error",
        stdout: "",
        stderr: error instanceof Error ? error.message : "Docker judge failed",
        durationMs: Date.now() - started,
        testcaseResults: []
      };
    }
  }
}

function runDocker(image: string, payload: string): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const args = [
      "run",
      "--rm",
      "-i",
      "--network",
      "none",
      "--cpus",
      config.docker.cpuLimit,
      "--memory",
      config.docker.memoryLimit,
      "--pids-limit",
      "64",
      "--read-only",
      "--tmpfs",
      "/tmp:rw,size=64m",
      image
    ];
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), config.docker.timeoutMs);

    child.stdin.end(payload);

    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve({ stdout, stderr });
      } else {
        reject(new Error(`docker exited with ${signal || code}: ${stderr || stdout}`));
      }
    });
  });
}
