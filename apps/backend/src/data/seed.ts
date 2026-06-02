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
      },
      {
        id: "topic-nz-interview-skills",
        scope: "public",
        parentId: "topic-interview",
        name: "New Zealand Interview Skills",
        scorePercent: 0,
        done: 0,
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
        name: "C# Track",
        scorePercent: 0,
        done: 0,
        total: 0
      },
      {
        id: "topic-dotnet",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: ".NET Track",
        scorePercent: 0,
        done: 0,
        total: 0
      },
      {
        id: "topic-react",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: "React Track",
        scorePercent: 0,
        done: 0,
        total: 0
      },
      {
        id: "topic-java",
        scope: "public",
        parentId: "topic-language-framework-tracks",
        name: "Java Track",
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

function loadNzInterviewSkillsSuite() {
  const suiteId = "suite-nz-interview-templates";
  if (suites.some((suite) => suite.id === suiteId)) return;
  suites.push({
    id: suiteId,
    scope: "public",
    topicId: "topic-nz-interview-skills",
    title: "New Zealand Interview Skills - Answer Templates",
    description: "Practice STAR/SAR/CAR/PAR behavioral answer templates, Kiwi workplace communication, and practical interview response patterns.",
    questionCount: 50,
    durationMinutes: 45,
    scorePercent: 0,
    done: 0,
    total: 50,
    allowedTypes: ["single", "multiple", "boolean", "blank"],
    feedbackMode: "instant"
  });

  type NzQuestionSeed = {
    type?: QuestionType;
    title: string;
    options?: string[];
    answer: string | string[] | boolean;
    explanation: string;
    tags?: string[];
  };

  const seeds: NzQuestionSeed[] = [
    { title: "Which answer template is usually best for a behavioral question such as 'Tell me about a time you handled conflict'?", options: ["STAR: Situation, Task, Action, Result", "List every job duty from your CV", "Talk only about your personality", "Ask them to read your references"], answer: "A", explanation: "STAR gives context, responsibility, action and outcome in a clear order.", tags: ["star", "behavioral"] },
    { title: "For a short NZ interview answer, which structure is most practical?", options: ["Situation in 1-2 sentences, Action in detail, Result with evidence", "Long company history first", "Only technical keywords", "Apologise before answering"], answer: "A", explanation: "NZ interviews often value concise, direct examples with enough evidence.", tags: ["nz", "structure"] },
    { title: "What should be the longest part of a STAR answer?", options: ["Action", "Situation", "Company background", "The question repeated back"], answer: "A", explanation: "Interviewers mainly assess what you personally did.", tags: ["star", "action"] },
    { title: "Which template fits 'Describe a challenge, what you did, and what changed'?", options: ["CAR: Challenge, Action, Result", "ABC: Age, Background, City", "SQL: Select, Query, Limit", "None, just improvise"], answer: "A", explanation: "CAR is a compact version of STAR for challenge-based questions.", tags: ["car", "template"] },
    { title: "Which template fits 'What was the situation, what action did you take, and what was the result?'", options: ["SAR", "FIFO", "MVC", "DNS"], answer: "A", explanation: "SAR is Situation, Action, Result.", tags: ["sar", "template"] },
    { title: "In a NZ interview, what is a strong opening for a behavioral answer?", options: ["A specific one-line context: 'In my last role, we had a release delay two days before go-live.'", "I am a hardworking person.", "This never happens to me.", "My previous manager was difficult."], answer: "A", explanation: "Specific context sounds credible and sets up the example quickly.", tags: ["opening", "behavioral"] },
    { title: "Which result sounds strongest?", options: ["Reduced regression bugs by about 30% over two releases", "Everyone was happy", "I think it went okay", "The project ended"], answer: "A", explanation: "Measured or observable results are more convincing.", tags: ["result", "metrics"] },
    { title: "If you do not have an exact work example, what should you do?", options: ["Use a close project, study, volunteer, or personal project example and state it clearly", "Invent a senior job story", "Avoid answering", "Say the question is unfair"], answer: "A", explanation: "Related real examples are acceptable if you are transparent.", tags: ["examples", "honesty"] },
    { title: "What should you avoid in conflict answers?", options: ["Blaming a person and sounding resentful", "Explaining your communication steps", "Showing what you learned", "Mentioning the outcome"], answer: "A", explanation: "NZ workplaces often value calm, constructive communication.", tags: ["conflict", "culture"] },
    { title: "Best template for 'Tell me about yourself' in an NZ job interview?", options: ["Present role/skills, relevant experience, target role fit", "Full life story from childhood", "Only hobbies", "Salary expectations first"], answer: "A", explanation: "A focused professional summary links your background to the role.", tags: ["intro", "fit"] },
    { title: "Which sentence best shows teamwork without exaggerating?", options: ["I aligned with the tester and product owner, then took ownership of the API fix.", "I did everything alone.", "The team was useless.", "I cannot remember."], answer: "A", explanation: "It shows collaboration and personal contribution.", tags: ["teamwork", "ownership"] },
    { title: "What does 'culture fit' usually mean in a NZ interview?", options: ["How you communicate, collaborate, take feedback and work with the team", "Whether you like the same sports", "Whether you never disagree", "Whether you work for free"], answer: "A", explanation: "Culture fit is about working style and values, not superficial similarity.", tags: ["nz", "culture"] },
    { title: "Which answer best handles 'What is your weakness?'", options: ["Name a real but manageable weakness, explain your system to improve it, and show progress", "I have no weaknesses", "I work too hard and care too much", "My old team was the problem"], answer: "A", explanation: "A credible weakness plus improvement plan shows self-awareness.", tags: ["weakness", "self-awareness"] },
    { title: "Which answer is strongest for 'Why this company?'", options: ["Connect role requirements, company domain, and your relevant experience", "Because I need any job", "Because it is close to home only", "Because your salary might be high"], answer: "A", explanation: "Specific alignment shows preparation and motivation.", tags: ["motivation", "company"] },
    { title: "In STAR, what does Task mean?", options: ["Your responsibility or goal in that situation", "A random to-do list", "The final result", "The employer brand"], answer: "A", explanation: "Task clarifies what you were responsible for.", tags: ["star", "task"] },
    { title: "Which answer best shows ownership?", options: ["I noticed the risk, raised it early, proposed options, and followed through on the chosen fix.", "I waited because it was not my job.", "I blamed the process.", "I hoped someone else would solve it."], answer: "A", explanation: "Ownership means noticing, communicating and acting responsibly.", tags: ["ownership", "risk"] },
    { title: "What should you do if the interviewer asks a vague behavioral question?", options: ["Clarify the focus briefly, then answer with one concrete example", "Answer with five unrelated examples", "Stay silent", "Say you cannot answer vague questions"], answer: "A", explanation: "A short clarification helps you target the example.", tags: ["clarifying", "behavioral"] },
    { title: "Which closing line is useful after a STAR answer?", options: ["That taught me to raise risks early and make trade-offs visible.", "Anyway, that's all.", "I forgot the result.", "The company was lucky."], answer: "A", explanation: "A learning line turns the example into evidence of growth.", tags: ["learning", "closing"] },
    { title: "For 'Tell me about a failure', which focus is best?", options: ["Accountability, what changed, and how you prevent recurrence", "Excuses", "Why it was someone else's fault", "Avoiding the topic"], answer: "A", explanation: "Failure answers should show learning and improved behavior.", tags: ["failure", "learning"] },
    { title: "Which NZ interview behavior is usually appreciated?", options: ["Clear, modest confidence with evidence", "Aggressive self-promotion with no examples", "Interrupting to prove speed", "Refusing feedback"], answer: "A", explanation: "Balanced confidence tends to land well in NZ workplaces.", tags: ["nz", "communication"] },
    { title: "What is a good way to answer 'How do you handle feedback?'", options: ["Give an example where you listened, adjusted, and improved the outcome", "Say feedback is usually wrong", "Say you ignore negative comments", "Say only managers need feedback"], answer: "A", explanation: "A feedback example proves coachability.", tags: ["feedback", "coachability"] },
    { title: "Which answer best addresses prioritisation?", options: ["Explain criteria: urgency, impact, dependencies, stakeholder expectations, then trade-offs", "Do the easiest task first always", "Work randomly", "Avoid telling stakeholders"], answer: "A", explanation: "Prioritisation is about visible trade-offs and communication.", tags: ["prioritisation", "stakeholders"] },
    { title: "What should you include when answering a communication question?", options: ["Audience, channel, message, check for understanding, outcome", "Only the tool name", "Only that you are friendly", "A complaint about meetings"], answer: "A", explanation: "Communication examples should show intentional choices.", tags: ["communication", "template"] },
    { title: "Which is a practical template for stakeholder disagreement?", options: ["Context, shared goal, disagreement, evidence, options, decision, result", "Argue until you win", "Avoid the stakeholder", "Escalate immediately without facts"], answer: "A", explanation: "Good disagreement answers show alignment and evidence.", tags: ["stakeholders", "conflict"] },
    { title: "How should you answer 'Why are you leaving your current role?'", options: ["Keep it professional and future-focused: growth, alignment, new challenge", "Criticise your manager", "Reveal confidential issues", "Say you hate the company"], answer: "A", explanation: "Professional, future-focused answers reduce risk.", tags: ["leaving", "professionalism"] },
    { title: "Which salary answer is usually safest early in process?", options: ["Ask for range or state a researched range while staying flexible", "Give an extreme number with no context", "Say money does not matter", "Refuse to discuss politely forever"], answer: "A", explanation: "A researched range keeps the conversation grounded.", tags: ["salary", "nz"] },
    { title: "What should you prepare for NZ reference checks?", options: ["Managers or senior colleagues who can verify work style and outcomes", "A friend who never worked with you", "No one", "Only anonymous contacts"], answer: "A", explanation: "NZ employers often value practical reference checks.", tags: ["references", "nz"] },
    { title: "Which phrase is most useful for answering 'Do you have NZ experience?'", options: ["I have worked with similar expectations: clear communication, ownership, and adapting quickly to local context.", "No, so I cannot do the job.", "NZ experience is irrelevant and stupid.", "I refuse to answer."], answer: "A", explanation: "Bridge transferable experience without being defensive.", tags: ["nz-experience", "transferable"] },
    { title: "What is a good answer pattern for visa/work rights questions?", options: ["State your current work rights clearly and briefly, then return to role fit", "Hide your status", "Give a long legal lecture", "Change the subject"], answer: "A", explanation: "Clear work-rights communication prevents uncertainty.", tags: ["work-rights", "nz"] },
    { title: "Which question should you ask at the end of an interview?", options: ["What would success look like in the first 3-6 months?", "How soon can I take leave before starting?", "Do you monitor every minute?", "Can I skip onboarding?"], answer: "A", explanation: "Success criteria questions show practical interest.", tags: ["questions", "closing"] },
    { title: "Which end-of-interview question explores team culture well?", options: ["How does the team give feedback and make technical decisions?", "Who is the weakest person on the team?", "Do people gossip?", "Can I avoid meetings?"], answer: "A", explanation: "It reveals collaboration style without sounding negative.", tags: ["culture", "questions"] },
    { title: "Which multiple-choice set are useful STAR result signals?", type: "multiple", options: ["Time saved", "Bug rate reduced", "Stakeholder satisfaction improved", "The story sounded dramatic"], answer: ["A", "B", "C"], explanation: "Good results are observable: time, quality, satisfaction, risk, revenue, reliability.", tags: ["star", "metrics"] },
    { title: "Which are good action verbs for interview answers?", type: "multiple", options: ["clarified", "prioritised", "measured", "complained"], answer: ["A", "B", "C"], explanation: "Action verbs should show constructive work.", tags: ["language", "action"] },
    { title: "Which are risky in NZ behavioral interviews?", type: "multiple", options: ["Over-claiming individual credit", "Badmouthing previous employers", "Showing no reflection", "Giving concise examples"], answer: ["A", "B", "C"], explanation: "Concise examples are good; blame and over-claiming are risky.", tags: ["nz", "risk"] },
    { title: "Which details make a technical leadership answer stronger?", type: "multiple", options: ["Trade-off considered", "People aligned", "Risk reduced", "Only the tool brand"], answer: ["A", "B", "C"], explanation: "Leadership answers need judgment, alignment and impact.", tags: ["leadership", "technical"] },
    { title: "Which are good ways to explain a career gap?", type: "multiple", options: ["Brief honest context", "Skills maintained or projects completed", "Focus back to readiness for the role", "Invent employment"], answer: ["A", "B", "C"], explanation: "Keep the answer honest, brief and forward-looking.", tags: ["career-gap", "honesty"] },
    { title: "STAR stands for Situation, Task, Action, Result.", type: "boolean", answer: true, explanation: "That is the standard STAR structure.", tags: ["star"] },
    { title: "In a behavioral answer, it is better to spend most of the time describing the company background.", type: "boolean", answer: false, explanation: "Spend most time on your actions and outcome.", tags: ["behavioral"] },
    { title: "NZ employers may value direct but respectful communication.", type: "boolean", answer: true, explanation: "Clear and respectful communication is commonly valued.", tags: ["nz", "communication"] },
    { title: "It is safe to invent metrics if the story sounds better.", type: "boolean", answer: false, explanation: "Use honest estimates or observable results; do not fabricate.", tags: ["honesty", "metrics"] },
    { title: "A good weakness answer should include an improvement system.", type: "boolean", answer: true, explanation: "The system shows self-awareness and progress.", tags: ["weakness"] },
    { title: "Fill in the blank: The A in STAR stands for ____.", type: "blank", answer: "Action", explanation: "Action is what you personally did.", tags: ["star"] },
    { title: "Fill in the blank: The R in SAR/CAR/STAR stands for ____.", type: "blank", answer: "Result", explanation: "Result is the outcome or impact.", tags: ["template"] },
    { title: "Fill in the blank: A good NZ-style answer should be confident but not ____.", type: "blank", answer: "arrogant", explanation: "Modest confidence is generally safer than arrogance.", tags: ["nz", "tone"] },
    { title: "Fill in the blank: For stakeholder questions, show the shared ____ before disagreement.", type: "blank", answer: "goal", explanation: "A shared goal frames disagreement constructively.", tags: ["stakeholders"] },
    { title: "Fill in the blank: Before giving salary expectations, research the market ____.", type: "blank", answer: "range", explanation: "A researched range is more credible than a random number.", tags: ["salary"] },
    { title: "Choose the best template for 'A customer changed requirements late in delivery.'", options: ["Situation: late change; Task: protect delivery; Action: clarify impact/options; Result: agreed scope", "Say yes to everything", "Refuse all change", "Ignore the customer"], answer: "A", explanation: "This frames trade-offs and stakeholder management.", tags: ["stakeholder", "star"] },
    { title: "Choose the best template for 'You disagreed with a senior engineer.'", options: ["Shared goal, evidence, options, respectful discussion, final decision", "Prove they were wrong publicly", "Avoid the engineer", "Escalate without discussion"], answer: "A", explanation: "Respectful disagreement is a strong senior behavior.", tags: ["disagreement", "technical"] },
    { title: "Choose the best template for 'You had too many tasks.'", options: ["List work, assess impact/urgency, confirm priorities, communicate trade-offs", "Work all night silently", "Do random tasks", "Hide the delay"], answer: "A", explanation: "Prioritisation answers should show visibility and trade-offs.", tags: ["prioritisation"] },
    { title: "Choose the best template for 'You joined a new team and had to learn quickly.'", options: ["Context, learning plan, people consulted, first contribution, result", "Pretend you knew everything", "Wait for formal training only", "Avoid asking questions"], answer: "A", explanation: "This shows initiative and learning agility.", tags: ["learning", "onboarding"] },
    { title: "Choose the best template for 'You improved a process.'", options: ["Problem, baseline, change made, adoption, measurable result", "Say the process was bad", "Only name the tool", "Skip the result"], answer: "A", explanation: "Improvement answers need baseline and measurable impact.", tags: ["process", "impact"] }
  ];

  questions.push(...seeds.map((seed, index): Question => ({
    id: `${suiteId}-q${index + 1}`,
    scope: "public",
    suiteId,
    type: seed.type || "single",
    title: seed.title,
    difficulty: index > 30 ? "medium" : "easy",
    tags: ["nz-interview", ...(seed.tags || [])],
    media: [],
    options: seed.options?.map((text, optionIndex) => ({ id: String.fromCharCode(65 + optionIndex), text })),
    answer: seed.answer,
    explanation: seed.explanation,
    metadata: {}
  })));
}

loadNzInterviewSkillsSuite();

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
ensureCodingProblems();

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

function ensureCodingProblems() {
  for (const question of questions) {
    if (question.type !== "coding" || !question.problemId || problems.some((problem) => problem.id === question.problemId)) continue;
    const functionName = camelName(question.title);
    problems.push({
      id: question.problemId,
      scope: "public",
      title: question.title,
      slug: question.problemId,
      type: "coding",
      difficulty: question.difficulty,
      tags: question.tags.length ? question.tags : ["coding"],
      statement: question.description || question.title,
      configJson: {
        functionName,
        entrypoint: {
          python: snakeName(question.title),
          typescript: functionName,
          javascript: functionName,
          csharp: pascalName(question.title),
          java: functionName
        },
        signature: {
          python: `def ${snakeName(question.title)}(*args):`,
          typescript: `function ${functionName}(...args: unknown[]): unknown`,
          javascript: `function ${functionName}(...args)`,
          csharp: `public object ${pascalName(question.title)}(params object[] args)`,
          java: `public Object ${functionName}(Object... args)`
        },
        checker: "exact",
        timeLimitMs: 5000,
        memoryLimitMb: 128
      },
      version: 1,
      published: true
    });
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
      title: `${profile.label} reinforcement ${index}: What is the main issue in this snippet?`,
      codeLanguage: profile.tag,
      code: `function calculate(items) {\\n  return items.map(x => x.value).reduce((a, b) => a + b);\\n}`,
      options: ["It can throw on an empty list because reduce has no initial value", "map cannot return numbers", "The function must be async", "The variable names are too short to compile"],
      answer: "A",
      explanation: "Calling reduce without an initial value fails when the array is empty."
    }
  ];
  const variant = variants[(index - 1) % variants.length];
  const metadata = variant.code ? { code: variant.code.replace(/\\n/g, "\n"), codeLanguage: variant.codeLanguage } : {};
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
    metadata
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
  const code = fields.code ? fields.code.replace(/\\n/g, "\n") : undefined;
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
    metadata: code ? { code, codeLanguage: fields.codeLang || fields.language || "text" } : {}
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

function words(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g) || ["solve"];
}

function camelName(value: string) {
  const parts = words(value);
  return parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function pascalName(value: string) {
  return words(value).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function snakeName(value: string) {
  return words(value).join("_");
}
