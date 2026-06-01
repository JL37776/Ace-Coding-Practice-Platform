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
    if (!canReadScoped(topic, user)) throw new Error("Access denied");
    
    // Remove from parent
    const index = topics.findIndex(t => t.id === id);
    if (index >= 0) {
      topics.splice(index, 1);
    } else {
      // Find in children
      const visit = (nodes: TopicNode[]): boolean => {
        for (let i = 0; i < nodes.length; i++) {
          if (nodes[i].id === id) {
            nodes.splice(i, 1);
            return true;
          }
          if (nodes[i].children && visit(nodes[i].children!)) return true;
        }
        return false;
      };
      visit(topics);
    }

    // Remove all suites under this topic
    const childTopicIds = new Set([id, ...collectChildTopicIds(id)]);
    for (let i = suites.length - 1; i >= 0; i--) {
      if (childTopicIds.has(suites[i].topicId)) {
        suites.splice(i, 1);
      }
    }
  },
  deleteSuite(id: string, user: User) {
    const suite = suites.find(s => s.id === id);
    if (!suite) throw new Error("Suite not found");
    if (!canReadScoped(suite, user)) throw new Error("Access denied");
    
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
    if (!canReadScoped(suite, user)) throw new Error("Access denied");
    
    if (updates.title !== undefined) suite.title = updates.title;
    if (updates.description !== undefined) suite.description = updates.description;
    if (updates.durationMinutes !== undefined) suite.durationMinutes = updates.durationMinutes;
    if (updates.allowedTypes !== undefined) suite.allowedTypes = updates.allowedTypes;
    if (updates.feedbackMode !== undefined) suite.feedbackMode = updates.feedbackMode;
    
    return suite;
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

function filterTopicTree(nodes: TopicNode[], user: User): TopicNode[] {
  return nodes
    .filter((node) => canReadScoped(node, user))
    .map((node) => ({ ...node, children: node.children ? filterTopicTree(node.children, user) : undefined }));
}

function collectChildTopicIds(topicId: string): string[] {
  const result: string[] = [];
  const visit = (nodes: typeof topics) => {
    for (const node of nodes) {
      if (node.parentId === topicId) result.push(node.id);
      if (node.children) {
        for (const child of node.children) {
          if (child.parentId === topicId || node.id === topicId) result.push(child.id);
        }
        visit(node.children);
      }
    }
  };
  visit(topics);
  return result;
}

function findTopic(nodes: TopicNode[], id: string): TopicNode | undefined {
  for (const node of nodes) {
    if (node.id === id) return node;
    const child = node.children ? findTopic(node.children, id) : undefined;
    if (child) return child;
  }
  return undefined;
}
