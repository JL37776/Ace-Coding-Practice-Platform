import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { JudgeResult, Question, Submission, TrainingSuite, User } from "@ace/shared";
import { createJudgeProvider } from "./judge/index.js";
import { store } from "./store.js";

const createSubmissionSchema = z.object({
  problemId: z.string().min(1),
  language: z.enum(["python", "typescript", "javascript", "sql", "csharp", "java"]),
  sourceCode: z.string().min(1).max(20000)
});

const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1)
});

const registerSchema = z.object({
  username: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(80)
});

const createSuiteSchema = z.object({
  scope: z.enum(["public", "personal"]).default("personal"),
  topicId: z.string().min(1),
  title: z.string().min(1).max(160),
  description: z.string().max(1000),
  questionCount: z.number().int().min(0),
  durationMinutes: z.number().int().min(1).max(240),
  allowedTypes: z.array(z.enum(["single", "multiple", "boolean", "blank", "coding"])).min(1)
});

const createQuestionSchema = z.object({
  scope: z.enum(["public", "personal"]).default("personal"),
  suiteId: z.string().min(1),
  type: z.enum(["single", "multiple", "boolean", "blank", "coding"]),
  title: z.string().min(1).max(300),
  description: z.string().optional(),
  difficulty: z.enum(["easy", "medium", "hard"]),
  tags: z.array(z.string()).default([]),
  media: z.array(z.object({ type: z.enum(["image", "audio", "video", "file"]), url: z.string() })).default([]),
  options: z.array(z.object({ id: z.string(), text: z.string() })).optional(),
  answer: z.unknown().optional(),
  explanation: z.string().optional(),
  problemId: z.string().optional(),
  metadata: z.record(z.unknown()).default({})
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

  router.post("/auth/login", (req, res, next) => {
    try {
      const payload = loginSchema.parse(req.body);
      const user = store.findUser(payload.username);
      if (!user || user.password !== payload.password) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      const { password: _password, ...safeUser } = user;
      const token = randomUUID();
      store.createSession(token, safeUser);
      res.json({ data: { token, user: safeUser } });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/register", (req, res, next) => {
    try {
      const payload = registerSchema.parse(req.body);
      if (store.findUser(payload.username)) {
        return res.status(409).json({ error: "User already exists" });
      }
      const user = store.createUser({
        id: randomUUID(),
        username: payload.username,
        password: payload.password,
        displayName: payload.displayName,
        role: "member"
      });
      const { password: _password, ...safeUser } = user;
      const token = randomUUID();
      store.createSession(token, safeUser);
      res.status(201).json({ data: { token, user: safeUser } });
    } catch (error) {
      next(error);
    }
  });

  router.get("/auth/me", requireUser, (req, res) => {
    res.json({ data: req.user });
  });

  router.get("/settings", requireUser, (_req, res) => {
    res.json({ data: store.getSystemSettings() });
  });

  router.get("/topics", requireUser, (_req, res) => {
    res.json({ data: store.listTopics(_req.user!) });
  });

  router.get("/suites", requireUser, (req, res) => {
    const scope = req.query.scope === "public" || req.query.scope === "personal" ? req.query.scope : undefined;
    res.json({ data: store.listSuites(req.user!, typeof req.query.topicId === "string" ? req.query.topicId : undefined, scope) });
  });

  router.post("/suites", requireUser, (req, res, next) => {
    try {
      const payload = createSuiteSchema.parse(req.body);
      if (payload.scope === "public" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create public suites" });
      }
      const suite: TrainingSuite = {
        id: randomUUID(),
        ...payload,
        ownerUserId: payload.scope === "personal" ? req.user!.id : undefined,
        scorePercent: 0,
        done: 0,
        total: payload.questionCount
      };
      res.status(201).json({ data: store.createSuite(suite) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/questions", requireUser, (req, res) => {
    const scope = req.query.scope === "public" || req.query.scope === "personal" ? req.query.scope : undefined;
    res.json({ data: store.listQuestions(req.user!, typeof req.query.suiteId === "string" ? req.query.suiteId : undefined, scope) });
  });

  router.post("/questions", requireUser, (req, res, next) => {
    try {
      const payload = createQuestionSchema.parse(req.body);
      if (payload.scope === "public" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create public questions" });
      }
      const question: Question = {
        id: randomUUID(),
        ownerUserId: payload.scope === "personal" ? req.user!.id : undefined,
        ...payload
      };
      res.status(201).json({ data: store.createQuestion(question) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/problems", requireUser, (req, res) => {
    res.json({ data: store.listProblems(req.user) });
  });

  router.get("/problems/:id", requireUser, (req, res) => {
    const problem = store.getProblem(req.params.id, req.user);
    if (!problem) return res.status(404).json({ error: "Problem not found" });
    res.json({ data: problem });
  });

  router.get("/submissions", requireUser, (req, res) => {
    res.json({ data: store.listSubmissions(req.user!) });
  });

  router.get("/submissions/:id", requireUser, (req, res) => {
    const submission = store.getSubmission(req.params.id, req.user);
    if (!submission) return res.status(404).json({ error: "Submission not found" });
    res.json({ data: submission });
  });

  router.post("/internal/judge-jobs/next", (req, res) => {
    if (!isRunnerAuthorized(req.headers.authorization)) {
      return res.status(401).json({ error: "Unauthorized runner" });
    }

    const languages = z.array(createSubmissionSchema.shape.language).optional().parse(req.body?.languages);
    const submission = store.claimNextQueuedSubmission(languages);
    if (!submission) return res.status(204).send();

    const problem = store.getProblem(submission.problemId);
    if (!problem) return res.status(404).json({ error: "Problem not found" });

    res.json({
      data: {
        submission,
        problem,
        testCases: store.listTestCases(problem.id)
      }
    });
  });

  router.post("/submissions", requireUser, async (req, res, next) => {
    try {
      const payload = createSubmissionSchema.parse(req.body);
      const problem = store.getProblem(payload.problemId, req.user);
      if (!problem) return res.status(404).json({ error: "Problem not found" });

      const now = new Date().toISOString();
      const submission: Submission = {
        id: randomUUID(),
        userId: req.user!.id,
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
      if (!isRunnerAuthorized(req.headers.authorization)) {
        return res.status(401).json({ error: "Unauthorized runner" });
      }
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

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? store.getSession(token) : undefined;
  if (!user) return res.status(401).json({ error: "Login required" });
  req.user = user;
  next();
}

function requireAdmin(req: Request, res: Response, next: NextFunction) {
  requireUser(req, res, () => {
    if (req.user?.role !== "admin") return res.status(403).json({ error: "Admin required" });
    next();
  });
}

function isRunnerAuthorized(authorization: string | undefined) {
  const token = process.env.RUNNER_SHARED_TOKEN || "";
  if (!token) return true;
  return authorization === `Bearer ${token}`;
}
