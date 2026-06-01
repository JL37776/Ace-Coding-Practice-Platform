import type { Problem, TestCase } from "@ace/shared";

export const problems: Problem[] = [
  {
    id: "two-sum",
    title: "Two Sum",
    slug: "two-sum",
    type: "coding",
    difficulty: "easy",
    tags: ["array", "hash-table"],
    statement:
      "Return indices of the two numbers such that they add up to target. You may assume exactly one solution.",
    configJson: {
      functionName: "twoSum",
      entrypoint: {
        python: "two_sum",
        javascript: "twoSum"
      },
      signature: {
        python: "def two_sum(nums, target):",
        javascript: "function twoSum(nums, target) {}"
      },
      checker: "exact",
      timeLimitMs: 5000,
      memoryLimitMb: 128
    },
    version: 1,
    published: true
  }
];

export const testCases: TestCase[] = [
  {
    id: "two-sum-sample-1",
    problemId: "two-sum",
    visibility: "sample",
    inputJson: { nums: [2, 7, 11, 15], target: 9 },
    expectedJson: [0, 1],
    weight: 1,
    order: 1
  },
  {
    id: "two-sum-hidden-1",
    problemId: "two-sum",
    visibility: "hidden",
    inputJson: { nums: [3, 2, 4], target: 6 },
    expectedJson: [1, 2],
    weight: 1,
    order: 2
  }
];
