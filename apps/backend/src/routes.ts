import { randomUUID } from "node:crypto";
import { Router } from "express";
import { z } from "zod";
import type { JudgeResult, Submission } from "@ace/shared";
import { createJudgeProvider } from "./judge/index.js";
import { store } from "./store.js";

const createSubmissionSchema = z.object({
  problemId: z.string().min(1),
  language: z.enum(["python", "javascript"]),
  sourceCode: z.string().min(1).max(20000)
});

const judgeResultSchema = z.object({
  status: z.enum([
    "queued",
    "running",
    "accepted",
    "wrong_answer",
    "compile_error",
    "runtime_error",
    "time_limit_exceeded",
    "memory_limit_exceeded",
    "system_error"
  ]),
  stdout: z.string(),
  stderr: z.string(),
  durationMs: z.number(),
  testcaseResults: z.array(
    z.object({
      testcaseId: z.string(),
      status: z.enum([
        "queued",
        "running",
        "accepted",
        "wrong_answer",
        "compile_error",
        "runtime_error",
        "time_limit_exceeded",
        "memory_limit_exceeded",
        "system_error"
      ]),
      stdout: z.string().optional(),
      stderr: z.string().optional(),
      durationMs: z.number().optional()
    })
  )
});

export function createApiRouter() {
  const router = Router();
  const judgeProvider = createJudgeProvider();

  router.get("/health", (_req, res) => {
    res.json({ data: { ok: true, service: "ace-backend" } });
  });

  router.get("/problems", (_req, res) => {
    res.json({ data: store.listProblems() });
  });

  router.get("/problems/:id", (req, res) => {
    const problem = store.getProblem(req.params.id);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json({ data: problem });
  });

  router.get("/submissions", (_req, res) => {
    res.json({ data: store.listSubmissions() });
  });

  router.get("/submissions/:id", (req, res) => {
    const submission = store.getSubmission(req.params.id);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    res.json({ data: submission });
  });

  router.post("/submissions", async (req, res, next) => {
    try {
      const payload = createSubmissionSchema.parse(req.body);
      const problem = store.getProblem(payload.problemId);
      if (!problem) return res.status(404).json({ error: "Problem not found" });

      const now = new Date().toISOString();
      const submission: Submission = {
        id: randomUUID(),
        problemId: problem.id,
        language: payload.language,
        sourceCode: payload.sourceCode,
        status: "queued",
        createdAt: now,
        updatedAt: now
      };
      store.saveSubmission(submission);

      queueMicrotask(async () => {
        const running = { ...submission, status: "running" as const, updatedAt: new Date().toISOString() };
        store.saveSubmission(running);
        try {
          const result = await judgeProvider.enqueue({
            submission: running,
            testCases: store.listTestCases(problem.id)
          });
          store.saveSubmission({
            ...running,
            status: result.status,
            result,
            updatedAt: new Date().toISOString()
          });
        } catch (error) {
          store.saveSubmission({
            ...running,
            status: "system_error",
            result: {
              status: "system_error",
              stdout: "",
              stderr: error instanceof Error ? error.message : "Judge failed",
              durationMs: 0,
              testcaseResults: []
            },
            updatedAt: new Date().toISOString()
          });
        }
      });

      res.status(202).json({ data: submission });
    } catch (error) {
      next(error);
    }
  });

  router.post("/internal/judge-results/:id", (req, res, next) => {
    try {
      const submission = store.getSubmission(req.params.id);
      if (!submission) return res.status(404).json({ error: "Submission not found" });

      const result = judgeResultSchema.parse(req.body) as JudgeResult;
      store.saveSubmission({
        ...submission,
        status: result.status,
        result,
        updatedAt: new Date().toISOString()
      });
      res.json({ data: { ok: true } });
    } catch (error) {
      next(error);
    }
  });

  return router;
}
