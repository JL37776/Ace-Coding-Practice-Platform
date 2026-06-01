import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";
import ts from "typescript";
import type { JudgeResult, Language, Problem, Submission, SubmissionStatus, TestCase } from "@ace/shared";

interface JudgeJob {
  submission: Submission;
  problem: Problem;
  testCases: TestCase[];
}

const backendUrl = requiredEnv("BACKEND_URL").replace(/\/$/, "");
const runnerToken = process.env.RUNNER_SHARED_TOKEN || "";
const pollMs = Number(process.env.RUNNER_POLL_MS || 1200);
const workRoot = process.env.RUNNER_WORK_ROOT || tmpdir();
const maxBytes = Number(process.env.RUNNER_MAX_OUTPUT_BYTES || 8000);
const commandTimeoutMs = Number(process.env.RUNNER_TIMEOUT_MS || 6000);

interface RuntimeCommand {
  probe: string[];
  run: string[];
}

const pythonCommands: RuntimeCommand[] = process.platform === "win32"
  ? [
      { probe: ["python", "--version"], run: ["python"] },
      { probe: ["py", "-3", "--version"], run: ["py", "-3"] }
    ]
  : [
      { probe: ["python3", "--version"], run: ["python3"] },
      { probe: ["python", "--version"], run: ["python"] }
    ];

const languageCommands: Record<Language, RuntimeCommand[]> = {
  python: pythonCommands,
  javascript: [{ probe: ["node", "--version"], run: ["node"] }],
  typescript: [{ probe: ["node", "--version"], run: ["node"] }],
  sql: [{ probe: ["sqlite3", "--version"], run: ["sqlite3"] }],
  csharp: [{ probe: ["dotnet", "--version"], run: ["dotnet"] }],
  java: [{ probe: ["javac", "-version"], run: ["javac"] }]
};

const runtimeCommands = new Map<Language, string[]>();
const supportedLanguages = await detectSupportedLanguages();
if (supportedLanguages.length === 0) {
  throw new Error("No supported runtimes found. Install at least python3 or node on the runner server.");
}

console.log(`ace-runner online: ${supportedLanguages.join(", ")}`);
if (process.env.RUNNER_PROBE_ONLY === "1") {
  process.exit(0);
}

while (true) {
  try {
    const job = await claimJob();
    if (!job) {
      await sleep(pollMs);
      continue;
    }

    const result = await judge(job);
    await postResult(job.submission.id, result);
  } catch (error) {
    console.error(error instanceof Error ? error.stack || error.message : error);
    await sleep(pollMs);
  }
}

async function detectSupportedLanguages(): Promise<Language[]> {
  const results: Language[] = [];
  for (const [language, commands] of Object.entries(languageCommands) as Array<[Language, RuntimeCommand[]]>) {
    for (const command of commands) {
      const result = await run(command.probe[0], command.probe.slice(1), { timeoutMs: 2500 });
      if (result.status === "accepted") {
        runtimeCommands.set(language, command.run);
        results.push(language);
        break;
      }
    }
  }
  return results;
}

async function claimJob(): Promise<JudgeJob | undefined> {
  const response = await fetch(`${backendUrl}/api/internal/judge-jobs/next`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify({ languages: supportedLanguages })
  });
  if (response.status === 204) return undefined;
  if (!response.ok) throw new Error(`claim failed: ${response.status} ${await response.text()}`);
  return ((await response.json()) as { data: JudgeJob }).data;
}

async function postResult(submissionId: string, result: JudgeResult) {
  const response = await fetch(`${backendUrl}/api/internal/judge-results/${submissionId}`, {
    method: "POST",
    headers: requestHeaders(),
    body: JSON.stringify(result)
  });
  if (!response.ok) throw new Error(`result post failed: ${response.status} ${await response.text()}`);
}

async function judge(job: JudgeJob): Promise<JudgeResult> {
  const started = Date.now();
  const workdir = await mkdtemp(join(workRoot, `ace-runner-${job.submission.id}-`));
  try {
    switch (job.submission.language) {
      case "python":
        return await judgePython(job, workdir, started);
      case "javascript":
        return await judgeJavaScript(job, workdir, started);
      case "typescript":
        return await judgeTypeScript(job, workdir, started);
      case "sql":
        return await judgeSql(job, workdir, started);
      case "csharp":
        return await judgeCSharp(job, workdir, started);
      case "java":
        return await judgeJava(job, workdir, started);
    }
  } finally {
    await rm(workdir, { recursive: true, force: true });
  }
}

async function judgePython(job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  const sourcePath = join(workdir, "solution.py");
  const harnessPath = join(workdir, "harness.py");
  await writeFile(sourcePath, job.submission.sourceCode, "utf8");
  await writeFile(
    harnessPath,
    `import importlib.util, json, traceback
spec = importlib.util.spec_from_file_location("solution", "solution.py")
module = importlib.util.module_from_spec(spec)
try:
  spec.loader.exec_module(module)
except Exception:
  print(json.dumps({"status":"compile_error","stderr":traceback.format_exc(),"testcaseResults":[]}))
  raise SystemExit(0)
payload = json.loads(${JSON.stringify(JSON.stringify(toHarnessPayload(job)))})
fn = getattr(module, payload["entrypoint"], None)
if not callable(fn):
  print(json.dumps({"status":"runtime_error","stderr":"missing function " + payload["entrypoint"],"testcaseResults":[]}))
  raise SystemExit(0)
overall = "accepted"
results = []
for case in payload["testCases"]:
  status = "accepted"
  stderr = ""
  try:
    actual = fn(**case["inputJson"])
    if actual != case["expectedJson"]:
      status = "wrong_answer"
      stderr = "expected %s, got %s" % (json.dumps(case["expectedJson"]), json.dumps(actual))
  except Exception:
    status = "runtime_error"
    stderr = traceback.format_exc()
  if overall == "accepted" and status != "accepted":
    overall = status
  results.append({"testcaseId":case["id"],"status":status,"stderr":stderr[:1000],"durationMs":0})
print(json.dumps({"status":overall,"stdout":"","stderr":"","testcaseResults":results}))
`,
    "utf8"
  );
  const command = requiredRuntime("python");
  return normalizeHarnessResult(await run(command[0], [...command.slice(1), harnessPath], { cwd: workdir }), started);
}

async function judgeJavaScript(job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  const source = job.submission.sourceCode;
  return runNodeHarness(source, job, workdir, started);
}

async function judgeTypeScript(job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  const transpiled = ts.transpileModule(job.submission.sourceCode, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return runNodeHarness(transpiled, job, workdir, started);
}

async function runNodeHarness(source: string, job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  const harnessPath = join(workdir, "harness.cjs");
  await writeFile(
    harnessPath,
    `const vm = require("node:vm");
const payload = ${JSON.stringify(toHarnessPayload(job))};
const context = vm.createContext({ console });
let overall = "accepted";
const results = [];
try {
  vm.runInContext(${JSON.stringify(source)}, context, { timeout: 1000 });
  if (typeof context[payload.entrypoint] !== "function") {
    throw new Error("missing function " + payload.entrypoint);
  }
  for (const testCase of payload.testCases) {
    let status = "accepted";
    let stderr = "";
    try {
      context.__aceArgs = Object.values(testCase.inputJson);
      const actual = vm.runInContext(payload.entrypoint + "(...__aceArgs)", context, { timeout: payload.timeLimitMs });
      if (JSON.stringify(actual) !== JSON.stringify(testCase.expectedJson)) {
        status = "wrong_answer";
        stderr = "expected " + JSON.stringify(testCase.expectedJson) + ", got " + JSON.stringify(actual);
      }
    } catch (error) {
      status = error && error.code === "ERR_SCRIPT_EXECUTION_TIMEOUT" ? "time_limit_exceeded" : "runtime_error";
      stderr = error && error.stack || String(error);
    }
    if (overall === "accepted" && status !== "accepted") overall = status;
    results.push({ testcaseId: testCase.id, status, stderr: stderr.slice(0, 1000), durationMs: 0 });
  }
  console.log(JSON.stringify({ status: overall, stdout: "", stderr: "", testcaseResults: results }));
} catch (error) {
  console.log(JSON.stringify({ status: "runtime_error", stdout: "", stderr: error && error.stack || String(error), testcaseResults: [] }));
}
`,
    "utf8"
  );
  const command = requiredRuntime("javascript");
  return normalizeHarnessResult(await run(command[0], [...command.slice(1), harnessPath], { cwd: workdir }), started);
}

async function judgeSql(job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  await writeFile(join(workdir, "solution.sql"), job.submission.sourceCode, "utf8");
  const command = requiredRuntime("sql");
  const output = await run(command[0], [...command.slice(1), ":memory:", ".read solution.sql"], { cwd: workdir });
  return {
    status: output.status,
    stdout: output.stdout,
    stderr: output.stderr,
    durationMs: Date.now() - started,
    testcaseResults: job.testCases.map((testCase) => ({ testcaseId: testCase.id, status: output.status, durationMs: 0 }))
  };
}

async function judgeCSharp(job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  await writeFile(join(workdir, "Solution.cs"), job.submission.sourceCode, "utf8");
  await writeFile(
    join(workdir, "Program.cs"),
    `using System;
using System.Linq;
using System.Reflection;
using System.Text.Json;

public static class Program
{
  public static void Main()
  {
    var payload = JsonSerializer.Deserialize<Payload>(${JSON.stringify(JSON.stringify(toHarnessPayload(job)))})!;
    var solutionType = Type.GetType("Solution") ?? Assembly.GetExecutingAssembly().GetTypes().FirstOrDefault(type => type.Name == "Solution");
    if (solutionType is null)
    {
      Console.WriteLine(JsonSerializer.Serialize(new JudgeResultDto("runtime_error", "", "missing class Solution", Array.Empty<TestResultDto>())));
      return;
    }
    var method = solutionType.GetMethod(payload.entrypoint, BindingFlags.Public | BindingFlags.NonPublic | BindingFlags.Static | BindingFlags.Instance);
    if (method is null)
    {
      Console.WriteLine(JsonSerializer.Serialize(new JudgeResultDto("runtime_error", "", "missing method " + payload.entrypoint, Array.Empty<TestResultDto>())));
      return;
    }
    var instance = method.IsStatic ? null : Activator.CreateInstance(solutionType);
    var parameters = method.GetParameters();
    var overall = "accepted";
    var results = new List<TestResultDto>();
    foreach (var testCase in payload.testCases)
    {
      var status = "accepted";
      var stderr = "";
      try
      {
        var args = parameters.Select(parameter =>
        {
          if (!testCase.inputJson.TryGetProperty(parameter.Name!, out var value)) throw new Exception("missing argument " + parameter.Name);
          return value.Deserialize(parameter.ParameterType, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
        }).ToArray();
        var actual = method.Invoke(instance, args);
        var actualJson = JsonSerializer.Serialize(actual);
        var expectedJson = testCase.expectedJson.GetRawText();
        if (actualJson != expectedJson)
        {
          status = "wrong_answer";
          stderr = "expected " + expectedJson + ", got " + actualJson;
        }
      }
      catch (TargetInvocationException error)
      {
        status = "runtime_error";
        stderr = error.InnerException?.ToString() ?? error.ToString();
      }
      catch (Exception error)
      {
        status = "runtime_error";
        stderr = error.ToString();
      }
      if (overall == "accepted" && status != "accepted") overall = status;
      results.Add(new TestResultDto(testCase.id, status, stderr.Length > 1000 ? stderr[..1000] : stderr, 0));
    }
    Console.WriteLine(JsonSerializer.Serialize(new JudgeResultDto(overall, "", "", results)));
  }
}

record Payload(string entrypoint, int timeLimitMs, TestCaseDto[] testCases);
record TestCaseDto(string id, JsonElement inputJson, JsonElement expectedJson);
record TestResultDto(string testcaseId, string status, string stderr, int durationMs);
record JudgeResultDto(string status, string stdout, string stderr, IEnumerable<TestResultDto> testcaseResults);
`,
    "utf8"
  );
  await writeFile(
    join(workdir, "AceSubmission.csproj"),
    `<Project Sdk="Microsoft.NET.Sdk">
  <PropertyGroup>
    <OutputType>Exe</OutputType>
    <TargetFramework>net8.0</TargetFramework>
    <ImplicitUsings>enable</ImplicitUsings>
    <Nullable>enable</Nullable>
  </PropertyGroup>
</Project>
`,
    "utf8"
  );
  const command = requiredRuntime("csharp");
  const csharpBuildTimeoutMs = Math.max(commandTimeoutMs * 6, 90000);
  const build = await run(command[0], [...command.slice(1), "build", "--nologo", "--property:UseSharedCompilation=false", workdir], {
    cwd: workdir,
    timeoutMs: csharpBuildTimeoutMs
  });
  if (build.status !== "accepted") return { ...build, status: "compile_error", durationMs: Date.now() - started, testcaseResults: [] };
  return normalizeHarnessResult(
    await run(command[0], [...command.slice(1), "run", "--no-build", "--no-restore", "--project", workdir], { cwd: workdir }),
    started
  );
}

async function judgeJava(job: JudgeJob, workdir: string, started: number): Promise<JudgeResult> {
  await writeFile(join(workdir, "Solution.java"), job.submission.sourceCode, "utf8");
  const payload = toHarnessPayload(job);
  await writeFile(join(workdir, "Main.java"), javaHarnessSource(payload), "utf8");
  const command = requiredRuntime("java");
  const compile = await run(command[0], [...command.slice(1), "Solution.java", "Main.java"], { cwd: workdir });
  if (compile.status !== "accepted") return { ...compile, status: "compile_error", durationMs: Date.now() - started, testcaseResults: [] };
  return normalizeHarnessResult(await run("java", ["Main"], { cwd: workdir }), started);
}

function normalizeHarnessResult(output: ProcessOutput, started: number): JudgeResult {
  if (output.status !== "accepted") return { ...output, durationMs: Date.now() - started, testcaseResults: [] };
  try {
    const parsed = JSON.parse(extractLastJsonObject(output.stdout)) as JudgeResult;
    return {
      status: parsed.status,
      stdout: parsed.stdout || "",
      stderr: [parsed.stderr, output.stderr].filter(Boolean).join("\n").slice(0, maxBytes),
      durationMs: Date.now() - started,
      testcaseResults: parsed.testcaseResults || []
    };
  } catch {
    return { status: "system_error", stdout: output.stdout, stderr: "Runner returned invalid JSON", durationMs: Date.now() - started, testcaseResults: [] };
  }
}

function extractLastJsonObject(stdout: string) {
  const trimmed = stdout.trim();
  const lastClose = trimmed.lastIndexOf("}");
  if (lastClose === -1) return trimmed;
  for (let index = lastClose; index >= 0; index -= 1) {
    if (trimmed[index] !== "{") continue;
    const candidate = trimmed.slice(index, lastClose + 1);
    try {
      JSON.parse(candidate);
      return candidate;
    } catch {
      // Keep searching for the start of the last complete JSON object.
    }
  }
  return trimmed;
}

function javaHarnessSource(payload: ReturnType<typeof toHarnessPayload>) {
  const cases = payload.testCases.map((testCase) => {
    const input = testCase.inputJson as Record<string, unknown>;
    const args = Object.values(input).map(javaLiteral).join(", ");
    return `runCase(${JSON.stringify(testCase.id)}, () -> solution.${payload.entrypoint}(${args}), ${javaLiteral(testCase.expectedJson)});`;
  }).join("\n      ");

  return `import java.util.*;
import java.util.function.*;

public class Main {
  static Solution solution = new Solution();
  static String overall = "accepted";
  static List<String> results = new ArrayList<>();

  public static void main(String[] args) {
    try {
      ${cases}
      System.out.println("{\\"status\\":\\"" + overall + "\\",\\"stdout\\":\\"\\",\\"stderr\\":\\"\\",\\"testcaseResults\\":[" + String.join(",", results) + "]}");
    } catch (Throwable error) {
      String stderr = escape(error.toString());
      System.out.println("{\\"status\\":\\"runtime_error\\",\\"stdout\\":\\"\\",\\"stderr\\":\\"" + stderr + "\\",\\"testcaseResults\\":[]}");
    }
  }

  static void runCase(String id, Supplier<Object> call, Object expected) {
    String status = "accepted";
    String stderr = "";
    try {
      Object actual = call.get();
      if (!deepEquals(actual, expected)) {
        status = "wrong_answer";
        stderr = "expected " + display(expected) + ", got " + display(actual);
      }
    } catch (Throwable error) {
      status = "runtime_error";
      stderr = error.toString();
    }
    if (overall.equals("accepted") && !status.equals("accepted")) overall = status;
    results.add("{\\"testcaseId\\":\\"" + escape(id) + "\\",\\"status\\":\\"" + status + "\\",\\"stderr\\":\\"" + escape(stderr) + "\\",\\"durationMs\\":0}");
  }

  static boolean deepEquals(Object actual, Object expected) {
    if (actual instanceof int[] a && expected instanceof int[] e) return Arrays.equals(a, e);
    if (actual instanceof long[] a && expected instanceof long[] e) return Arrays.equals(a, e);
    if (actual instanceof String[] a && expected instanceof String[] e) return Arrays.equals(a, e);
    return Objects.equals(actual, expected);
  }

  static String display(Object value) {
    if (value instanceof int[] items) return Arrays.toString(items);
    if (value instanceof long[] items) return Arrays.toString(items);
    if (value instanceof String[] items) return Arrays.toString(items);
    return String.valueOf(value);
  }

  static String escape(String value) {
    return value.replace("\\\\", "\\\\\\\\").replace("\\"", "\\\\\\"").replace("\\n", "\\\\n").replace("\\r", "\\\\r");
  }
}
`;
}

function javaLiteral(value: unknown): string {
  if (Array.isArray(value)) {
    if (value.every((item) => Number.isInteger(item))) return `new int[] { ${value.join(", ")} }`;
    if (value.every((item) => typeof item === "string")) return `new String[] { ${value.map((item) => JSON.stringify(item)).join(", ")} }`;
  }
  if (typeof value === "string") return JSON.stringify(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  throw new Error(`Unsupported Java testcase value: ${JSON.stringify(value)}`);
}

function simpleProcessResult(output: ProcessOutput, testCases: TestCase[], started: number): JudgeResult {
  return {
    status: output.status,
    stdout: output.stdout,
    stderr: output.stderr,
    durationMs: Date.now() - started,
    testcaseResults: testCases.map((testCase) => ({ testcaseId: testCase.id, status: output.status, durationMs: 0 }))
  };
}

function toHarnessPayload(job: JudgeJob) {
  const config = job.problem.configJson as Record<string, unknown>;
  const entrypoint = (config.entrypoint as Partial<Record<Language, string>> | undefined)?.[job.submission.language]
    || (config.functionName as string | undefined)
    || "solution";
  return {
    entrypoint,
    timeLimitMs: Number(config.timeLimitMs || 5000),
    testCases: job.testCases
  };
}

interface ProcessOutput {
  status: SubmissionStatus;
  stdout: string;
  stderr: string;
}

function run(command: string, args: string[], options: { cwd?: string; timeoutMs?: number } = {}): Promise<ProcessOutput> {
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: childEnv(),
      stdio: ["ignore", "pipe", "pipe"],
      windowsHide: true,
      detached: process.platform !== "win32"
    });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => killProcessTree(child.pid), options.timeoutMs || commandTimeoutMs);
    child.stdout.on("data", (chunk) => {
      stdout = (stdout + chunk).slice(0, maxBytes);
    });
    child.stderr.on("data", (chunk) => {
      stderr = (stderr + chunk).slice(0, maxBytes);
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      resolve({ status: "system_error", stdout, stderr: error.message });
    });
    child.on("close", (code, signal) => {
      clearTimeout(timer);
      resolve({
        status: signal === "SIGKILL" ? "time_limit_exceeded" : code === 0 ? "accepted" : "runtime_error",
        stdout,
        stderr
      });
    });
  });
}

function killProcessTree(pid: number | undefined) {
  if (!pid) return;
  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", String(pid), "/f", "/t"], { windowsHide: true });
    } else {
      process.kill(-pid, "SIGKILL");
    }
  } catch {
    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // The process may have exited between the timeout and the kill attempt.
    }
  }
}

function requiredRuntime(language: Language) {
  const command = runtimeCommands.get(language);
  if (!command) throw new Error(`No runtime detected for ${language}`);
  return command;
}

function childEnv() {
  return {
    PATH: process.env.PATH || "",
    SystemRoot: process.env.SystemRoot || "",
    WINDIR: process.env.WINDIR || "",
    TEMP: process.env.TEMP || "",
    TMP: process.env.TMP || "",
    HOME: process.env.HOME || ""
  };
}

function requestHeaders() {
  return {
    "content-type": "application/json",
    ...(runnerToken ? { authorization: `Bearer ${runnerToken}` } : {})
  };
}

function requiredEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
