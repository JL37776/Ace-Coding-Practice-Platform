import { randomUUID } from "node:crypto";
import { Router, type Request, type Response, type NextFunction } from "express";
import { z } from "zod";
import type { BankScope, JudgeResult, Question, QuestionType, Submission, TopicNode, TrainingSuite, User } from "@ace/shared";
import * as authStore from "./auth-store.js";
import { config } from "./config.js";
import { createJudgeProvider } from "./judge/index.js";
import { store } from "./store.js";
import * as studyStore from "./study-store.js";

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
  allowedTypes: z.array(z.enum(["single", "multiple", "boolean", "blank", "coding"])).min(1),
  feedbackMode: z.enum(["instant", "final"]).default("instant")
});

const updateSuiteSchema = z.object({
  title: z.string().min(1).max(160).optional(),
  description: z.string().max(1000).optional(),
  durationMinutes: z.number().int().min(1).max(240).optional(),
  allowedTypes: z.array(z.enum(["single", "multiple", "boolean", "blank", "coding"])).min(1).optional(),
  feedbackMode: z.enum(["instant", "final"]).optional()
});

const createTopicSchema = z.object({
  scope: z.enum(["public", "personal"]).default("personal"),
  parentId: z.string().optional(),
  name: z.string().min(1).max(120)
});

const moveTopicSchema = z.object({
  parentId: z.string().min(1).nullable().optional()
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

const topicRawSchema = z.object({
  scope: z.enum(["public", "personal"]).default("personal"),
  topicId: z.string().min(1),
  suiteId: z.string().min(1).optional(),
  raw: z.string().min(1).max(50000)
});

const saveProgressSchema = z.object({
  questionIndex: z.number().int().min(0),
  answers: z.record(z.unknown())
});

const completeStudySchema = z.object({
  mode: z.enum(["practice", "exam"]),
  questionIds: z.array(z.string().min(1)).min(1),
  questionCount: z.number().int().min(1)
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

  router.post("/auth/login", async (req, res, next) => {
    try {
      const payload = loginSchema.parse(req.body);
      const session = await authStore.login(payload.username, payload.password);
      if (!session) {
        return res.status(401).json({ error: "Invalid username or password" });
      }
      res.json({ data: session });
    } catch (error) {
      next(error);
    }
  });

  router.post("/auth/register", async (req, res, next) => {
    try {
      const payload = registerSchema.parse(req.body);
      if (await authStore.findUserByUsername(payload.username)) {
        return res.status(409).json({ error: "User already exists" });
      }
      const session = await authStore.register({
        username: payload.username,
        password: payload.password,
        displayName: payload.displayName
      });
      res.status(201).json({ data: session });
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

  router.get("/study/dashboard", requireUser, async (req, res, next) => {
    try {
      const suiteId = typeof req.query.suiteId === "string" ? req.query.suiteId : undefined;
      res.json({ data: await studyStore.getDashboard(req.user!.id, suiteId) });
    } catch (error) {
      next(error);
    }
  });

  router.put("/study/progress/:suiteId", requireUser, async (req, res, next) => {
    try {
      const suite = store.getSuite(req.params.suiteId, req.user!);
      if (!suite) return res.status(404).json({ error: "Suite not found" });
      const payload = saveProgressSchema.parse(req.body);
      const progress = await studyStore.saveProgress(req.user!.id, {
        suiteId: suite.id,
        questionIndex: payload.questionIndex,
        answers: payload.answers
      });
      res.json({ data: progress });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/study/progress/:suiteId", requireUser, async (req, res, next) => {
    try {
      await studyStore.clearProgress(req.user!.id, req.params.suiteId);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.post("/study/complete/:suiteId", requireUser, async (req, res, next) => {
    try {
      const suite = store.getSuite(req.params.suiteId, req.user!);
      if (!suite) return res.status(404).json({ error: "Suite not found" });
      const payload = completeStudySchema.parse(req.body);
      const uniqueQuestionIds = Array.from(new Set(payload.questionIds));
      if (payload.mode === "exam" && uniqueQuestionIds.length < payload.questionCount) {
        return res.status(400).json({ error: "Exam mode requires all questions answered before recording." });
      }
      await studyStore.recordActivity(req.user!.id, { suiteId: suite.id, questionIds: uniqueQuestionIds });
      if (payload.mode === "exam") await studyStore.clearProgress(req.user!.id, suite.id);
      res.json({ data: await studyStore.getDashboard(req.user!.id, suite.id) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/topics", requireUser, (_req, res) => {
    res.json({ data: store.listTopics(_req.user!) });
  });

  router.post("/topics", requireUser, async (req, res, next) => {
    try {
      const payload = createTopicSchema.parse(req.body);
      if (payload.scope === "public" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Only admins can create public topics" });
      }
      const topic: TopicNode = {
        id: randomUUID(),
        scope: payload.scope,
        ownerUserId: payload.scope === "personal" ? req.user!.id : undefined,
        parentId: payload.parentId,
        name: payload.name,
        scorePercent: 0,
        done: 0,
        total: 0
      };
      res.status(201).json({ data: await store.createTopic(topic) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/topics/:id", requireUser, async (req, res, next) => {
    try {
      await store.deleteTopic(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/topics/:id/move", requireUser, async (req, res, next) => {
    try {
      const payload = moveTopicSchema.parse(req.body);
      res.json({ data: await store.moveTopic(req.params.id, payload.parentId || undefined, req.user!) });
    } catch (error) {
      next(error);
    }
  });

  router.get("/suites", requireUser, (req, res) => {
    const scope = req.query.scope === "public" || req.query.scope === "personal" ? req.query.scope : undefined;
    res.json({ data: store.listSuites(req.user!, typeof req.query.topicId === "string" ? req.query.topicId : undefined, scope) });
  });

  router.post("/suites", requireUser, async (req, res, next) => {
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
      res.status(201).json({ data: await store.createSuite(suite) });
    } catch (error) {
      next(error);
    }
  });

  router.delete("/suites/:id", requireUser, async (req, res, next) => {
    try {
      await store.deleteSuite(req.params.id, req.user!);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  });

  router.patch("/suites/:id", requireUser, async (req, res, next) => {
    try {
      const payload = updateSuiteSchema.parse(req.body);
      const updated = await store.updateSuite(req.params.id, payload, req.user!);
      res.json({ data: updated });
    } catch (error) {
      next(error);
    }
  });

  router.get("/questions", requireUser, (req, res) => {
    const scope = req.query.scope === "public" || req.query.scope === "personal" ? req.query.scope : undefined;
    res.json({ data: store.listQuestions(req.user!, typeof req.query.suiteId === "string" ? req.query.suiteId : undefined, scope) });
  });

  router.post("/questions", requireUser, async (req, res, next) => {
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
      res.status(201).json({ data: await store.createQuestion(question) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/topic-raw/parse", requireUser, (req, res, next) => {
    try {
      const payload = topicRawSchema.parse(req.body);
      res.json({ data: parseTopicRaw(payload.raw, payload.scope, payload.topicId, req.user!) });
    } catch (error) {
      next(error);
    }
  });

  router.post("/topic-raw/import", requireUser, async (req, res, next) => {
    try {
      const payload = topicRawSchema.parse(req.body);
      if (payload.scope === "public" && req.user?.role !== "admin") {
        return res.status(403).json({ error: "Only admins can import public question banks" });
      }
      const parsed = parseTopicRaw(payload.raw, payload.scope, payload.topicId, req.user!);
      if (payload.suiteId) {
        const overwritten = await store.replaceSuiteContents(payload.suiteId, parsed.suite, parsed.questions, req.user!);
        return res.json({ data: overwritten });
      }
      const suite = await store.createSuite(parsed.suite);
      const importedQuestions = [];
      for (const question of parsed.questions) {
        importedQuestions.push(await store.createQuestion({ ...question, suiteId: suite.id }));
      }
      res.status(201).json({ data: { suite, questions: importedQuestions } });
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
      if (req.user?.role !== "admin") {
        return res.status(403).json({ error: "Code runner access is limited to admin accounts." });
      }
      const payload = createSubmissionSchema.parse(req.body);
      const problem = store.getProblem(payload.problemId, req.user);
      if (!problem) return res.status(404).json({ error: "Problem not found" });
      const testCases = store.listTestCases(problem.id);
      if (!testCases.length) {
        return res.status(422).json({ error: "Runner tests are not configured for this coding problem yet." });
      }

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

      if (config.judgeProvider === "remote-runner") {
        return res.status(202).json({ data: submission });
      }

      queueMicrotask(async () => {
        const running = { ...submission, status: "running" as const, updatedAt: new Date().toISOString() };
        store.saveSubmission(running);
        try {
          const result = await judgeProvider.enqueue({
            submission: running,
            testCases
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

async function requireUser(req: Request, res: Response, next: NextFunction) {
  const token = req.headers.authorization?.replace(/^Bearer\s+/i, "");
  const user = token ? await authStore.getSession(token) : undefined;
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

function parseTopicRaw(raw: string, scope: BankScope, topicId: string, user: User) {
  const blocks = raw
    .split(/\n(?=@(?:suite|outline|doc|q)\b)/i)
    .map((block) => block.trim())
    .filter(Boolean);
  const suiteBlock = blocks.find((block) => block.toLowerCase().startsWith("@suite"));
  const outlineBlock = blocks.find((block) => /^@(?:outline|doc)\b/i.test(block));
  const questionBlocks = blocks.filter((block) => block.toLowerCase().startsWith("@q"));
  const suiteFields = parseFields(suiteBlock || "");
  const outlineMarkdown = parseMarkdownBlock(outlineBlock);
  const questions = questionBlocks.map((block) => questionFromFields(parseFields(block), scope, user));
  const allowedTypes = Array.from(new Set(questions.map((question) => question.type))) as QuestionType[];
  const durationMinutes = Number(suiteFields.duration || 15);
  if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
    throw new Error("Suite duration must be an integer from 1 to 240 minutes");
  }
  const suite: TrainingSuite = {
    id: randomUUID(),
    scope,
    ownerUserId: scope === "personal" ? user.id : undefined,
    topicId,
    title: suiteFields.title || "Imported Topic Raw Suite",
    description: suiteFields.description || "Imported from Paste Topic Raw.",
    questionCount: questions.length,
    durationMinutes,
    scorePercent: 0,
    done: 0,
    total: questions.length,
    allowedTypes: allowedTypes.length ? allowedTypes : ["single"],
    feedbackMode: suiteFields.feedbackMode === "final" ? "final" : "instant",
    metadata: outlineMarkdown ? { outlineMarkdown } : {}
  };
  return { suite, questions };
}

function parseMarkdownBlock(block?: string) {
  if (!block) return "";
  return block
    .split(/\r?\n/)
    .slice(1)
    .join("\n")
    .trim();
}

function parseFields(block: string) {
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("@")) continue;
    const index = trimmed.indexOf("=");
    if (index === -1) continue;
    fields[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return fields;
}

function questionFromFields(fields: Record<string, string>, scope: BankScope, user: User): Question {
  const type = normalizeQuestionType(fields.type);
  const options = ["A", "B", "C", "D", "E", "F"]
    .filter((id) => fields[id])
    .map((id) => ({ id, text: fields[id] }));
  const code = fields.code ? fields.code.replace(/\\n/g, "\n") : undefined;
  return {
    id: randomUUID(),
    scope,
    ownerUserId: scope === "personal" ? user.id : undefined,
    suiteId: "",
    type,
    title: fields.title || fields.prompt || "Untitled question",
    description: fields.description || "",
    difficulty: fields.difficulty === "medium" || fields.difficulty === "hard" ? fields.difficulty : "easy",
    tags: fields.tags ? fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    media: [],
    options: options.length ? options : undefined,
    answer: parseAnswer(fields.answer || fields.ans, type),
    explanation: fields.explanation || "",
    problemId: fields.problemId,
    metadata: code ? { code, codeLanguage: fields.codeLang || fields.language || "text" } : {}
  };
}

function normalizeQuestionType(value = "single"): QuestionType {
  if (value === "multiple" || value === "boolean" || value === "blank" || value === "coding") return value;
  return "single";
}

function parseAnswer(value: string | undefined, type: QuestionType) {
  if (!value) return undefined;
  if (type === "multiple") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (type === "boolean") return value.toLowerCase() === "true";
  return value;
}
