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
