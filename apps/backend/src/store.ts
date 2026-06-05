import type { BankScope, Language, Question, Submission, TopicNode, TrainingSuite, User } from "@ace/shared";
import { problems, questions, suites, systemSettings, testCases, topics } from "./data/seed.js";

const submissions = new Map<string, Submission>();

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
  createTopic(topic: TopicNode) {
    if (topic.parentId) {
      const parent = findTopic(topics, topic.parentId);
      if (parent) {
        parent.children = [...(parent.children || []), topic];
        return topic;
      }
    }
    topics.push(topic);
    return topic;
  },
  moveTopic(id: string, parentId: string | undefined, user: User) {
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
  createQuestion(question: Question) {
    questions.push(question);
    return question;
  },
  createSuite(suite: TrainingSuite) {
    suites.push(suite);
    return suite;
  },
  deleteTopic(id: string, user: User) {
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
  },
  deleteSuite(id: string, user: User) {
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
  },
  updateSuite(id: string, updates: Partial<TrainingSuite>, user: User) {
    const suite = suites.find(s => s.id === id);
    if (!suite) throw new Error("Suite not found");
    if (!canWriteScoped(suite, user)) throw new Error("Access denied");
    
    if (updates.title !== undefined) suite.title = updates.title;
    if (updates.description !== undefined) suite.description = updates.description;
    if (updates.durationMinutes !== undefined) suite.durationMinutes = updates.durationMinutes;
    if (updates.allowedTypes !== undefined) suite.allowedTypes = updates.allowedTypes;
    if (updates.feedbackMode !== undefined) suite.feedbackMode = updates.feedbackMode;
    
    return suite;
  },
  replaceSuiteContents(id: string, replacement: TrainingSuite, replacementQuestions: Question[], user: User) {
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
