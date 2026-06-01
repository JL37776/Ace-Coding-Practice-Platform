import type { Problem, Question, SystemSettings, TestCase, TopicNode, TrainingSuite, User } from "@ace/shared";

export const systemSettings: SystemSettings = {
  allowedQuestionTypes: ["single", "multiple", "boolean", "blank", "coding"],
  allowedLanguages: ["python", "typescript", "javascript", "csharp", "java"],
  aiQuestionGenerationEnabled: false,
  defaultScoreFormat: "percent_fraction"
};

export const users: Array<User & { password: string }> = [
  {
    id: "user-admin",
    username: "admin@ace.local",
    password: "AceAdmin-2026!",
    displayName: "Ace Admin",
    role: "admin"
  },
  {
    id: "user-demo",
    username: "demo@ace.local",
    password: "AceDemo-2026!",
    displayName: "Demo Learner",
    role: "member"
  }
];

export const topics: TopicNode[] = [
  {
    id: "topic-coding",
    scope: "public",
    name: "Coding Practice",
    scorePercent: 98,
    done: 49,
    total: 50,
    children: [
      {
        id: "topic-arrays",
        scope: "public",
        parentId: "topic-coding",
        name: "Arrays and Hash Maps",
        scorePercent: 98,
        done: 49,
        total: 50
      },
      {
        id: "topic-backend",
        scope: "public",
        parentId: "topic-coding",
        name: "Backend Fundamentals",
        scorePercent: 86,
        done: 43,
        total: 50
      }
    ]
  },
  {
    id: "topic-interview",
    scope: "public",
    name: "Interview Knowledge",
    scorePercent: 72,
    done: 36,
    total: 50,
    children: [
      {
        id: "topic-oop",
        scope: "public",
        parentId: "topic-interview",
        name: "OOP and SOLID",
        scorePercent: 74,
        done: 37,
        total: 50
      }
    ]
  }
];

export const suites: TrainingSuite[] = [
  {
    id: "suite-two-sum",
    scope: "public",
    topicId: "topic-arrays",
    title: "Two Sum Function Drill",
    description: "Practice a classic array/hash-map coding problem with real runner feedback.",
    questionCount: 1,
    durationMinutes: 12,
    scorePercent: 98,
    done: 49,
    total: 50,
    allowedTypes: ["coding"],
    feedbackMode: "instant"
  },
  {
    id: "suite-oop-basics",
    scope: "public",
    topicId: "topic-oop",
    title: "OOP Short Quiz",
    description: "Single, multiple, boolean, and blank questions under the constrained question schema.",
    questionCount: 4,
    durationMinutes: 8,
    scorePercent: 74,
    done: 37,
    total: 50,
    allowedTypes: ["single", "multiple", "boolean", "blank"],
    feedbackMode: "instant"
  },
  {
    id: "suite-basic-noncoding-sample",
    scope: "public",
    topicId: "topic-backend",
    title: "Basic Choice and Blank Sample",
    description: "Simple test suite with three single-choice questions and three fill-in-the-blank questions.",
    questionCount: 6,
    durationMinutes: 10,
    scorePercent: 0,
    done: 0,
    total: 6,
    allowedTypes: ["single", "blank"],
    feedbackMode: "final"
  }
];

export const problems: Problem[] = [
  {
    id: "two-sum",
    scope: "public",
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
        typescript: "twoSum",
        javascript: "twoSum"
      },
      signature: {
        python: "def two_sum(nums, target):",
        typescript: "function twoSum(nums: number[], target: number): number[]",
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

export const questions: Question[] = [
  {
    id: "question-two-sum",
    scope: "public",
    suiteId: "suite-two-sum",
    type: "coding",
    title: "Two Sum",
    description: "Return indices of the two numbers such that they add up to target.",
    difficulty: "easy",
    tags: ["array", "hashmap"],
    media: [],
    problemId: "two-sum",
    explanation: "Use a map from value to index and check target - current value.",
    metadata: {}
  },
  {
    id: "question-oop-single",
    scope: "public",
    suiteId: "suite-oop-basics",
    type: "single",
    title: "Which principle means one class should have one reason to change?",
    difficulty: "easy",
    tags: ["oop", "solid"],
    media: [],
    options: [
      { id: "A", text: "Single Responsibility Principle" },
      { id: "B", text: "Open Closed Principle" },
      { id: "C", text: "Dependency Inversion Principle" }
    ],
    answer: "A",
    explanation: "SRP keeps a class focused on one responsibility.",
    metadata: {}
  },
  {
    id: "question-basic-single-1",
    scope: "public",
    suiteId: "suite-basic-noncoding-sample",
    type: "single",
    title: "Which HTTP method is normally used to create a new resource?",
    difficulty: "easy",
    tags: ["http", "backend"],
    media: [],
    options: [
      { id: "A", text: "GET" },
      { id: "B", text: "POST" },
      { id: "C", text: "DELETE" }
    ],
    answer: "B",
    explanation: "POST is commonly used to submit data that creates a new resource.",
    metadata: {}
  },
  {
    id: "question-basic-single-2",
    scope: "public",
    suiteId: "suite-basic-noncoding-sample",
    type: "single",
    title: "Which data structure stores key-value pairs?",
    difficulty: "easy",
    tags: ["data-structure"],
    media: [],
    options: [
      { id: "A", text: "Stack" },
      { id: "B", text: "Queue" },
      { id: "C", text: "Map" }
    ],
    answer: "C",
    explanation: "A map stores values by key.",
    metadata: {}
  },
  {
    id: "question-basic-single-3",
    scope: "public",
    suiteId: "suite-basic-noncoding-sample",
    type: "single",
    title: "Which status code usually means the request succeeded?",
    difficulty: "easy",
    tags: ["http"],
    media: [],
    options: [
      { id: "A", text: "200" },
      { id: "B", text: "404" },
      { id: "C", text: "500" }
    ],
    answer: "A",
    explanation: "HTTP 200 indicates a successful request.",
    metadata: {}
  },
  {
    id: "question-basic-blank-1",
    scope: "public",
    suiteId: "suite-basic-noncoding-sample",
    type: "blank",
    title: "Fill in the blank: SQL command used to read rows from a table is ____.",
    difficulty: "easy",
    tags: ["sql"],
    media: [],
    answer: "SELECT",
    explanation: "SELECT reads rows from one or more tables.",
    metadata: {}
  },
  {
    id: "question-basic-blank-2",
    scope: "public",
    suiteId: "suite-basic-noncoding-sample",
    type: "blank",
    title: "Fill in the blank: The JavaScript keyword for declaring a constant is ____.",
    difficulty: "easy",
    tags: ["javascript"],
    media: [],
    answer: "const",
    explanation: "const declares a block-scoped constant binding.",
    metadata: {}
  },
  {
    id: "question-basic-blank-3",
    scope: "public",
    suiteId: "suite-basic-noncoding-sample",
    type: "blank",
    title: "Fill in the blank: A function that calls itself is called ____.",
    difficulty: "easy",
    tags: ["programming"],
    media: [],
    answer: "recursive",
    explanation: "A recursive function calls itself directly or indirectly.",
    metadata: {}
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
