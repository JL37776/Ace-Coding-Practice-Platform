import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import type { BankScope, Problem, Question, QuestionType, SystemSettings, TestCase, TopicNode, TrainingSuite, User } from "@ace/shared";

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
  },
  {
    id: "topic-language-framework-tracks",
    scope: "public",
    name: "Language & Framework Tracks",
    scorePercent: 0,
    done: 0,
    total: 0,
    children: [
      {
        id: "topic-csharp",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: "C# 专栏",
        scorePercent: 0,
        done: 0,
        total: 0
      },
      {
        id: "topic-dotnet",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: ".NET 专栏",
        scorePercent: 0,
        done: 0,
        total: 0
      },
      {
        id: "topic-react",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: "React 专栏",
        scorePercent: 0,
        done: 0,
        total: 0
      },
      {
        id: "topic-java",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: "Java 专栏",
        scorePercent: 0,
        done: 0,
        total: 0
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
        javascript: "twoSum",
        csharp: "TwoSum",
        java: "twoSum"
      },
      signature: {
        python: "def two_sum(nums, target):",
        typescript: "function twoSum(nums: number[], target: number): number[]",
        javascript: "function twoSum(nums, target) {}",
        csharp: "public int[] TwoSum(int[] nums, int target)",
        java: "public int[] twoSum(int[] nums, int target)"
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

loadExpandedQuestionBank();

function loadExpandedQuestionBank() {
  const rootDir = join(dirname(fileURLToPath(import.meta.url)), "../../../..");
  const bankPath = join(rootDir, "question-suites", "expanded-question-bank.md");
  if (!existsSync(bankPath)) return;

  const markdown = readFileSync(bankPath, "utf8");
  const rawSuites = [...markdown.matchAll(/```text\s*([\s\S]*?)```/g)]
    .map((match) => match[1].trim())
    .filter((block) => block.startsWith("@suite"));

  const topicByPrefix: Record<string, string> = {
    "C#": "topic-csharp",
    ".NET": "topic-dotnet",
    React: "topic-react",
    Java: "topic-java"
  };

  for (const raw of rawSuites) {
    const parsed = parseSeedRawSuite(raw);
    const topicId = Object.entries(topicByPrefix).find(([prefix]) => parsed.suite.title.startsWith(prefix))?.[1] || "topic-interview";
    const suiteId = slugId("suite", parsed.suite.title);
    if (suites.some((suite) => suite.id === suiteId)) continue;
    parsed.questions = ensureMinimumQuestionCount(parsed.suite.title, parsed.questions, 50);
    parsed.suite.questionCount = parsed.questions.length;
    parsed.suite.total = parsed.questions.length;
    suites.push({ ...parsed.suite, id: suiteId, topicId });
    questions.push(...parsed.questions.map((question, index) => ({ ...question, id: `${suiteId}-q${index + 1}`, suiteId })));
  }
}

function parseSeedRawSuite(raw: string) {
  const blocks = raw.split(/\n(?=@(?:suite|q)\b)/i).map((block) => block.trim()).filter(Boolean);
  const suiteFields = parseSeedFields(blocks.find((block) => block.toLowerCase().startsWith("@suite")) || "");
  const parsedQuestions = blocks
    .filter((block) => block.toLowerCase().startsWith("@q"))
    .map((block) => seedQuestionFromFields(parseSeedFields(block)));
  const allowedTypes = Array.from(new Set(parsedQuestions.map((question) => question.type))) as QuestionType[];
  const suite: TrainingSuite = {
    id: "",
    scope: "public",
    topicId: "",
    title: suiteFields.title || "Imported Suite",
    description: suiteFields.description || "",
    questionCount: parsedQuestions.length,
    durationMinutes: Number(suiteFields.duration || 15),
    scorePercent: 0,
    done: 0,
    total: parsedQuestions.length,
    allowedTypes: allowedTypes.length ? allowedTypes : ["single"],
    feedbackMode: suiteFields.feedbackMode === "final" ? "final" : "instant"
  };
  return { suite, questions: parsedQuestions };
}

function ensureMinimumQuestionCount(suiteTitle: string, sourceQuestions: Question[], minimum: number) {
  const expanded = [...sourceQuestions];
  const profile = suiteProfile(suiteTitle);
  let index = 1;
  while (expanded.length < minimum) {
    expanded.push(makeReinforcementQuestion(profile, index));
    index += 1;
  }
  return expanded;
}

function suiteProfile(title: string) {
  if (title.startsWith("C#")) return { tag: "csharp", label: "C#", focus: "language fundamentals, OOP, LINQ, async and runtime behavior" };
  if (title.startsWith(".NET")) return { tag: "dotnet", label: ".NET", focus: "CLI, ASP.NET Core, dependency injection, EF Core and production APIs" };
  if (title.startsWith("React")) return { tag: "react", label: "React", focus: "components, hooks, rendering, forms and frontend architecture" };
  if (title.startsWith("Java")) return { tag: "java", label: "Java", focus: "types, OOP, collections, streams, exceptions and concurrency" };
  return { tag: "interview", label: "Interview", focus: "core implementation details" };
}

function makeReinforcementQuestion(profile: { tag: string; label: string; focus: string }, index: number): Question {
  const variants = [
    {
      title: `${profile.label} reinforcement ${index}: What should you verify first when debugging ${profile.focus}?`,
      options: ["The exact failing input and expected behavior", "Only the final UI color", "The newest unrelated package", "A random file name"],
      answer: "A",
      explanation: "Good debugging starts with a concrete failing case and the expected behavior."
    },
    {
      title: `${profile.label} reinforcement ${index}: Which habit best reduces regressions in ${profile.focus}?`,
      options: ["Small focused tests around changed behavior", "Skipping validation", "Changing many unrelated modules", "Ignoring edge cases"],
      answer: "A",
      explanation: "Focused tests protect the behavior that was changed or clarified."
    },
    {
      title: `${profile.label} reinforcement ${index}: What is a strong sign code should be refactored?`,
      options: ["Duplicated logic with different edge-case handling", "Clear names", "Small pure functions", "Useful error messages"],
      answer: "A",
      explanation: "Duplicated logic often drifts and produces inconsistent behavior."
    },
    {
      title: `${profile.label} reinforcement ${index}: Why prefer explicit boundaries between UI, domain logic and infrastructure?`,
      options: ["It makes changes easier to test and reason about", "It prevents compilation", "It removes all runtime errors", "It avoids naming variables"],
      answer: "A",
      explanation: "Clear boundaries reduce coupling and make behavior easier to verify."
    },
    {
      title: `${profile.label} reinforcement ${index}: Which answer best describes maintainable production code?`,
      options: ["Readable, tested, observable and scoped to real requirements", "Clever but undocumented", "Large functions with hidden side effects", "Only works on one sample"],
      answer: "A",
      explanation: "Production code should be understandable, verifiable and diagnosable."
    }
  ];
  const variant = variants[(index - 1) % variants.length];
  return {
    id: "",
    scope: "public",
    suiteId: "",
    type: "single",
    title: variant.title,
    difficulty: index % 5 === 0 ? "medium" : "easy",
    tags: [profile.tag, "reinforcement"],
    media: [],
    options: variant.options.map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text })),
    answer: variant.answer,
    explanation: variant.explanation,
    metadata: {}
  };
}

function parseSeedFields(block: string) {
  const fields: Record<string, string> = {};
  for (const line of block.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("@")) continue;
    const index = trimmed.indexOf("=");
    if (index !== -1) fields[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return fields;
}

function seedQuestionFromFields(fields: Record<string, string>): Question {
  const type = normalizeSeedQuestionType(fields.type);
  const options = ["A", "B", "C", "D", "E", "F"].filter((id) => fields[id]).map((id) => ({ id, text: fields[id] }));
  return {
    id: "",
    scope: "public",
    suiteId: "",
    type,
    title: fields.title || "Untitled question",
    description: fields.description || "",
    difficulty: fields.difficulty === "medium" || fields.difficulty === "hard" ? fields.difficulty : "easy",
    tags: fields.tags ? fields.tags.split(",").map((tag) => tag.trim()).filter(Boolean) : [],
    media: [],
    options: options.length ? options : undefined,
    answer: parseSeedAnswer(fields.answer || fields.ans, type),
    explanation: fields.explanation || "",
    problemId: fields.problemId,
    metadata: {}
  };
}

function normalizeSeedQuestionType(value = "single"): QuestionType {
  if (value === "multiple" || value === "boolean" || value === "blank" || value === "coding") return value;
  return "single";
}

function parseSeedAnswer(value: string | undefined, type: QuestionType) {
  if (!value) return undefined;
  if (type === "multiple") return value.split(",").map((item) => item.trim()).filter(Boolean);
  if (type === "boolean") return value.toLowerCase() === "true";
  return value;
}

function slugId(prefix: string, value: string) {
  return `${prefix}-${value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}`;
}
