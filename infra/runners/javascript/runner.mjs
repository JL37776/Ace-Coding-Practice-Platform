import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import vm from "node:vm";

const payloadPath = process.env.JUDGE_PAYLOAD_PATH || "/workspace/payload.json";
const started = Date.now();

try {
  const payload = JSON.parse(await readPayload());
  const result = await judge(payload);
  process.stdout.write(JSON.stringify(result));
} catch (error) {
  process.stdout.write(
    JSON.stringify({
      status: "system_error",
      stdout: "",
      stderr: error instanceof Error ? error.stack || error.message : "Judge failed",
      durationMs: Date.now() - started,
      testcaseResults: []
    })
  );
}

async function readPayload() {
  if (existsSync(payloadPath)) {
    return readFile(payloadPath, "utf8");
  }

  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
}

async function judge(payload) {
  const { submission, problem, testCases } = payload;
  const config = problem.configJson || {};
  const entrypoint = config.entrypoint?.javascript || config.functionName || "solution";
  const context = vm.createContext({ console });

  try {
    vm.runInContext(submission.sourceCode, context, { filename: "submission.js", timeout: 1000 });
  } catch (error) {
    return {
      status: "compile_error",
      stdout: "",
      stderr: error instanceof Error ? error.stack || error.message : "Compile failed",
      durationMs: Date.now() - started,
      testcaseResults: []
    };
  }

  if (typeof context[entrypoint] !== "function") {
    return {
      status: "runtime_error",
      stdout: "",
      stderr: `Expected a callable function named ${entrypoint}`,
      durationMs: Date.now() - started,
      testcaseResults: []
    };
  }

  let status = "accepted";
  const testcaseResults = [];
  for (const testCase of testCases) {
    const caseStarted = Date.now();
    const caseResult = runCase(context, entrypoint, testCase, config);
    if (caseResult.status !== "accepted" && status === "accepted") {
      status = caseResult.status;
    }
    testcaseResults.push({
      testcaseId: testCase.id,
      ...caseResult,
      durationMs: Date.now() - caseStarted
    });
  }

  return {
    status,
    stdout: "",
    stderr: "",
    durationMs: Date.now() - started,
    testcaseResults
  };
}

function runCase(context, entrypoint, testCase, config) {
  try {
    context.__aceArgs = Object.values(testCase.inputJson);
    const actual = vm.runInContext(`${entrypoint}(...__aceArgs)`, context, {
      timeout: Number(config.timeLimitMs || 5000)
    });
    delete context.__aceArgs;

    if (JSON.stringify(actual) !== JSON.stringify(testCase.expectedJson)) {
      return {
        status: "wrong_answer",
        stderr: `expected ${JSON.stringify(testCase.expectedJson)}, got ${JSON.stringify(actual)}`
      };
    }
    return { status: "accepted" };
  } catch (error) {
    return {
      status: error?.code === "ERR_SCRIPT_EXECUTION_TIMEOUT" ? "time_limit_exceeded" : "runtime_error",
      stderr: error instanceof Error ? error.stack || error.message : "Runtime failed"
    };
  }
}
