import { useEffect, useMemo, useState, type CSSProperties, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import type { AuthSession, BankScope, Language, PracticeFeedbackMode, PracticeSessionMode, Problem, Question, StudyDashboard, Submission, TopicNode, TrainingSuite, User } from "@ace/shared";
import CodeMirror from "@uiw/react-codemirror";
import { java } from "@codemirror/lang-java";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { EditorView } from "@codemirror/view";
import { csharp } from "@replit/codemirror-lang-csharp";
import { api, clearAuthToken, setAuthToken } from "./api";
import "./styles.css";

const starterCode = {
  python: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i",
  typescript:
    "function twoSum(nums: number[], target: number): number[] {\n  const seen = new Map<number, number>();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need)!, i];\n    seen.set(nums[i], i);\n  }\n  return [];\n}",
  javascript:
    "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n}",
  sql: "-- SQL runner will be enabled later.\nselect 1;",
  csharp:
    "public class Solution\n{\n    public int[] TwoSum(int[] nums, int target)\n    {\n        var seen = new Dictionary<int, int>();\n        for (var i = 0; i < nums.Length; i++)\n        {\n            var need = target - nums[i];\n            if (seen.TryGetValue(need, out var index)) return new[] { index, i };\n            seen[nums[i]] = i;\n        }\n        return Array.Empty<int>();\n    }\n}",
  java:
    "import java.util.*;\n\npublic class Solution {\n  public int[] twoSum(int[] nums, int target) {\n    Map<Integer, Integer> seen = new HashMap<>();\n    for (int i = 0; i < nums.length; i++) {\n      int need = target - nums[i];\n      if (seen.containsKey(need)) return new int[] { seen.get(need), i };\n      seen.put(nums[i], i);\n    }\n    return new int[0];\n  }\n}"
} satisfies Record<Language, string>;

const languages: Language[] = ["python", "typescript", "javascript", "csharp", "java"];

function getStarterCode(language: Language, problem?: Problem, question?: Question) {
  const signatureMap = problem?.configJson.signature && typeof problem.configJson.signature === "object"
    ? problem.configJson.signature as Partial<Record<Language, string>>
    : undefined;
  const signature = signatureMap?.[language] || inferSignature(language, question?.title || problem?.title || "Solve");
  switch (language) {
    case "python":
      return `${signature}\n    pass`;
    case "typescript":
    case "javascript":
      return signature.includes("{") ? signature : `${signature} {\n  // TODO\n}`;
    case "csharp":
      return `public class Solution\n{\n    ${signature}\n    {\n        // TODO\n    }\n}`;
    case "java":
      return `public class Solution {\n  ${signature} {\n    // TODO\n  }\n}`;
    default:
      return starterCode[language];
  }
}

function inferSignature(language: Language, title: string) {
  const camel = camelName(title);
  switch (language) {
    case "python":
      return `def ${snakeName(title)}(*args):`;
    case "typescript":
      return `function ${camel}(...args: unknown[]): unknown`;
    case "javascript":
      return `function ${camel}(...args)`;
    case "csharp":
      return `public object ${pascalName(title)}(params object[] args)`;
    case "java":
      return `public Object ${camel}(Object... args)`;
    default:
      return "solve";
  }
}

function titleWords(value: string) {
  return value.toLowerCase().match(/[a-z0-9]+/g) || ["solve"];
}

function camelName(value: string) {
  const parts = titleWords(value);
  return parts[0] + parts.slice(1).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function pascalName(value: string) {
  return titleWords(value).map((part) => part[0].toUpperCase() + part.slice(1)).join("");
}

function snakeName(value: string) {
  return titleWords(value).join("_");
}

const codeEditorTheme = EditorView.theme({
  "&": {
    minHeight: "300px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#ffffff",
    color: "#172033"
  },
  ".cm-scroller": {
    minHeight: "300px",
    fontFamily: "\"JetBrains Mono\", \"SFMono-Regular\", Consolas, monospace",
    fontSize: "14px",
    lineHeight: "1.55"
  },
  ".cm-content": {
    padding: "16px"
  },
  ".cm-gutters": {
    backgroundColor: "#f8fafc",
    color: "#64748b",
    borderRight: "1px solid #e2e8f0"
  },
  ".cm-activeLine": {
    backgroundColor: "#eff6ff"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#dbeafe"
  },
  ".cm-cursor": {
    borderLeftColor: "#2563eb"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "#bfdbfe"
  }
});

const defaultRaw = `@suite
title=Imported Mixed Practice
description=Paste a whole suite here. Then set time, validate, confirm overwrite, and practice.
duration=15

@outline
## Learning Outline
- Core idea: what this suite is training
- Key terms: concepts learners should recognize
- Common traps: mistakes the questions should expose
- Source notes: optional links or lesson notes

@q
type=single
title=What happens when this JavaScript runs?
codeLang=javascript
code=const items = [];\\nconst total = items.reduce((sum, item) => sum + item.value);
A=It throws because reduce has no initial value
B=It returns 0
C=It returns undefined
answer=A
explanation=Array.prototype.reduce needs an initial value when the array can be empty.
tags=javascript,array

@q
type=boolean
title=JavaScript and TypeScript can both run through the Node runner.
answer=true
tags=runner`;

const aiPromptTemplate = `You are generating one complete practice suite for Ace Practice.

Return ONLY raw text in the exact parser format below. Do not wrap the whole response in Markdown fences.

Rules:
- The suite belongs to the selected topic and must be self-contained.
- Supported question types only: single, multiple, boolean, blank, coding.
- Use a balanced mix unless the user asks for only one type.
- Every non-coding question must include answer= and explanation=.
- Include an optional @outline block after @suite when the suite is based on a lesson, article, or learning path page.
- The @outline block is Markdown for a readable knowledge note. Supported formatting: ##/### headings, bullet lists, **important terms**, ==highlighted traps==, inline code like \`class Person\`, and fenced code blocks with ~~~language.
- Do not put raw HTML in @outline. Prefer short sections, scannable bullets, and one small code example only when it helps.

Single-choice example (exactly one correct answer):
@q
type=single
title=Which principle means one class should have one reason to change?
A=Single Responsibility Principle
B=Open Closed Principle
C=Dependency Inversion Principle
answer=A
explanation=SRP keeps a class focused on one responsibility.
tags=oop,solid

Code-choice example (question stem + code area + choices):
@q
type=single
title=What is the main bug in this snippet?
codeLang=javascript
code=const items = [];\\nconst total = items.reduce((sum, item) => sum + item.value);
A=It can throw because reduce has no initial value
B=map must be called before reduce
C=const cannot store numbers
D=The array syntax is invalid
answer=A
explanation=Calling reduce without an initial value fails on an empty array.
tags=javascript,array,debugging

Multiple-choice example (multiple correct answers):
@q
type=multiple
title=Which of these are SOLID principles? (Select all that apply)
A=DRY (Don't Repeat Yourself)
B=Single Responsibility Principle
C=Interface Segregation Principle
D=Copy-paste principle
answer=B,C
explanation=SRP and ISP are SOLID principles. DRY and Copy-paste are not part of SOLID.
tags=oop,solid

Boolean example (true/false statement):
@q
type=boolean
title=JavaScript and TypeScript can both run through the Node runner.
answer=true
explanation=Both languages run on Node.js runtime.
tags=runner,js

Fill-in-blank example (exact text match):
@q
type=blank
title=In Python, use ___ to create an empty list.
answer=[]
explanation=The square bracket notation creates an empty list in Python.
tags=python,basics

Coding example (with problem ID and starter code):
@q
type=coding
title=Two Sum Problem
description=Given an array of integers and a target sum, return indices of two numbers that add up to target.
problemId=two-sum
tags=arrays,hashmap

Format:
@suite
title=<suite title>
description=<what this suite trains>
duration=<minutes>

@outline
## Knowledge Outline
### Core idea
- **Learning objective:** what this suite trains and why it matters.
- **Mental model:** the smallest useful explanation a learner should remember.

### Key terms
- **Term:** short definition with inline code when useful, e.g. \`new Person()\`.
- **Term:** short definition.

### Important distinctions
- **A vs B:** explain the difference.
- **Common signal:** what to look for in code or questions.

### Common traps
- ==Trap to notice:== why learners often get this wrong.
- ==Trap to notice:== another mistake the questions should expose.

### Code shape
~~~csharp
// Optional small example. Use only when the source lesson has code worth remembering.
var item = new Example();
~~~

### Source notes
- Optional lesson title, page, or link notes.

@q
type=<single|multiple|boolean|blank|coding>
title=<question>
[type-specific fields]
answer=<answer>
explanation=<why>
tags=<comma,separated,tags>`;

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [topics, setTopics] = useState<TopicNode[]>([]);
  const [suites, setSuites] = useState<TrainingSuite[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [problems, setProblems] = useState<Problem[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [activeTopicId, setActiveTopicId] = useState("topic-arrays");
  const [activeSuiteId, setActiveSuiteId] = useState("suite-two-sum");
  const [scope, setScope] = useState<BankScope>("public");
  const [mode, setMode] = useState<"config" | "practice">("config");
  const [questionIndex, setQuestionIndex] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  const [feedback, setFeedback] = useState("");
  const [finalSubmitted, setFinalSubmitted] = useState(false);
  const [activePracticeMode, setActivePracticeMode] = useState<PracticeSessionMode>("practice");
  const [studyDashboard, setStudyDashboard] = useState<StudyDashboard | undefined>();
  const [suiteFeedbackMode, setSuiteFeedbackMode] = useState<Record<string, PracticeFeedbackMode>>({});
  const [language, setLanguage] = useState<Language>("python");
  const [sourceCode, setSourceCode] = useState(starterCode.python);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", displayName: "New Learner" });
  const [authError, setAuthError] = useState("");
  const [rawText, setRawText] = useState(defaultRaw);
  const [rawPreview, setRawPreview] = useState("");
  const [rawParsedQuestions, setRawParsedQuestions] = useState<Question[]>([]);
  const [editorMessage, setEditorMessage] = useState("");
  const [newTopicName, setNewTopicName] = useState<Record<BankScope, string>>({ public: "", personal: "" });
  const [newSuiteTitle, setNewSuiteTitle] = useState<Record<BankScope, string>>({ public: "", personal: "" });
  const [openBank, setOpenBank] = useState<Record<BankScope, boolean>>({ public: true, personal: true });
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});
  const [sidebarWidth, setSidebarWidth] = useState(320);
  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});
  const [editingDescription, setEditingDescription] = useState<Record<string, string>>({});
  const [editingDuration, setEditingDuration] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [modalOpen, setModalOpen] = useState<"topic" | "suite" | null>(null);
  const [modalScope, setModalScope] = useState<BankScope>("public");
  const [modalParentTopic, setModalParentTopic] = useState<TopicNode | null>(null);
  const [topicActionTarget, setTopicActionTarget] = useState<TopicNode | null>(null);
  const [moveTopicTarget, setMoveTopicTarget] = useState<TopicNode | null>(null);
  const [moveParentId, setMoveParentId] = useState("");
  const [questionResults, setQuestionResults] = useState<Record<string, "correct" | "incorrect">>({});

  const publicTopics = topics.filter((topic) => topic.scope === "public");
  const personalTopics = topics.filter((topic) => topic.scope === "personal");
  const activeSuite = suites.find((suite) => suite.id === activeSuiteId);
  const canEditActiveSuite = Boolean(activeSuite && canManageScoped(activeSuite, user));
  const activeFeedbackMode = (activeSuiteId && suiteFeedbackMode[activeSuiteId]) || activeSuite?.feedbackMode || "instant";
  const activeQuestions = questions.filter((question) => question.suiteId === activeSuiteId);
  const currentQuestion = activeQuestions[questionIndex];
  const codingQuestion = currentQuestion?.type === "coding" ? currentQuestion : undefined;
  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === codingQuestion?.problemId),
    [codingQuestion, problems]
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    if (!codingQuestion) return;
    setSourceCode(getStarterCode(language, selectedProblem, codingQuestion));
  }, [codingQuestion?.id, language, selectedProblem?.id]);

  useEffect(() => {
    if (!user) return;
    void refreshWorkspace();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    void refreshStudyDashboard();
  }, [user]);

  useEffect(() => {
    if (!submissions.some((submission) => submission.status === "queued" || submission.status === "running")) return;
    const timer = window.setInterval(() => void refreshSubmissions(), 1000);
    return () => window.clearInterval(timer);
  }, [submissions]);

  useEffect(() => {
    if (mode !== "practice") return;
    setRemainingSeconds((activeSuite?.durationMinutes || 10) * 60);
  }, [mode, activeSuite?.durationMinutes, activeSuiteId]);

  useEffect(() => {
    if (mode !== "practice" || remainingSeconds <= 0) return;
    const timer = window.setInterval(() => setRemainingSeconds((seconds) => Math.max(0, seconds - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [mode, remainingSeconds]);

  async function bootstrap() {
    try {
      setUser(await api.me());
    } catch {
      clearAuthToken();
    }
  }

  async function refreshWorkspace(selection?: { scope?: BankScope; topicId?: string; suiteId?: string }) {
    const [topicList, suiteList, questionList, problemList, submissionList] = await Promise.all([
      api.listTopics(),
      api.listSuites(),
      api.listQuestions(),
      api.listProblems(),
      api.listSubmissions()
    ]);
    const selectedScope = selection?.scope || scope;
    let selectedTopicId = selection?.topicId || activeTopicId;
    const selectedSuiteId = selection?.suiteId !== undefined ? selection.suiteId : activeSuiteId;
    let activeTopicIds = collectTopicIds(topicList, selectedTopicId);
    if (!activeTopicIds.size) {
      selectedTopicId = flattenTopics(topicList).find((topic) => topic.scope === selectedScope)?.id || "";
      activeTopicIds = selectedTopicId ? collectTopicIds(topicList, selectedTopicId) : new Set();
    }
    const scopedSuites = suiteList.filter((suite) => suite.scope === selectedScope && activeTopicIds.has(suite.topicId));
    setTopics(topicList);
    setSuites(suiteList);
    setQuestions(questionList);
    setProblems(problemList);
    setSubmissions(submissionList);
    if (selection?.scope) setScope(selection.scope);
    if (selectedTopicId) setActiveTopicId(selectedTopicId);
    const nextSuiteId =
      selection?.suiteId === ""
        ? ""
        : scopedSuites.some((suite) => suite.id === selectedSuiteId)
          ? selectedSuiteId
          : scopedSuites[0]?.id || "";
    setActiveSuiteId(nextSuiteId);
    if (selectedSuiteId !== activeSuiteId || selection?.suiteId !== undefined) {
      setQuestionIndex(0);
    }
  }

  async function refreshSubmissions() {
    setSubmissions(await api.listSubmissions());
  }

  async function refreshStudyDashboard(suiteId?: string) {
    setStudyDashboard(await api.getStudyDashboard(suiteId));
  }

  async function startStudySession(sessionMode: PracticeSessionMode) {
    if (!activeSuite) return;
    setActivePracticeMode(sessionMode);
    setFeedback("");
    setFinalSubmitted(false);
    setQuestionResults({});
    if (sessionMode === "practice") {
      const dashboard = await api.getStudyDashboard(activeSuite.id);
      setAnswers(dashboard.progress?.answers || {});
      setQuestionIndex(Math.min(dashboard.progress?.questionIndex || 0, Math.max(activeQuestions.length - 1, 0)));
    } else {
      setAnswers({});
      setQuestionIndex(0);
    }
    setMode("practice");
  }

  async function savePracticeDraft(nextAnswers: Record<string, unknown>, nextIndex = questionIndex) {
    if (!activeSuiteId || activePracticeMode !== "practice") return;
    await api.savePracticeProgress(activeSuiteId, { questionIndex: nextIndex, answers: nextAnswers });
    void refreshStudyDashboard();
  }

  async function recordCompletedQuestions(questionIds: string[]) {
    if (!activeSuiteId || !questionIds.length) return;
    await api.completeStudySession(activeSuiteId, {
      mode: activePracticeMode,
      questionIds,
      questionCount: activeQuestions.length
    });
    void refreshStudyDashboard();
  }

  function getAnsweredQuestionIds(nextAnswers = answers) {
    return activeQuestions
      .filter((question) => {
        const value = nextAnswers[question.id];
        return value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
      })
      .map((question) => question.id);
  }

  async function authenticate() {
    setAuthError("");
    try {
      const session: AuthSession = authMode === "login" ? await api.login(authForm) : await api.register(authForm);
      setAuthToken(session.token);
      setUser(session.user);
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Authentication failed");
    }
  }

  async function addTopic(targetScope: BankScope, parentTopic?: TopicNode | null) {
    const name = newTopicName[targetScope].trim();
    if (!name) return;
    try {
      const topic = await api.createTopic({ scope: targetScope, name, parentId: parentTopic?.id });
      setNewTopicName({ ...newTopicName, [targetScope]: "" });
      if (parentTopic) setOpenTopics({ ...openTopics, [parentTopic.id]: true });
      selectTopic(targetScope, topic.id);
      await refreshWorkspace({ scope: targetScope, topicId: topic.id, suiteId: "" });
    } catch (error) {
      alert("Failed to create topic: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function addSuite(targetScope: BankScope) {
    const title = newSuiteTitle[targetScope].trim();
    if (!title) return;
    const targetTopicId = pickSuiteTopicId(topics, targetScope, scope === targetScope ? activeTopicId : undefined);
    if (!targetTopicId) return;
    try {
      const suite = await api.createSuite({
        scope: targetScope,
        topicId: targetTopicId,
        title,
        description: "Created from the suite quick-add panel.",
        questionCount: 0,
        durationMinutes: 15,
        allowedTypes: ["single", "multiple", "boolean", "blank", "coding"],
        feedbackMode: "instant"
      });
      setNewSuiteTitle({ ...newSuiteTitle, [targetScope]: "" });
      setScope(targetScope);
      setActiveTopicId(suite.topicId);
      setActiveSuiteId(suite.id);
      setMode("config");
      await refreshWorkspace({ scope: targetScope, topicId: suite.topicId, suiteId: suite.id });
    } catch (error) {
      alert("Failed to create suite: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function deleteTopic(topicId: string) {
    if (!confirm("Delete this topic and all its suites? This cannot be undone.")) return;
    try {
      await api.deleteTopic(topicId);
      const deletedActiveTopic = collectTopicIds(topics, topicId).has(activeTopicId);
      await refreshWorkspace({
        scope,
        topicId: deletedActiveTopic ? "" : activeTopicId,
        suiteId: deletedActiveTopic ? "" : activeSuiteId
      });
    } catch (error) {
      alert("Failed to delete topic: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function deleteSuite(suiteId: string) {
    if (!confirm("Delete this suite and all its questions? This cannot be undone.")) return;
    try {
      await api.deleteSuite(suiteId);
      await refreshWorkspace({ scope, topicId: activeTopicId, suiteId: suiteId === activeSuiteId ? "" : activeSuiteId });
    } catch (error) {
      alert("Failed to delete suite: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function saveEditedSuite() {
    if (!activeSuite) return;
    if (!canEditActiveSuite) {
      alert("You do not have permission to edit this suite.");
      return;
    }
    if (isSavingEdit) return;
    
    setIsSavingEdit(true);
    try {
      const title = editingTitle[activeSuite.id] !== undefined ? editingTitle[activeSuite.id] : activeSuite.title;
      const description = editingDescription[activeSuite.id] !== undefined ? editingDescription[activeSuite.id] : activeSuite.description;
      const durationMinutes = editingDuration[activeSuite.id] !== undefined ? parseInt(editingDuration[activeSuite.id]) : activeSuite.durationMinutes;
      
      if (!title.trim()) {
        alert("Suite name cannot be empty");
        return;
      }
      
      if (isNaN(durationMinutes) || durationMinutes < 1 || durationMinutes > 240) {
        alert("Time limit must be between 1 and 240 minutes");
        return;
      }
      
      await api.updateSuite(activeSuite.id, { title: title.trim(), description, durationMinutes, feedbackMode: activeFeedbackMode });
      setEditingTitle(({ [activeSuite.id]: _removed, ...rest }) => rest);
      setEditingDescription(({ [activeSuite.id]: _removed, ...rest }) => rest);
      setEditingDuration(({ [activeSuite.id]: _removed, ...rest }) => rest);
      await refreshWorkspace({ scope, topicId: activeTopicId, suiteId: activeSuite.id });
      setEditorMessage("Suite updated successfully!");
      setTimeout(() => setEditorMessage(""), 3000);
    } catch (error) {
      alert("Failed to save suite: " + (error instanceof Error ? error.message : "Unknown error"));
    } finally {
      setIsSavingEdit(false);
    }
  }

  async function parseRaw() {
    if (!activeTopicId) return;
    try {
      const parsed = await api.parseTopicRaw({ scope, topicId: activeTopicId, raw: rawText });
      setRawPreview(JSON.stringify(parsed, null, 2));
      setRawParsedQuestions(parsed.questions);
      setEditorMessage(`Format valid. Parsed ${parsed.questions.length} questions for ${parsed.suite.title}.`);
    } catch (error) {
      alert("Raw format is invalid: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function validateAndImportRaw() {
    if (!activeTopicId || !activeSuite) return;
    try {
      const parsed = await api.parseTopicRaw({ scope, topicId: activeTopicId, raw: rawText });
      setRawPreview(JSON.stringify(parsed, null, 2));
      setRawParsedQuestions(parsed.questions);
      if (!confirm("Format valid. Import and overwrite this suite?")) {
        setEditorMessage(`Format valid. Parsed ${parsed.questions.length} questions for ${parsed.suite.title}.`);
        return;
      }
      const imported = await api.importTopicRaw({ scope, topicId: activeTopicId, suiteId: activeSuite.id, raw: rawText });
      setActiveSuiteId(imported.suite.id);
      setRawParsedQuestions(imported.questions);
      setEditorMessage(`Imported ${imported.questions.length} questions and overwrote ${imported.suite.title}.`);
      await refreshWorkspace({ scope, topicId: imported.suite.topicId, suiteId: imported.suite.id });
    } catch (error) {
      alert("Failed to validate/import raw suite: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  async function submitCode() {
    if (!selectedProblem) return;
    setIsSubmitting(true);
    try {
      const submission = await api.createSubmission({ problemId: selectedProblem.id, language, sourceCode });
      setSubmissions((items) => [submission, ...items]);
      if (activePracticeMode === "practice" && currentQuestion) {
        await recordCompletedQuestions([currentQuestion.id]);
      }
      window.setTimeout(() => void refreshSubmissions(), 700);
    } catch (error) {
      const now = new Date().toISOString();
      setSubmissions((items) => [{
        id: `local-error-${Date.now()}`,
        userId: user?.id || "local",
        problemId: selectedProblem.id,
        language,
        sourceCode,
        status: "system_error",
        result: {
          status: "system_error",
          stdout: "",
          stderr: error instanceof Error ? error.message : "Run failed",
          durationMs: 0,
          testcaseResults: []
        },
        createdAt: now,
        updatedAt: now
      }, ...items]);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function moveTopic() {
    if (!moveTopicTarget) return;
    try {
      const moved = await api.moveTopic(moveTopicTarget.id, { parentId: moveParentId || undefined });
      if (moveParentId) setOpenTopics({ ...openTopics, [moveParentId]: true });
      setMoveTopicTarget(null);
      setMoveParentId("");
      await refreshWorkspace({ scope: moved.scope, topicId: moved.id, suiteId: "" });
    } catch (error) {
      alert("Failed to move topic: " + (error instanceof Error ? error.message : "Unknown error"));
    }
  }

  function submitNonCoding() {
    if (!currentQuestion) return;
    const value = answers[currentQuestion.id];
    if (value === undefined || value === "" || (Array.isArray(value) && value.length === 0)) {
      setFeedback("Answer required.");
      return;
    }
    const expected = currentQuestion.answer;
    const ok = JSON.stringify(value) === JSON.stringify(expected);
    setQuestionResults((results) => ({ ...results, [currentQuestion.id]: ok ? "correct" : "incorrect" }));
    if (activePracticeMode === "practice") {
      void recordCompletedQuestions([currentQuestion.id]);
    }
    if (activePracticeMode === "practice" && ok && questionIndex < activeQuestions.length - 1) {
      const nextIndex = Math.min(questionIndex + 1, activeQuestions.length - 1);
      setFeedback("");
      setQuestionIndex(nextIndex);
      void savePracticeDraft(answers, nextIndex);
      return;
    }
    setFeedback(ok ? "Correct." : `Submitted. Expected answer: ${JSON.stringify(expected)}`);
  }

  function answerQuestion(questionId: string, value: unknown) {
    const nextAnswers = { ...answers, [questionId]: value };
    setAnswers(nextAnswers);
    if (!finalSubmitted) {
      setQuestionResults((results) => {
        if (!results[questionId]) return results;
        const nextResults = { ...results };
        delete nextResults[questionId];
        return nextResults;
      });
    }
    if (activePracticeMode === "practice") {
      setFeedback("");
      void savePracticeDraft(nextAnswers);
    }
  }

  function submitFinalPractice() {
    const answeredIds = getAnsweredQuestionIds();
    if (activePracticeMode === "exam" && answeredIds.length < activeQuestions.length) {
      setFeedback(`Exam requires all questions before submit. ${activeQuestions.length - answeredIds.length} remaining.`);
      return;
    }
    // Calculate results for all questions
    const results: Record<string, "correct" | "incorrect"> = { ...questionResults };
    for (const question of activeQuestions) {
      if (!results[question.id]) {
        const value = answers[question.id];
        if (value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0)) {
          const expected = question.answer;
          const ok = JSON.stringify(value) === JSON.stringify(expected);
          results[question.id] = ok ? "correct" : "incorrect";
        }
      }
    }
    setQuestionResults(results);
    setFinalSubmitted(true);
    setFeedback("Submitted. Answers and explanations are now visible.");
    void recordCompletedQuestions(answeredIds);
    if (activePracticeMode === "exam" && activeSuiteId) {
      void api.clearPracticeProgress(activeSuiteId);
    }
  }

  function selectTopic(targetScope: BankScope, id: string) {
    setScope(targetScope);
    setActiveTopicId(id);
    setActiveSuiteId("");
    setMode("config");
  }

  function selectFolder(targetScope: BankScope, topic: TopicNode) {
    setScope(targetScope);
    setActiveTopicId(topic.id);
    setActiveSuiteId("");
    setOpenTopics({ ...openTopics, [topic.id]: true });
    setMode("config");
  }

  function startSidebarResize(event: ReactMouseEvent<HTMLDivElement>) {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = sidebarWidth;
    const move = (moveEvent: MouseEvent) => {
      const next = Math.min(420, Math.max(260, startWidth + moveEvent.clientX - startX));
      setSidebarWidth(next);
    };
    const stop = () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", stop);
    };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", stop);
  }

  if (!user) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Ace Practice</p>
          <h1>Login to your training space</h1>
          <p className="muted">Admin manages public question banks. Members can keep personal question banks.</p>
          <label>Email<input type="email" autoComplete="email" value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} /></label>
          {authMode === "register" && <label>Display name<input value={authForm.displayName} onChange={(event) => setAuthForm({ ...authForm, displayName: event.target.value })} /></label>}
          <label>Password<input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} /></label>
          {authError && <pre className="error-box">{authError}</pre>}
          <button onClick={authenticate}>{authMode === "login" ? "Login" : "Create Account"}</button>
          <button className="link-button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>{authMode === "login" ? "Need a personal account?" : "Already have an account?"}</button>
        </section>
      </main>
    );
  }

  if (mode === "practice") {
    return (
      <PracticePanel
        suite={activeSuite}
        user={user}
        questions={activeQuestions}
        questionIndex={questionIndex}
        currentQuestion={currentQuestion}
        answers={answers}
        questionResults={questionResults}
        feedback={feedback}
        language={language}
        sourceCode={sourceCode}
        submissions={submissions}
        isSubmitting={isSubmitting}
        selectedProblem={selectedProblem}
        remainingSeconds={remainingSeconds}
        feedbackMode={activePracticeMode === "practice" ? "instant" : "final"}
        sessionMode={activePracticeMode}
        finalSubmitted={finalSubmitted}
        onBack={() => {
          if (activePracticeMode === "practice") void savePracticeDraft(answers, questionIndex);
          setMode("config");
        }}
        onQuestionIndex={(index) => { setQuestionIndex(index); setFeedback(""); }}
        onAnswer={answerQuestion}
        onSubmitNonCoding={submitNonCoding}
        onSubmitFinal={submitFinalPractice}
        onLanguage={setLanguage}
        onSourceCode={setSourceCode}
        onSubmitCode={() => void submitCode()}
        onRefresh={() => void refreshSubmissions()}
      />
    );
  }

  return (
    <main className="app-shell" style={{ gridTemplateColumns: `${sidebarWidth}px 8px minmax(0, 1fr)` }}>
      <aside className="sidebar">
        <div className="brand-row">
          <div><p className="eyebrow">Ace Practice</p><h1>Training</h1></div>
          <button className="icon-button" onClick={() => { clearAuthToken(); setUser(null); }}>Exit</button>
        </div>
        <div className="user-card"><strong>{user.displayName}</strong><span>{user.role} account</span></div>
        <BankPanel
          title="Public Question Bank"
          scope="public"
          topics={publicTopics}
          suites={suites.filter((suite) => suite.scope === "public")}
          activeScope={scope}
          activeTopicId={activeTopicId}
          activeSuiteId={activeSuiteId}
          user={user}
          open={openBank.public}
          openTopics={openTopics}
          newTopicName={newTopicName.public}
          newSuiteTitle={newSuiteTitle.public}
          onToggleBank={() => setOpenBank({ ...openBank, public: !openBank.public })}
          onToggleTopic={(id) => setOpenTopics({ ...openTopics, [id]: !openTopics[id] })}
          onSelectTopic={selectTopic}
          onSelectFolder={selectFolder}
          onSelectSuite={(id) => {
            const selected = suites.find((suite) => suite.id === id);
            setScope("public");
            setActiveTopicId(selected?.topicId || activeTopicId);
            setActiveSuiteId(id);
            setMode("config");
          }}
          onTopicName={(value) => setNewTopicName({ ...newTopicName, public: value })}
          onSuiteTitle={(value) => setNewSuiteTitle({ ...newSuiteTitle, public: value })}
          onAddTopic={() => void addTopic("public")}
          onAddSuite={() => void addSuite("public")}
          onOpenModal={(type, scope, parentTopic) => { setModalOpen(type); setModalScope(scope); setModalParentTopic(parentTopic || null); }}
          onOpenTopicActions={setTopicActionTarget}
          onDeleteTopic={deleteTopic}
          onDeleteSuite={deleteSuite}
        />
        <BankPanel
          title="Personal Question Bank"
          scope="personal"
          topics={personalTopics}
          suites={suites.filter((suite) => suite.scope === "personal")}
          activeScope={scope}
          activeTopicId={activeTopicId}
          activeSuiteId={activeSuiteId}
          user={user}
          open={openBank.personal}
          openTopics={openTopics}
          newTopicName={newTopicName.personal}
          newSuiteTitle={newSuiteTitle.personal}
          onToggleBank={() => setOpenBank({ ...openBank, personal: !openBank.personal })}
          onToggleTopic={(id) => setOpenTopics({ ...openTopics, [id]: !openTopics[id] })}
          onSelectTopic={selectTopic}
          onSelectFolder={selectFolder}
          onSelectSuite={(id) => {
            const selected = suites.find((suite) => suite.id === id);
            setScope("personal");
            setActiveTopicId(selected?.topicId || activeTopicId);
            setActiveSuiteId(id);
            setMode("config");
          }}
          onTopicName={(value) => setNewTopicName({ ...newTopicName, personal: value })}
          onSuiteTitle={(value) => setNewSuiteTitle({ ...newSuiteTitle, personal: value })}
          onAddTopic={() => void addTopic("personal")}
          onAddSuite={() => void addSuite("personal")}
          onOpenModal={(type, scope, parentTopic) => { setModalOpen(type); setModalScope(scope); setModalParentTopic(parentTopic || null); }}
          onOpenTopicActions={setTopicActionTarget}
          onDeleteTopic={deleteTopic}
          onDeleteSuite={deleteSuite}
        />
      </aside>
      <div className="sidebar-resizer" onMouseDown={startSidebarResize} aria-label="Resize sidebar" />

      <section className="workspace">
        {mode === "config" && activeSuite ? (
          <>
            <StudyDashboardPanel
              dashboard={studyDashboard}
              questionCount={activeQuestions.length}
              selectedSuiteTitle={activeSuite.title}
              onStartPractice={() => void startStudySession("practice")}
              onStartExam={() => void startStudySession("exam")}
            />
            <SuiteConfig
              scope={scope}
              activeSuite={activeSuite}
              canEditSuite={canEditActiveSuite}
              activeQuestions={activeQuestions}
              answers={answers}
              questionResults={questionResults}
              rawParsedQuestions={rawParsedQuestions}
              activeTopicId={activeTopicId}
              feedbackMode={activeFeedbackMode}
              rawText={rawText}
              rawPreview={rawPreview}
              editorMessage={editorMessage}
              onRawText={setRawText}
              onParseRaw={() => void parseRaw()}
              onValidateRaw={() => void validateAndImportRaw()}
              aiPromptTemplate={aiPromptTemplate}
              onFeedbackMode={(value) => activeSuiteId && canEditActiveSuite && setSuiteFeedbackMode({ ...suiteFeedbackMode, [activeSuiteId]: value })}
              editingTitle={editingTitle}
              editingDescription={editingDescription}
              editingDuration={editingDuration}
              isSavingEdit={isSavingEdit}
              onEditTitle={(id, value) => setEditingTitle({ ...editingTitle, [id]: value })}
              onEditDescription={(id, value) => setEditingDescription({ ...editingDescription, [id]: value })}
              onEditDuration={(id, value) => setEditingDuration({ ...editingDuration, [id]: value })}
              onSaveEdit={() => void saveEditedSuite()}
              onDeleteSuite={deleteSuite}
            />
          </>
        ) : mode === "config" ? (
          <EmptySuiteState
            scope={scope}
            canAdd={scope === "personal" || user.role === "admin"}
            canDelete={Boolean(activeTopicId) && (scope === "personal" || user.role === "admin")}
            onAddSuite={() => void addSuite(scope)}
            onDeleteTopic={() => activeTopicId && void deleteTopic(activeTopicId)}
            suiteTitle={newSuiteTitle[scope]}
            onSuiteTitle={(value) => setNewSuiteTitle({ ...newSuiteTitle, [scope]: value })}
          />
        ) : null}
      </section>
      <AddItemModal
        type={modalOpen || "topic"}
        scope={modalScope}
        parentTopic={modalOpen === "topic" ? modalParentTopic : null}
        open={modalOpen !== null}
        value={modalOpen === "topic" ? newTopicName[modalScope] : newSuiteTitle[modalScope]}
        onValue={(value) => {
          if (modalOpen === "topic") {
            setNewTopicName({ ...newTopicName, [modalScope]: value });
          } else {
            setNewSuiteTitle({ ...newSuiteTitle, [modalScope]: value });
          }
        }}
        onAdd={async () => {
          if (modalOpen === "topic") {
            await addTopic(modalScope, modalParentTopic);
          } else {
            await addSuite(modalScope);
          }
          setModalOpen(null);
          setModalParentTopic(null);
          setNewTopicName({ ...newTopicName, [modalScope]: "" });
          setNewSuiteTitle({ ...newSuiteTitle, [modalScope]: "" });
        }}
        onClose={() => {
          setModalOpen(null);
          setModalParentTopic(null);
          setNewTopicName({ ...newTopicName, [modalScope]: "" });
          setNewSuiteTitle({ ...newSuiteTitle, [modalScope]: "" });
        }}
      />
      <MoveTopicModal
        open={Boolean(moveTopicTarget)}
        topic={moveTopicTarget}
        topics={moveTopicTarget?.scope === "personal" ? personalTopics : publicTopics}
        parentId={moveParentId}
        onParentId={setMoveParentId}
        onMove={() => void moveTopic()}
        onClose={() => { setMoveTopicTarget(null); setMoveParentId(""); }}
      />
      <TopicActionModal
        open={Boolean(topicActionTarget)}
        topic={topicActionTarget}
        onAddChild={(topic) => {
          setTopicActionTarget(null);
          setModalOpen("topic");
          setModalScope(topic.scope);
          setModalParentTopic(topic);
        }}
        onMove={(topic) => {
          setTopicActionTarget(null);
          setMoveTopicTarget(topic);
          setMoveParentId(topic.parentId || "");
        }}
        onClose={() => setTopicActionTarget(null)}
      />
    </main>
  );
}

function AddItemModal(props: {
  type: "topic" | "suite";
  scope: BankScope;
  parentTopic?: TopicNode | null;
  open: boolean;
  value: string;
  onValue: (value: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  if (!props.open) return null;
  
  const placeholder = props.type === "topic" ? "New topic name" : "New suite title";
  const title = props.type === "topic" ? (props.parentTopic ? "Add Child Topic" : "Add Topic") : "Add Suite";
  
  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        {props.parentTopic && <p className="modal-context">Under {props.parentTopic.name}</p>}
        <input
          placeholder={placeholder}
          value={props.value}
          onChange={(e) => props.onValue(e.target.value)}
          onKeyPress={(e) => e.key === "Enter" && props.value.trim() && props.onAdd()}
          autoFocus
        />
        <div className="modal-actions">
          <button onClick={() => { if (props.value.trim()) props.onAdd(); }} disabled={!props.value.trim()}>Add</button>
          <button className="secondary" onClick={props.onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function MoveTopicModal(props: {
  open: boolean;
  topic: TopicNode | null;
  topics: TopicNode[];
  parentId: string;
  onParentId: (value: string) => void;
  onMove: () => void;
  onClose: () => void;
}) {
  if (!props.open || !props.topic) return null;
  const options = getMoveParentOptions(props.topics, props.topic.id);
  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content" onClick={(event) => event.stopPropagation()}>
        <h3>Move Project</h3>
        <p className="modal-context">Move {props.topic.name} under another project.</p>
        <label className="modal-field">
          Target parent
          <select value={props.parentId} onChange={(event) => props.onParentId(event.target.value)}>
            <option value="">Top level</option>
            {options.map((option) => (
              <option key={option.topic.id} value={option.topic.id}>{`${"  ".repeat(option.depth)}${option.topic.name}`}</option>
            ))}
          </select>
        </label>
        <div className="modal-actions">
          <button onClick={props.onMove}>Move</button>
          <button className="secondary" onClick={props.onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function TopicActionModal(props: {
  open: boolean;
  topic: TopicNode | null;
  onAddChild: (topic: TopicNode) => void;
  onMove: (topic: TopicNode) => void;
  onClose: () => void;
}) {
  if (!props.open || !props.topic) return null;
  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content topic-action-menu" onClick={(event) => event.stopPropagation()}>
        <h3>Project Actions</h3>
        <p className="modal-context">{props.topic.name}</p>
        <button onClick={() => props.onAddChild(props.topic!)}>Add child project</button>
        <button className="secondary" onClick={() => props.onMove(props.topic!)}>Move project</button>
        <button className="secondary" onClick={props.onClose}>Cancel</button>
      </div>
    </div>
  );
}

function BankPanel(props: {
  title: string;
  scope: BankScope;
  topics: TopicNode[];
  suites: TrainingSuite[];
  activeScope: BankScope;
  activeTopicId: string;
  activeSuiteId: string;
  user: User;
  open: boolean;
  openTopics: Record<string, boolean>;
  newTopicName: string;
  newSuiteTitle: string;
  onToggleBank: () => void;
  onToggleTopic: (id: string) => void;
  onSelectTopic: (scope: BankScope, id: string) => void;
  onSelectFolder: (scope: BankScope, topic: TopicNode) => void;
  onSelectSuite: (id: string) => void;
  onTopicName: (value: string) => void;
  onSuiteTitle: (value: string) => void;
  onAddTopic: () => void;
  onAddSuite: () => void;
  onOpenModal: (type: "topic" | "suite", scope: BankScope, parentTopic?: TopicNode) => void;
  onOpenTopicActions: (topic: TopicNode) => void;
  onDeleteTopic?: (id: string) => void;
  onDeleteSuite?: (id: string) => void;
}) {
  const disabled = props.scope === "public" && props.user.role !== "admin";
  const suiteCount = props.suites.length;
  return (
    <section className="bank-section">
      <button className="bank-heading" onClick={props.onToggleBank}>
        <span className={props.open ? "chevron open" : "chevron"} aria-hidden="true" />
        <strong>{props.title}</strong>
        <span>{disabled ? "admin edit" : `${suiteCount} suites`}</span>
      </button>
      {props.open && (
        <>
          <div className="tree-list">
            {props.topics.length ? props.topics.map((topic) => (
              <TopicNodeView
                key={topic.id}
                topic={topic}
                scope={props.scope}
                suites={props.suites}
                activeTopicId={props.activeScope === props.scope ? props.activeTopicId : ""}
                activeSuiteId={props.activeScope === props.scope ? props.activeSuiteId : ""}
                openTopics={props.openTopics}
                onToggleTopic={props.onToggleTopic}
                onSelectTopic={props.onSelectTopic}
                onSelectFolder={props.onSelectFolder}
                onSelectSuite={props.onSelectSuite}
                onOpenTopicActions={props.onOpenTopicActions}
                canAddChildTopic={!disabled}
                onDeleteTopic={props.onDeleteTopic}
                onDeleteSuite={props.onDeleteSuite}
                depth={0}
              />
            )) : <div className="bank-empty">No topics yet.</div>}
          </div>
          <div className="bank-add">
            <button className="icon-button" onClick={() => props.onOpenModal("topic", props.scope)} title="Add topic" disabled={disabled}>+ Topic</button>
            <button className="icon-button" onClick={() => props.onOpenModal("suite", props.scope)} title="Add suite" disabled={disabled}>+ Suite</button>
          </div>
        </>
      )}
    </section>
  );
}

function TopicNodeView(props: {
  topic: TopicNode;
  scope: BankScope;
  suites: TrainingSuite[];
  activeTopicId: string;
  activeSuiteId: string;
  openTopics: Record<string, boolean>;
  onToggleTopic: (id: string) => void;
  onSelectTopic: (scope: BankScope, id: string) => void;
  onSelectFolder: (scope: BankScope, topic: TopicNode) => void;
  onSelectSuite: (id: string) => void;
  onOpenTopicActions: (topic: TopicNode) => void;
  canAddChildTopic: boolean;
  onDeleteTopic?: (id: string) => void;
  onDeleteSuite?: (id: string) => void;
  depth: number;
}) {
  const open = props.openTopics[props.topic.id] ?? false;
  const topicSuites = getTopicSuiteItems(props.topic, props.suites);
  const nestedSuiteCount = countTopicSuites(props.topic, props.suites);
  const hasChildren = Boolean(props.topic.children?.length || topicSuites.length);
  const isActiveFolder = !props.activeSuiteId && props.topic.id === props.activeTopicId;
  return (
    <div className="topic-node" style={{ "--depth": props.depth } as CSSProperties}>
      <div className={isActiveFolder ? "topic-row active" : "topic-row"}>
        <button className="collapse-button" onClick={() => props.onToggleTopic(props.topic.id)} aria-label={open ? "Collapse topic" : "Expand topic"}>
          {hasChildren && <span className={open ? "chevron open" : "chevron"} aria-hidden="true" />}
        </button>
        <button className="topic-main" onClick={() => props.onSelectFolder(props.scope, props.topic)}>
          <strong>{props.topic.name}</strong>
          <span>{props.topic.total ? `${props.topic.scorePercent}% (${props.topic.done}/${props.topic.total})` : `${nestedSuiteCount} suites`}</span>
        </button>
        {props.canAddChildTopic && (
          <button className="topic-action-button" onClick={() => props.onOpenTopicActions(props.topic)} title={`Project actions for ${props.topic.name}`} aria-label={`Project actions for ${props.topic.name}`}>+</button>
        )}
      </div>
      {open && (
        <div className="child-topic">
          {props.topic.children?.map((child) => (
            <TopicNodeView
              key={child.id}
              topic={child}
              scope={props.scope}
              suites={props.suites}
              activeTopicId={props.activeTopicId}
              activeSuiteId={props.activeSuiteId}
              openTopics={props.openTopics}
              onToggleTopic={props.onToggleTopic}
              onSelectTopic={props.onSelectTopic}
              onSelectFolder={props.onSelectFolder}
              onSelectSuite={props.onSelectSuite}
              onOpenTopicActions={props.onOpenTopicActions}
              canAddChildTopic={props.canAddChildTopic}
              onDeleteTopic={props.onDeleteTopic}
              onDeleteSuite={props.onDeleteSuite}
              depth={props.depth + 1}
            />
          ))}
          {topicSuites.map((suite) => (
            <div key={suite.id} className="suite-row">
              <button className={suite.id === props.activeSuiteId ? "suite-tree-item active" : "suite-tree-item"} onClick={() => props.onSelectSuite(suite.id)}>
                <strong>{suite.title}</strong>
                <span>{suite.scorePercent}% ({suite.done}/{suite.total})</span>
                <small>{suite.questionCount} questions | {suite.allowedTypes.join(", ")}</small>
              </button>
            </div>
          ))}
          {!topicSuites.length && <button className="suite-tree-item add-suite-row" onClick={() => props.onSelectTopic(props.scope, props.topic.id)}>+ Add suite</button>}
        </div>
      )}
    </div>
  );
}

function SuiteConfig(props: {
  scope: BankScope;
  activeSuite?: TrainingSuite;
  canEditSuite: boolean;
  activeQuestions: Question[];
  answers: Record<string, unknown>;
  questionResults: Record<string, "correct" | "incorrect">;
  rawParsedQuestions: Question[];
  activeTopicId: string;
  feedbackMode: PracticeFeedbackMode;
  rawText: string;
  rawPreview: string;
  editorMessage: string;
  aiPromptTemplate: string;
  editingTitle: Record<string, string>;
  editingDescription: Record<string, string>;
  editingDuration: Record<string, string>;
  isSavingEdit: boolean;
  onRawText: (value: string) => void;
  onParseRaw: () => void;
  onValidateRaw: () => void;
  onFeedbackMode: (mode: PracticeFeedbackMode) => void;
  onEditTitle: (id: string, value: string) => void;
  onEditDescription: (id: string, value: string) => void;
  onEditDuration: (id: string, value: string) => void;
  onSaveEdit: () => void;
  onDeleteSuite: (id: string) => void;
}) {
  const outlineMarkdown = typeof props.activeSuite?.metadata?.outlineMarkdown === "string"
    ? props.activeSuite.metadata.outlineMarkdown
    : "";
  return (
    <>
      <header className="hero-bar compact">
        <div>
          <p className="eyebrow">Suite Configuration</p>
          <h2>{props.activeSuite?.title || "Choose or create a suite"}</h2>
          <p>{props.activeSuite?.description || "Paste a whole raw suite, set time, add similar questions, then practice."}</p>
        </div>
      </header>

      <section className="panel config-panel">
        <div className="panel-heading">
          <div><h3>Suite Control</h3><p>Progress is visible first. Editing tools stay folded until needed.</p></div>
        </div>
        <SuiteResultSummary questions={props.activeQuestions} answers={props.answers} questionResults={props.questionResults} />
        <details className="config-section">
          <summary>Knowledge Markdown</summary>
          <section className="suite-outline">
            {outlineMarkdown ? (
              <MarkdownContent markdown={outlineMarkdown} />
            ) : (
              <p>No knowledge outline is saved for this suite yet. Import raw suite content with an @outline Markdown block to attach one.</p>
            )}
          </section>
        </details>
        <details className="config-section">
          <summary>Suite settings</summary>
          <div className="config-actions">
            <button className="secondary" onClick={() => props.activeSuite && props.onDeleteSuite(props.activeSuite.id)} disabled={!props.canEditSuite || !props.activeSuite} style={{ color: "#ef4444" }}>Delete</button>
            <button className="secondary" onClick={props.onSaveEdit} disabled={!props.canEditSuite || props.isSavingEdit}>Save</button>
          </div>
          <div className="form-grid">
            <label>Suite Name
              <input
                value={props.editingTitle[props.activeSuite?.id || ""] !== undefined ? props.editingTitle[props.activeSuite?.id || ""] : props.activeSuite?.title || ""}
                onChange={(e) => props.activeSuite && props.onEditTitle(props.activeSuite.id, e.target.value)}
                readOnly={!props.canEditSuite}
              />
            </label>
            <label>Parent Topic<input value={props.activeTopicId} readOnly /></label>
            <label>Time Limit (minutes)
              <input
                type="number"
                min="1"
                max="240"
                value={props.editingDuration[props.activeSuite?.id || ""] !== undefined ? props.editingDuration[props.activeSuite?.id || ""] : props.activeSuite?.durationMinutes || 15}
                onChange={(e) => props.activeSuite && props.onEditDuration(props.activeSuite.id, e.target.value)}
                readOnly={!props.canEditSuite}
              />
            </label>
            <label>Description
              <textarea
                value={props.editingDescription[props.activeSuite?.id || ""] !== undefined ? props.editingDescription[props.activeSuite?.id || ""] : props.activeSuite?.description || ""}
                onChange={(e) => props.activeSuite && props.onEditDescription(props.activeSuite.id, e.target.value)}
                readOnly={!props.canEditSuite}
                style={{ minHeight: "60px" }}
              />
            </label>
            <label>Question Count<input value={`${props.activeSuite?.questionCount || props.activeQuestions.length} questions`} readOnly /></label>
          </div>
          <div className="mode-switch">
            <button className={props.feedbackMode === "instant" ? "active" : ""} onClick={() => props.onFeedbackMode("instant")} disabled={!props.canEditSuite}>Instant Feedback</button>
            <button className={props.feedbackMode === "final" ? "active" : ""} onClick={() => props.onFeedbackMode("final")} disabled={!props.canEditSuite}>Show at End</button>
          </div>
          <div className="type-row">{(props.activeSuite?.allowedTypes || ["single", "multiple", "boolean", "blank", "coding"]).map((type) => <span key={type}>{type}</span>)}</div>
          {props.rawParsedQuestions.length > 0 && <RawQuestionSummary questions={props.rawParsedQuestions} />}
          <div className="question-list">{props.activeQuestions.map((question, index) => <article key={question.id}><strong>{index + 1}. {question.title}</strong><span>{question.type} | {question.difficulty}</span></article>)}</div>
        </details>
        <details className="config-section">
          <summary>Raw import</summary>
          <div className="panel-heading"><div><h3>Paste Topic Raw</h3><p>Paste AI/generated raw content for one full suite. Validate can overwrite the current suite after confirmation.</p></div><button className="secondary" disabled>AI Similar</button></div>
          <label className="prompt-template-label">
            AI Prompt Template
            <textarea className="prompt-template" value={props.aiPromptTemplate} readOnly />
          </label>
          <textarea className="raw-editor" value={props.rawText} onChange={(event) => props.onRawText(event.target.value)} readOnly={!props.canEditSuite} />
          <div className="actions"><button onClick={props.onParseRaw}>Parse</button><button className="secondary" onClick={props.onValidateRaw} disabled={!props.canEditSuite}>Validate</button></div>
          {props.editorMessage && <div className="notice">{props.editorMessage}</div>}
          {props.rawPreview && <pre className="raw-preview">{props.rawPreview}</pre>}
          <div className="ai-box"><strong>AI Add Similar Questions</strong><span>Target: {props.scope} bank</span><span>Generate similar questions after schema validation. Provider wiring comes next.</span></div>
        </details>
      </section>
    </>
  );
}

type MarkdownBlock =
  | { type: "heading"; level: number; text: string }
  | { type: "list"; items: string[] }
  | { type: "paragraph"; text: string }
  | { type: "code"; language?: string; code: string };

function MarkdownContent({ markdown }: { markdown: string }) {
  const blocks = parseMarkdownBlocks(markdown);

  return (
    <article className="markdown-content">
      {blocks.map((block, index) => {
        if (block.type === "heading") {
          const HeadingTag = block.level <= 2 ? "h3" : "h4";
          return <HeadingTag key={index}>{renderMarkdownInline(block.text)}</HeadingTag>;
        }
        if (block.type === "list") {
          return <ul key={index}>{block.items.map((item, itemIndex) => <li key={itemIndex}>{renderMarkdownInline(item)}</li>)}</ul>;
        }
        if (block.type === "code") {
          return (
            <figure className="markdown-code-block" key={index}>
              {block.language && <figcaption>{block.language}</figcaption>}
              <pre><code>{block.code}</code></pre>
            </figure>
          );
        }
        return <p key={index}>{renderMarkdownInline(block.text)}</p>;
      })}
    </article>
  );
}

function parseMarkdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const rawLine = lines[index];
    const line = rawLine.trim();
    if (!line) continue;

    const fence = line.match(/^(```|~~~)([A-Za-z0-9_+#.-]*)\s*$/);
    if (fence) {
      const marker = fence[1];
      const language = fence[2] || undefined;
      const codeLines: string[] = [];
      while (index + 1 < lines.length && !lines[index + 1].trim().startsWith(marker)) {
        index += 1;
        codeLines.push(lines[index]);
      }
      if (index + 1 < lines.length) index += 1;
      blocks.push({ type: "code", language, code: codeLines.join("\n") });
      continue;
    }

    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    if (heading) {
      blocks.push({ type: "heading", level: heading[1].length, text: heading[2] });
      continue;
    }

    if (line.startsWith("- ")) {
      const items = [line.slice(2).trim()];
      while (index + 1 < lines.length && lines[index + 1].trim().startsWith("- ")) {
        index += 1;
        items.push(lines[index].trim().slice(2).trim());
      }
      blocks.push({ type: "list", items });
      continue;
    }

    blocks.push({ type: "paragraph", text: line });
  }
  return blocks;
}

function renderMarkdownInline(text: string): ReactNode {
  const label = text.match(/^([^:]{2,48}):\s*(.+)$/);
  if (label && !/[`*=]/.test(label[1])) {
    return <><strong>{label[1]}:</strong> {renderMarkdownSegments(label[2])}</>;
  }
  return renderMarkdownSegments(text);
}

function renderMarkdownSegments(text: string): ReactNode {
  const nodes: ReactNode[] = [];
  const pattern = /(`[^`]+`|\*\*.+?\*\*|==.+?==)/g;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > cursor) nodes.push(text.slice(cursor, match.index));
    const token = match[0];
    const body = token.slice(2, -2);
    if (token.startsWith("`")) {
      nodes.push(<code className="markdown-inline-code" key={nodes.length}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={nodes.length}>{body}</strong>);
    } else {
      nodes.push(<mark key={nodes.length}>{body}</mark>);
    }
    cursor = match.index + token.length;
  }
  if (cursor < text.length) nodes.push(text.slice(cursor));
  return nodes.length ? nodes : text;
}

function SuiteResultSummary(props: {
  questions: Question[];
  answers: Record<string, unknown>;
  questionResults: Record<string, "correct" | "incorrect">;
}) {
  const answered = props.questions.filter((question) => hasAnswer(props.answers[question.id]));
  const correct = props.questions.filter((question) => props.questionResults[question.id] === "correct");
  const wrong = props.questions.filter((question) => props.questionResults[question.id] === "incorrect");
  const checkedCount = correct.length + wrong.length;
  const accuracy = checkedCount ? Math.round((correct.length / checkedCount) * 100) : 0;
  return (
    <section className="suite-stats">
      <div className="stat-card"><span>Answered</span><strong>{answered.length}/{props.questions.length}</strong></div>
      <div className="stat-card good"><span>Correct</span><strong>{correct.length}</strong></div>
      <div className="stat-card bad"><span>Wrong</span><strong>{wrong.length}</strong></div>
      <div className="stat-card"><span>Accuracy</span><strong>{accuracy}%</strong></div>
      <div className="result-lists">
        <QuestionResultList title="Wrong questions" questions={wrong} emptyText="No wrong answers yet." />
        <QuestionResultList title="Correct questions" questions={correct} emptyText="No correct answers checked yet." />
      </div>
    </section>
  );
}

function QuestionResultList(props: { title: string; questions: Question[]; emptyText: string }) {
  return (
    <div className="result-list">
      <strong>{props.title}</strong>
      {props.questions.length ? (
        props.questions.slice(0, 5).map((question) => <span key={question.id}>{question.title}</span>)
      ) : (
        <em>{props.emptyText}</em>
      )}
    </div>
  );
}

function hasAnswer(value: unknown) {
  return value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
}

function StudyDashboardPanel(props: {
  dashboard?: StudyDashboard;
  questionCount: number;
  selectedSuiteTitle?: string;
  onStartPractice: () => void;
  onStartExam: () => void;
}) {
  const progressCount = props.dashboard?.progress ? Object.keys(props.dashboard.progress.answers).length : 0;
  return (
    <section className="study-dashboard">
      <div className="study-dashboard-copy">
        <p className="eyebrow">Study Dashboard</p>
        <h2>Your Practice Activity</h2>
        <p>Global heatmap across all question banks. Start the selected suite when you are ready.</p>
      </div>
      <div className="study-dashboard-main">
        <div className="study-dashboard-top">
          <div>
            <span>Today</span>
            <strong>{props.dashboard?.todayCount || 0}</strong>
          </div>
          <div>
            <span>90-day total</span>
            <strong>{props.dashboard?.totalCount || 0}</strong>
          </div>
          <div>
            <span>Active days</span>
            <strong>{props.dashboard?.activeDays || 0}</strong>
          </div>
        </div>
        <ActivityHeatmap activity={props.dashboard?.heatmap || []} />
      </div>
      <div className="study-actions">
        <button onClick={props.onStartPractice} disabled={!props.questionCount}>
          <span>{progressCount ? "Continue Practice" : "Practice"}</span>
          <small>{progressCount ? `${progressCount} saved answers` : `Selected: ${props.selectedSuiteTitle || "no suite"}`}</small>
        </button>
        <button className="exam-action" onClick={props.onStartExam} disabled={!props.questionCount}>
          <span>Exam</span>
          <small>Finish all questions to record</small>
        </button>
      </div>
    </section>
  );
}

function ActivityHeatmap({ activity }: { activity: StudyDashboard["heatmap"] }) {
  const byDate = new Map(activity.map((item) => [item.date, item.count]));
  const days = Array.from({ length: 90 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (89 - index));
    const key = date.toISOString().slice(0, 10);
    return { key, count: byDate.get(key) || 0 };
  });
  const max = Math.max(1, ...days.map((day) => day.count));
  return (
    <div className="heatmap" aria-label="Daily solved question heatmap">
      {days.map((day) => {
        const level = day.count === 0 ? 0 : Math.ceil((day.count / max) * 4);
        return <span key={day.key} className={`heat-${level}`} title={`${day.key}: ${day.count} questions`} />;
      })}
    </div>
  );
}

function PracticePanel(props: {
  suite?: TrainingSuite;
  user: User;
  questions: Question[];
  questionIndex: number;
  currentQuestion?: Question;
  answers: Record<string, unknown>;
  questionResults: Record<string, "correct" | "incorrect">;
  feedback: string;
  language: Language;
  sourceCode: string;
  submissions: Submission[];
  isSubmitting: boolean;
  selectedProblem?: Problem;
  remainingSeconds: number;
  feedbackMode: PracticeFeedbackMode;
  sessionMode: PracticeSessionMode;
  finalSubmitted: boolean;
  onBack: () => void;
  onQuestionIndex: (index: number) => void;
  onAnswer: (questionId: string, value: unknown) => void;
  onSubmitNonCoding: () => void;
  onSubmitFinal: () => void;
  onLanguage: (language: Language) => void;
  onSourceCode: (value: string) => void;
  onSubmitCode: () => void;
  onRefresh: () => void;
}) {
  const question = props.currentQuestion;
  const answeredCount = props.questions.filter((item) => {
    const value = props.answers[item.id];
    return value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
  }).length;
  const progress = props.questions.length ? Math.round((answeredCount / props.questions.length) * 100) : 0;
  return (
    <main className="practice-fullscreen">
      <header className="practice-topbar">
        <div>
          <p className="eyebrow">Practice</p>
          <h2>{props.suite?.title || "Practice Suite"}</h2>
        </div>
        <div className="practice-status">
          <div className="timer-card"><span>Mode</span><strong>{props.sessionMode === "practice" ? "Practice" : "Exam"}</strong></div>
          <div className="timer-card" style={{background: props.remainingSeconds < 300 ? "linear-gradient(135deg, #fee2e2, #fecaca)" : undefined, borderColor: props.remainingSeconds < 300 ? "#fca5a5" : undefined}}><span>Time Left</span><strong style={{color: props.remainingSeconds < 300 ? "#991b1b" : "#0f172a"}}>{formatSeconds(props.remainingSeconds)}</strong></div>
          <div className="timer-card"><span>Progress</span><strong>{progress}%</strong></div>
          <button className="secondary" onClick={props.onBack}>Exit</button>
        </div>
      </header>
      <div className="practice-progress"><span style={{ width: `${progress}%` }} /></div>
      <section className="practice-layout">
        <aside className="question-nav">
          <strong>Questions</strong>
          {props.questions.map((item, index) => {
            const value = props.answers[item.id];
            const answered = value !== undefined && value !== "" && (!Array.isArray(value) || value.length > 0);
            const result = props.questionResults[item.id];
            return <button key={item.id} className={`${index === props.questionIndex ? "active" : ""} ${answered ? "answered" : ""} ${result ? `result-${result}` : ""}`} onClick={() => props.onQuestionIndex(index)}><span>{index + 1}</span><em>{item.type}</em></button>;
          })}
        </aside>
        <section className="panel practice-card">
          <div className="question-content">
            {question ? <QuestionRenderer {...props} question={question} /> : <div className="empty-state">This suite has no questions yet.</div>}
          </div>
          <div className="practice-footer">
            <button className="secondary" disabled={props.questionIndex === 0} onClick={() => props.onQuestionIndex(props.questionIndex - 1)}>Previous</button>
            <span>Question {props.questionIndex + 1} of {props.questions.length || 0}</span>
            {props.feedbackMode === "final" && props.questionIndex >= props.questions.length - 1 ? <button onClick={props.onSubmitFinal}>Submit Suite</button> : <button disabled={props.questionIndex >= props.questions.length - 1} onClick={() => props.onQuestionIndex(props.questionIndex + 1)}>Next</button>}
          </div>
        </section>
      </section>
    </main>
  );
}

function EmptySuiteState(props: {
  scope: BankScope;
  canAdd: boolean;
  canDelete: boolean;
  suiteTitle: string;
  onSuiteTitle: (value: string) => void;
  onAddSuite: () => void;
  onDeleteTopic: () => void;
}) {
  return (
    <section className="panel empty-suite-panel">
      <p className="eyebrow">{props.scope} bank</p>
      <h2>No suite selected</h2>
      <p>Topic is only a folder. Add a suite under it, then configure Paste Topic Raw, time, AI generation, and practice.</p>
      <div className="folder-actions">
        <button className="secondary danger-button" onClick={props.onDeleteTopic} disabled={!props.canDelete}>Delete Topic</button>
      </div>
      {props.canAdd ? (
        <div className="inline-add-suite">
          <input placeholder="New suite title" value={props.suiteTitle} onChange={(event) => props.onSuiteTitle(event.target.value)} />
          <button onClick={props.onAddSuite}>+ Add Suite</button>
        </div>
      ) : (
        <div className="notice">Only admin can add public suites.</div>
      )}
    </section>
  );
}

function QuestionRenderer(props: Parameters<typeof PracticePanel>[0] & { question: Question }) {
  const value = props.answers[props.question.id];
  const showAnswer = props.feedbackMode === "final" && props.finalSubmitted;
  const result = props.questionResults[props.question.id];
  const showResult = Boolean(result) && (props.feedbackMode === "instant" || props.finalSubmitted);
  if (props.question.type === "coding") {
    const codeAllowed = props.user.role === "admin";
    return (
      <>
        <div className="panel-heading"><div><h3>{props.question.title}</h3><p>{props.question.description || props.selectedProblem?.statement}</p></div><select value={props.language} onChange={(event) => props.onLanguage(event.target.value as Language)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        {!codeAllowed && <div className="notice danger-notice">Code runner access is limited to admin accounts. Use a non-coding question or ask an admin account to run code.</div>}
        {!props.selectedProblem && <div className="notice">Starter template is ready. Runner tests for this problem are not configured yet.</div>}
        <div className="coding-workbench">
          <div className="coding-editor-pane">
            <CodeEditor language={props.language} value={props.sourceCode} onChange={props.onSourceCode} readOnly={!codeAllowed} />
            <div className="actions"><button onClick={props.onSubmitCode} disabled={!codeAllowed || props.isSubmitting || !props.selectedProblem}>{props.isSubmitting ? "Running..." : "Run Code"}</button><button className="secondary" onClick={props.onRefresh}>Refresh</button></div>
          </div>
          <ResultList submissions={props.submissions} />
        </div>
      </>
    );
  }
  return (
    <>
      <h3>{props.question.title}</h3>
      {props.question.description && <p>{props.question.description}</p>}
      <QuestionCodeBlock question={props.question} />
      {props.question.type === "single" && <OptionList question={props.question} value={value as string | undefined} showResult={showResult} onAnswer={props.onAnswer} />}
      {props.question.type === "multiple" && <MultiOptionList question={props.question} value={(value as string[] | undefined) || []} showResult={showResult} onAnswer={props.onAnswer} />}
      {props.question.type === "boolean" && <BooleanOptionList question={props.question} value={value as boolean | undefined} showResult={showResult} onAnswer={props.onAnswer} />}
      {props.question.type === "blank" && <input className="answer-input" placeholder="Type your answer" value={(value as string | undefined) || ""} onChange={(event) => props.onAnswer(props.question.id, event.target.value)} />}
      {props.feedbackMode === "instant" ? <div className="actions"><button onClick={props.onSubmitNonCoding}>Submit Answer</button></div> : <div className="notice">Answer saved. Submit the suite at the end to show answers.</div>}
      {props.feedback && props.feedbackMode === "instant" && <div className="notice">{props.feedback}</div>}
      {props.feedback && props.feedbackMode === "final" && <div className="notice">{props.feedback}</div>}
      {showAnswer && <AnswerReveal question={props.question} />}
    </>
  );
}

function QuestionCodeBlock({ question }: { question: Question }) {
  const code = typeof question.metadata.code === "string" ? question.metadata.code : "";
  const language = typeof question.metadata.codeLanguage === "string" ? question.metadata.codeLanguage : "code";
  if (!code) return null;
  return (
    <figure className="question-code-block">
      <figcaption>{language}</figcaption>
      <pre>{code}</pre>
    </figure>
  );
}

function CodeEditor({ language, value, onChange, readOnly = false }: { language: Language; value: string; onChange: (value: string) => void; readOnly?: boolean }) {
  const extensions = useMemo(() => {
    switch (language) {
      case "python":
        return [python()];
      case "typescript":
        return [javascript({ typescript: true })];
      case "javascript":
        return [javascript()];
      case "java":
        return [java()];
      case "csharp":
        return [csharp()];
      default:
        return [];
    }
  }, [language]);

  return (
    <CodeMirror
      className="code-editor"
      value={value}
      height="300px"
      theme={codeEditorTheme}
      extensions={extensions}
      basicSetup={{ foldGutter: true, lineNumbers: true, highlightActiveLine: true }}
      readOnly={readOnly}
      onChange={onChange}
    />
  );
}

function AnswerReveal({ question }: { question: Question }) {
  return (
    <div className="answer-reveal">
      <strong>Answer: {JSON.stringify(question.answer)}</strong>
      {question.explanation && <span>{question.explanation}</span>}
    </div>
  );
}

function OptionList({ question, value, showResult, onAnswer }: { question: Question; value?: string; showResult: boolean; onAnswer: (id: string, value: unknown) => void }) {
  return <div className="choice-list">{question.options?.map((option) => {
    const state = getOptionState(option.id, value === option.id, question.answer, showResult);
    return <button key={option.id} className={state} onClick={() => onAnswer(question.id, option.id)}><span className="option-badge">{option.id}</span><span>{option.text}</span></button>;
  })}</div>;
}

function MultiOptionList({ question, value, showResult, onAnswer }: { question: Question; value: string[]; showResult: boolean; onAnswer: (id: string, value: unknown) => void }) {
  return <div className="choice-list">{question.options?.map((option) => {
    const selected = value.includes(option.id);
    const state = getOptionState(option.id, selected, question.answer, showResult);
    const nextValue = selected ? value.filter((id) => id !== option.id) : [...value, option.id];
    return <button key={option.id} className={state} onClick={() => onAnswer(question.id, nextValue)}><span className="option-badge">{selected ? "\u2713" : option.id}</span><span>{option.text}</span></button>;
  })}</div>;
}

function BooleanOptionList({ question, value, showResult, onAnswer }: { question: Question; value?: boolean; showResult: boolean; onAnswer: (id: string, value: unknown) => void }) {
  return (
    <div className="choice-list">
      {[true, false].map((optionValue) => {
        const label = optionValue ? "True" : "False";
        const state = getBooleanOptionState(optionValue, value === optionValue, question.answer, showResult);
        return <button key={label} className={state} onClick={() => onAnswer(question.id, optionValue)}><span className="option-badge">{label[0]}</span><span>{label}</span></button>;
      })}
    </div>
  );
}

function getOptionState(optionId: string, selected: boolean, answer: unknown, showResult: boolean) {
  const expected = Array.isArray(answer) ? answer.map(String) : [String(answer)];
  const correct = expected.includes(optionId);
  if (showResult && correct) return selected ? "selected correct-option" : "correct-option";
  if (showResult && selected && !correct) return "selected incorrect-option";
  return selected ? "selected" : "";
}

function getBooleanOptionState(optionValue: boolean, selected: boolean, answer: unknown, showResult: boolean) {
  const correct = answer === optionValue;
  if (showResult && correct) return selected ? "selected correct-option" : "correct-option";
  if (showResult && selected && !correct) return "selected incorrect-option";
  return selected ? "selected" : "";
}

function RawQuestionSummary({ questions }: { questions: Question[] }) {
  const counts = questions.reduce<Record<string, number>>((acc, question) => {
    acc[question.type] = (acc[question.type] || 0) + 1;
    return acc;
  }, {});
  return (
    <section className="raw-summary">
      <div className="panel-heading">
        <div>
          <h3>Validated Questions</h3>
          <p>{questions.length} questions parsed. Types: {Object.entries(counts).map(([type, count]) => `${type} ${count}`).join(", ")}</p>
        </div>
      </div>
      <div className="raw-question-list">
        {questions.map((question, index) => (
          <article key={question.id}>
            <strong>{index + 1}. {question.title}</strong>
            <span>{question.type} | {question.difficulty} | {question.tags.join(", ") || "no tags"}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function ResultList({ submissions }: { submissions: Submission[] }) {
  return <div className="submission-list">{submissions.slice(0, 4).map((submission) => <article key={submission.id} className="submission"><strong>{submission.status}</strong><span>{submission.language} | {new Date(submission.createdAt).toLocaleString()}</span><pre>{formatSubmission(submission)}</pre></article>)}</div>;
}

function flattenTopics(nodes: TopicNode[]): TopicNode[] {
  return nodes.flatMap((node) => [node, ...flattenTopics(node.children || [])]);
}

function getMoveParentOptions(nodes: TopicNode[], movingTopicId: string) {
  const movingTopic = flattenTopics(nodes).find((topic) => topic.id === movingTopicId);
  const excludedIds = new Set([movingTopicId, ...flattenTopics(movingTopic?.children || []).map((topic) => topic.id)]);
  return flattenTopicOptions(nodes).filter((option) => !excludedIds.has(option.topic.id));
}

function flattenTopicOptions(nodes: TopicNode[], depth = 0): Array<{ topic: TopicNode; depth: number }> {
  return nodes.flatMap((node) => [
    { topic: node, depth },
    ...flattenTopicOptions(node.children || [], depth + 1)
  ]);
}

function collectTopicIds(nodes: TopicNode[], topicId: string) {
  const topic = flattenTopics(nodes).find((item) => item.id === topicId);
  return new Set(topic ? [topic.id, ...flattenTopics(topic.children || []).map((item) => item.id)] : []);
}

function getTopicSuiteItems(topic: TopicNode, allSuites: TrainingSuite[]) {
  return allSuites.filter((suite) => suite.topicId === topic.id);
}

function countTopicSuites(topic: TopicNode, allSuites: TrainingSuite[]): number {
  const topicIds = new Set([topic.id, ...flattenTopics(topic.children || []).map((child) => child.id)]);
  return allSuites.filter((suite) => topicIds.has(suite.topicId)).length;
}

function pickSuiteTopicId(nodes: TopicNode[], targetScope: BankScope, preferredId?: string) {
  const flat = flattenTopics(nodes).filter((topic) => topic.scope === targetScope);
  if (preferredId) {
    const preferred = flat.find((topic) => topic.id === preferredId);
    if (preferred) return preferred.children?.[0]?.id || preferred.id;
  }
  const root = flat.find((topic) => !topic.parentId);
  return root?.children?.[0]?.id || root?.id || flat[0]?.id;
}

function canManageScoped(item: { scope: BankScope; ownerUserId?: string }, user: User | null) {
  if (!user) return false;
  if (item.scope === "public") return user.role === "admin";
  return user.role === "admin" || item.ownerUserId === user.id;
}

function formatSubmission(submission: Submission) {
  if (!submission.result) return "Waiting for runner...";
  return [submission.result.stdout, submission.result.stderr, ...submission.result.testcaseResults.map((item) => `${item.testcaseId}: ${item.status}${item.stderr ? ` - ${item.stderr}` : ""}`)].filter(Boolean).join("\n") || "Judge finished.";
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
