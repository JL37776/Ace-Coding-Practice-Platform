import type { BankScope, Language, Question, Submission, TopicNode, TrainingSuite, User } from "@ace/shared";
import mysql from "mysql2/promise";
import { config } from "./config.js";
import { problems, questions as seedQuestions, suites as seedSuites, systemSettings, testCases, topics as seedTopics } from "./data/seed.js";

const submissions = new Map<string, Submission>();
let topics: TopicNode[] = [];
let suites: TrainingSuite[] = [];
let questions: Question[] = [];
let pool: mysql.Pool | undefined;

export async function initQuestionBankStore() {
  pool = mysql.createPool({
    host: config.mysql.host,
    port: config.mysql.port,
    database: config.mysql.database,
    user: config.mysql.user,
    password: config.mysql.password,
    waitForConnections: true,
    connectionLimit: 5,
    namedPlaceholders: true
  });

  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ace_topics (
      id VARCHAR(128) PRIMARY KEY,
      scope ENUM('public', 'personal') NOT NULL,
      owner_user_id VARCHAR(64) NULL,
      name VARCHAR(255) NOT NULL,
      parent_id VARCHAR(128) NULL,
      score_percent INT NOT NULL DEFAULT 0,
      done INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ace_topics_parent_id (parent_id),
      INDEX idx_ace_topics_scope (scope)
    )
  `);

  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ace_suites (
      id VARCHAR(128) PRIMARY KEY,
      scope ENUM('public', 'personal') NOT NULL,
      owner_user_id VARCHAR(64) NULL,
      topic_id VARCHAR(128) NOT NULL,
      title VARCHAR(255) NOT NULL,
      description TEXT NOT NULL,
      question_count INT NOT NULL DEFAULT 0,
      duration_minutes INT NOT NULL DEFAULT 15,
      score_percent INT NOT NULL DEFAULT 0,
      done INT NOT NULL DEFAULT 0,
      total INT NOT NULL DEFAULT 0,
      allowed_types_json LONGTEXT NOT NULL,
      feedback_mode ENUM('instant', 'final') NULL,
      metadata_json LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ace_suites_topic_id (topic_id),
      INDEX idx_ace_suites_scope (scope)
    )
  `);

  await getPool().execute(`
    CREATE TABLE IF NOT EXISTS ace_questions (
      id VARCHAR(128) PRIMARY KEY,
      scope ENUM('public', 'personal') NOT NULL,
      owner_user_id VARCHAR(64) NULL,
      suite_id VARCHAR(128) NOT NULL,
      type ENUM('single', 'multiple', 'boolean', 'blank', 'coding') NOT NULL,
      title TEXT NOT NULL,
      description TEXT NULL,
      difficulty ENUM('easy', 'medium', 'hard') NOT NULL,
      tags_json LONGTEXT NOT NULL,
      media_json LONGTEXT NOT NULL,
      options_json LONGTEXT NULL,
      answer_json LONGTEXT NULL,
      explanation TEXT NULL,
      problem_id VARCHAR(128) NULL,
      metadata_json LONGTEXT NOT NULL,
      sort_order INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_ace_questions_suite_id (suite_id),
      INDEX idx_ace_questions_scope (scope)
    )
  `);

  const [topicRows] = await getPool().execute<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM ace_topics");
  const [suiteRows] = await getPool().execute<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM ace_suites");
  const [questionRows] = await getPool().execute<mysql.RowDataPacket[]>("SELECT COUNT(*) AS count FROM ace_questions");
  const isEmpty = Number(topicRows[0]?.count || 0) === 0 && Number(suiteRows[0]?.count || 0) === 0 && Number(questionRows[0]?.count || 0) === 0;
  if (isEmpty) {
    await seedQuestionBank();
  }
  await loadQuestionBank();
}

export const store = {
  getSystemSettings() {
    return systemSettings;
  },
  listProblems(user?: User) {
    return problems.filter((problem) => problem.published && canReadScoped(problem, user));
  },
  getProblem(idOrSlug: string, user?: User) {
    return problems.find((problem) => (problem.id === idOrSlug || problem.slug === idOrSlug) && canReadScoped(problem, user));
  },
  listTestCases(problemId: string) {
    return testCases.filter((testCase) => testCase.problemId === problemId);
  },
  listTopics(user: User) {
    return filterTopicTree(topics, user);
  },
  async createTopic(topic: TopicNode) {
    if (topic.parentId) {
      const parent = findTopic(topics, topic.parentId);
      if (parent) {
        parent.children = [...(parent.children || []), topic];
        await saveTopic(topic, parent.children.length - 1);
        return topic;
      }
    }
    topics.push(topic);
    await saveTopic(topic, topics.length - 1);
    return topic;
  },
  async moveTopic(id: string, parentId: string | undefined, user: User) {
    const topic = findTopic(topics, id);
    if (!topic) throw new Error("Topic not found");
    if (!canWriteScoped(topic, user)) throw new Error("Access denied");
    if (parentId === id) throw new Error("A topic cannot be moved under itself");

    const descendantIds = new Set(collectChildTopicIds(id));
    if (parentId && descendantIds.has(parentId)) {
      throw new Error("A topic cannot be moved under one of its child topics");
    }

    const parent = parentId ? findTopic(topics, parentId) : undefined;
    if (parentId && !parent) throw new Error("Target parent topic not found");
    if (parent && !canWriteScoped(parent, user)) throw new Error("Access denied");
    if (parent && parent.scope !== topic.scope) throw new Error("Cannot move topics across bank scopes");

    const removed = detachTopic(topics, id);
    if (!removed) throw new Error("Topic not found");
    removed.parentId = parent?.id;
    if (parent) {
      parent.children = [...(parent.children || []), removed];
    } else {
      topics.push(removed);
    }
    await saveTopic(removed, parent ? (parent.children || []).length - 1 : topics.length - 1);
    return removed;
  },
  listSuites(user: User, topicId?: string, scope?: BankScope) {
    const readable = suites.filter((suite) => canReadScoped(suite, user) && (!scope || suite.scope === scope));
    if (!topicId) return readable;
    const topicIds = new Set([topicId, ...collectChildTopicIds(topicId)]);
    return readable.filter((suite) => topicIds.has(suite.topicId));
  },
  getSuite(id: string, user: User) {
    return suites.find((suite) => suite.id === id && canReadScoped(suite, user));
  },
  listQuestions(user: User, suiteId?: string, scope?: BankScope) {
    return questions.filter(
      (question) => canReadScoped(question, user) && (!suiteId || question.suiteId === suiteId) && (!scope || question.scope === scope)
    );
  },
  async createQuestion(question: Question) {
    questions.push(question);
    await saveQuestion(question, questions.filter((item) => item.suiteId === question.suiteId).length - 1);
    return question;
  },
  async createSuite(suite: TrainingSuite) {
    suites.push(suite);
    await saveSuite(suite);
    return suite;
  },
  async deleteTopic(id: string, user: User) {
    const topic = findTopic(topics, id);
    if (!topic) throw new Error("Topic not found");
    if (!canWriteScoped(topic, user)) throw new Error("Access denied");

    const childTopicIds = new Set([id, ...collectChildTopicIds(id)]);
    removeTopic(topics, id);
    const deletedSuiteIds = new Set<string>();
    for (let i = suites.length - 1; i >= 0; i--) {
      if (childTopicIds.has(suites[i].topicId)) {
        deletedSuiteIds.add(suites[i].id);
        suites.splice(i, 1);
      }
    }
    for (let i = questions.length - 1; i >= 0; i--) {
      if (deletedSuiteIds.has(questions[i].suiteId)) {
        questions.splice(i, 1);
      }
    }
    await deleteQuestionsForSuites(Array.from(deletedSuiteIds));
    await deleteSuitesForTopics(Array.from(childTopicIds));
    await deleteTopicsByIds(Array.from(childTopicIds));
  },
  async deleteSuite(id: string, user: User) {
    const suite = suites.find(s => s.id === id);
    if (!suite) throw new Error("Suite not found");
    if (!canWriteScoped(suite, user)) throw new Error("Access denied");
    
    const index = suites.findIndex(s => s.id === id);
    if (index >= 0) suites.splice(index, 1);

    // Remove all questions in this suite
    for (let i = questions.length - 1; i >= 0; i--) {
      if (questions[i].suiteId === id) {
        questions.splice(i, 1);
      }
    }
    await deleteQuestionsForSuites([id]);
    await getPool().execute("DELETE FROM ace_suites WHERE id = ?", [id]);
  },
  async updateSuite(id: string, updates: Partial<TrainingSuite>, user: User) {
    const suite = suites.find(s => s.id === id);
    if (!suite) throw new Error("Suite not found");
    if (!canWriteScoped(suite, user)) throw new Error("Access denied");
    
    if (updates.title !== undefined) suite.title = updates.title;
    if (updates.description !== undefined) suite.description = updates.description;
    if (updates.durationMinutes !== undefined) suite.durationMinutes = updates.durationMinutes;
    if (updates.allowedTypes !== undefined) suite.allowedTypes = updates.allowedTypes;
    if (updates.feedbackMode !== undefined) suite.feedbackMode = updates.feedbackMode;
    if (updates.metadata !== undefined) suite.metadata = updates.metadata;
    await saveSuite(suite);
    
    return suite;
  },
  async replaceSuiteContents(id: string, replacement: TrainingSuite, replacementQuestions: Question[], user: User) {
    const suite = suites.find(s => s.id === id);
    if (!suite) throw new Error("Suite not found");
    if (!canWriteScoped(suite, user)) throw new Error("Access denied");

    suite.title = replacement.title;
    suite.description = replacement.description;
    suite.questionCount = replacementQuestions.length;
    suite.durationMinutes = replacement.durationMinutes;
    suite.scorePercent = 0;
    suite.done = 0;
    suite.total = replacementQuestions.length;
    suite.allowedTypes = replacement.allowedTypes;
    suite.feedbackMode = replacement.feedbackMode;
    suite.metadata = replacement.metadata;

    for (let i = questions.length - 1; i >= 0; i--) {
      if (questions[i].suiteId === id) {
        questions.splice(i, 1);
      }
    }

    const normalizedQuestions = replacementQuestions.map((question) => ({
      ...question,
      suiteId: suite.id,
      scope: suite.scope,
      ownerUserId: suite.scope === "personal" ? suite.ownerUserId : undefined
    }));
    questions.push(...normalizedQuestions);
    await saveSuite(suite);
    await deleteQuestionsForSuites([id]);
    for (const [index, question] of normalizedQuestions.entries()) {
      await saveQuestion(question, index);
    }
    return { suite, questions: normalizedQuestions };
  },
  listSubmissions(user: User) {
    return Array.from(submissions.values())
      .filter((submission) => user.role === "admin" || submission.userId === user.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getSubmission(id: string, user?: User) {
    const submission = submissions.get(id);
    if (!submission || !user) return submission;
    return user.role === "admin" || submission.userId === user.id ? submission : undefined;
  },
  claimNextQueuedSubmission(languages?: Language[]) {
    const languageSet = languages?.length ? new Set(languages) : undefined;
    const submission = Array.from(submissions.values())
      .filter((item) => item.status === "queued")
      .filter((item) => !languageSet || languageSet.has(item.language))
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt))[0];
    if (!submission) return undefined;
    const running = { ...submission, status: "running" as const, updatedAt: new Date().toISOString() };
    submissions.set(running.id, running);
    return running;
  },
  saveSubmission(submission: Submission) {
    submissions.set(submission.id, submission);
    return submission;
  }
};

function canReadScoped(item: { scope: BankScope; ownerUserId?: string }, user?: User) {
  if (item.scope === "public") return true;
  if (!user) return false;
  return user.role === "admin" || item.ownerUserId === user.id;
}

function canWriteScoped(item: { scope: BankScope; ownerUserId?: string }, user: User) {
  if (item.scope === "public") return user.role === "admin";
  return user.role === "admin" || item.ownerUserId === user.id;
}

function filterTopicTree(nodes: TopicNode[], user: User): TopicNode[] {
  return nodes
    .filter((node) => canReadScoped(node, user))
    .map((node) => ({ ...node, children: node.children ? filterTopicTree(node.children, user) : undefined }));
}

function collectChildTopicIds(topicId: string): string[] {
  const topic = findTopic(topics, topicId);
  return topic ? flattenTopics(topic.children || []).map((node) => node.id) : [];
}

function findTopic(nodes: TopicNode[], id: string): TopicNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findTopic(node.children, id) : undefined;
    if (child) return child;
  }
  return undefined;
}

function flattenTopics(nodes: TopicNode[]): TopicNode[] {
  return nodes.flatMap((node) => [node, ...flattenTopics(node.children || [])]);
}

function removeTopic(nodes: TopicNode[], id: string): boolean {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    nodes.splice(index, 1);
    return true;
  }
  return nodes.some((node) => node.children && removeTopic(node.children, id));
}

function detachTopic(nodes: TopicNode[], id: string): TopicNode | undefined {
  const index = nodes.findIndex((node) => node.id === id);
  if (index >= 0) {
    return nodes.splice(index, 1)[0];
  }
  for (const node of nodes) {
    const child = node.children ? detachTopic(node.children, id) : undefined;
    if (child) {
      if (node.children && node.children.length === 0) node.children = undefined;
      return child;
    }
  }
  return undefined;
}

async function seedQuestionBank() {
  const connection = await getPool().getConnection();
  try {
    await connection.beginTransaction();
    for (const [index, topic] of flattenTopics(seedTopics).entries()) {
      await saveTopic(topic, index, connection);
    }
    for (const suite of seedSuites) {
      await saveSuite(suite, connection);
    }
    for (const [index, question] of seedQuestions.entries()) {
      await saveQuestion(question, index, connection);
    }
    await connection.commit();
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function loadQuestionBank() {
  const [topicRows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT id, scope, owner_user_id, name, parent_id, score_percent, done, total
     FROM ace_topics
     ORDER BY parent_id IS NOT NULL, sort_order, name`
  );
  const byId = new Map<string, TopicNode>();
  topics = [];
  for (const row of topicRows) {
    byId.set(row.id, {
      id: row.id,
      scope: row.scope,
      ownerUserId: row.owner_user_id || undefined,
      name: row.name,
      parentId: row.parent_id || undefined,
      scorePercent: Number(row.score_percent || 0),
      done: Number(row.done || 0),
      total: Number(row.total || 0)
    });
  }
  for (const topic of byId.values()) {
    if (topic.parentId && byId.has(topic.parentId)) {
      const parent = byId.get(topic.parentId)!;
      parent.children = [...(parent.children || []), topic];
    } else {
      topics.push(topic);
    }
  }

  const [suiteRows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT id, scope, owner_user_id, topic_id, title, description, question_count, duration_minutes,
            score_percent, done, total, allowed_types_json, feedback_mode, metadata_json
     FROM ace_suites
     ORDER BY updated_at, title`
  );
  suites = suiteRows.map((row) => ({
    id: row.id,
    scope: row.scope,
    ownerUserId: row.owner_user_id || undefined,
    topicId: row.topic_id,
    title: row.title,
    description: row.description,
    questionCount: Number(row.question_count || 0),
    durationMinutes: Number(row.duration_minutes || 15),
    scorePercent: Number(row.score_percent || 0),
    done: Number(row.done || 0),
    total: Number(row.total || 0),
    allowedTypes: parseJson(row.allowed_types_json, []),
    feedbackMode: row.feedback_mode || undefined,
    metadata: parseJson(row.metadata_json, {})
  }));

  const [questionRows] = await getPool().execute<mysql.RowDataPacket[]>(
    `SELECT id, scope, owner_user_id, suite_id, type, title, description, difficulty, tags_json,
            media_json, options_json, answer_json, explanation, problem_id, metadata_json
     FROM ace_questions
     ORDER BY suite_id, sort_order, id`
  );
  questions = questionRows.map((row) => ({
    id: row.id,
    scope: row.scope,
    ownerUserId: row.owner_user_id || undefined,
    suiteId: row.suite_id,
    type: row.type,
    title: row.title,
    description: row.description || undefined,
    difficulty: row.difficulty,
    tags: parseJson(row.tags_json, []),
    media: parseJson(row.media_json, []),
    options: row.options_json === null ? undefined : parseJson(row.options_json, undefined),
    answer: row.answer_json === null ? undefined : parseJson(row.answer_json, undefined),
    explanation: row.explanation || undefined,
    problemId: row.problem_id || undefined,
    metadata: parseJson(row.metadata_json, {})
  }));
}

async function saveTopic(topic: TopicNode, sortOrder: number, executor: mysql.Pool | mysql.PoolConnection = getPool()) {
  await executor.execute(
    `INSERT INTO ace_topics (id, scope, owner_user_id, name, parent_id, score_percent, done, total, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE scope = VALUES(scope), owner_user_id = VALUES(owner_user_id),
       name = VALUES(name), parent_id = VALUES(parent_id), score_percent = VALUES(score_percent),
       done = VALUES(done), total = VALUES(total), sort_order = VALUES(sort_order)`,
    [topic.id, topic.scope, topic.ownerUserId || null, topic.name, topic.parentId || null, topic.scorePercent, topic.done, topic.total, sortOrder]
  );
}

async function saveSuite(suite: TrainingSuite, executor: mysql.Pool | mysql.PoolConnection = getPool()) {
  await executor.execute(
    `INSERT INTO ace_suites (id, scope, owner_user_id, topic_id, title, description, question_count,
       duration_minutes, score_percent, done, total, allowed_types_json, feedback_mode, metadata_json)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE scope = VALUES(scope), owner_user_id = VALUES(owner_user_id),
       topic_id = VALUES(topic_id), title = VALUES(title), description = VALUES(description),
       question_count = VALUES(question_count), duration_minutes = VALUES(duration_minutes),
       score_percent = VALUES(score_percent), done = VALUES(done), total = VALUES(total),
       allowed_types_json = VALUES(allowed_types_json), feedback_mode = VALUES(feedback_mode),
       metadata_json = VALUES(metadata_json)`,
    [
      suite.id,
      suite.scope,
      suite.ownerUserId || null,
      suite.topicId,
      suite.title,
      suite.description,
      suite.questionCount,
      suite.durationMinutes,
      suite.scorePercent,
      suite.done,
      suite.total,
      JSON.stringify(suite.allowedTypes || []),
      suite.feedbackMode || null,
      JSON.stringify(suite.metadata || {})
    ]
  );
}

async function saveQuestion(question: Question, sortOrder: number, executor: mysql.Pool | mysql.PoolConnection = getPool()) {
  await executor.execute(
    `INSERT INTO ace_questions (id, scope, owner_user_id, suite_id, type, title, description,
       difficulty, tags_json, media_json, options_json, answer_json, explanation, problem_id, metadata_json, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE scope = VALUES(scope), owner_user_id = VALUES(owner_user_id),
       suite_id = VALUES(suite_id), type = VALUES(type), title = VALUES(title), description = VALUES(description),
       difficulty = VALUES(difficulty), tags_json = VALUES(tags_json), media_json = VALUES(media_json),
       options_json = VALUES(options_json), answer_json = VALUES(answer_json), explanation = VALUES(explanation),
       problem_id = VALUES(problem_id), metadata_json = VALUES(metadata_json), sort_order = VALUES(sort_order)`,
    [
      question.id,
      question.scope,
      question.ownerUserId || null,
      question.suiteId,
      question.type,
      question.title,
      question.description || null,
      question.difficulty,
      JSON.stringify(question.tags || []),
      JSON.stringify(question.media || []),
      JSON.stringify(question.options ?? null),
      JSON.stringify(question.answer ?? null),
      question.explanation || null,
      question.problemId || null,
      JSON.stringify(question.metadata || {}),
      sortOrder
    ]
  );
}

async function deleteQuestionsForSuites(suiteIds: string[]) {
  if (!suiteIds.length) return;
  await getPool().query("DELETE FROM ace_questions WHERE suite_id IN (?)", [suiteIds]);
}

async function deleteSuitesForTopics(topicIds: string[]) {
  if (!topicIds.length) return;
  await getPool().query("DELETE FROM ace_suites WHERE topic_id IN (?)", [topicIds]);
}

async function deleteTopicsByIds(topicIds: string[]) {
  if (!topicIds.length) return;
  await getPool().query("DELETE FROM ace_topics WHERE id IN (?)", [topicIds]);
}

function parseJson<T>(value: unknown, fallback: T): T {
  if (value === null || value === undefined) return fallback;
  if (typeof value === "string") return JSON.parse(value) as T;
  return value as T;
}

function getPool() {
  if (!pool) throw new Error("Question bank store is not initialized");
  return pool;
}
