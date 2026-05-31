import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const backendUrl = (process.env.BACKEND_URL || "").replace(/\/$/, "");
const submissionId = process.env.SUBMISSION_ID || "";

if (!backendUrl || !submissionId) {
  throw new Error("BACKEND_URL and SUBMISSION_ID are required");
}

const submissionPayload = await fetchJson(`${backendUrl}/api/submissions/${submissionId}`);
const submission = submissionPayload.data;
const workdir = join(tmpdir(), `ace-${submissionId}`);
const started = Date.now();

await mkdir(workdir, { recursive: true });
try {
  const sourcePath = join(workdir, "main.js");
  await writeFile(sourcePath, submission.sourceCode, "utf8");
  const result = await runNode(sourcePath, workdir);
  await postJson(`${backendUrl}/api/internal/judge-results/${submissionId}`, {
    status: result.code === 0 ? "accepted" : "runtime_error",
    stdout: result.stdout.slice(0, 8000),
    stderr: result.stderr.slice(0, 8000),
    durationMs: Date.now() - started,
    testcaseResults: []
  });
} finally {
  await rm(workdir, { recursive: true, force: true });
}

async function runNode(sourcePath, cwd) {
  return new Promise((resolve) => {
    const child = spawn("node", ["--max-old-space-size=128", sourcePath], {
      cwd,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => child.kill("SIGKILL"), 5000);
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr });
    });
  });
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload)
  });
  if (!response.ok) throw new Error(await response.text());
}
