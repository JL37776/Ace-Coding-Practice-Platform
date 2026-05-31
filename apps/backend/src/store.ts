import type { Submission } from "@ace/shared";
import { problems, testCases } from "./data/seed.js";

const submissions = new Map<string, Submission>();

export const store = {
  listProblems() {
    return problems.filter((problem) => problem.published);
  },
  getProblem(idOrSlug: string) {
    return problems.find((problem) => problem.id === idOrSlug || problem.slug === idOrSlug);
  },
  listTestCases(problemId: string) {
    return testCases.filter((testCase) => testCase.problemId === problemId);
  },
  listSubmissions() {
    return Array.from(submissions.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  getSubmission(id: string) {
    return submissions.get(id);
  },
  saveSubmission(submission: Submission) {
    submissions.set(submission.id, submission);
    return submission;
  }
};
