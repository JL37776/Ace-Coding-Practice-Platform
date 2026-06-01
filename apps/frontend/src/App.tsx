import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { AuthSession, BankScope, Language, PracticeFeedbackMode, Problem, Question, Submission, TopicNode, TrainingSuite, User } from "@ace/shared";
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
  csharp: "using System;\n\nConsole.WriteLine(\"C# runner is available\");",
  java: "public class Main {\n  public static void main(String[] args) {\n    System.out.println(\"Java runner is available\");\n  }\n}"
} satisfies Record<Language, string>;

const languages: Language[] = ["python", "typescript", "javascript", "csharp", "java"];

const codeEditorTheme = EditorView.theme({
  "&": {
    minHeight: "300px",
    border: "1px solid #1e293b",
    borderRadius: "8px",
    overflow: "hidden",
    backgroundColor: "#0f172a",
    color: "#e2e8f0"
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
    backgroundColor: "#111827",
    color: "#94a3b8",
    borderRight: "1px solid #1e293b"
  },
  ".cm-activeLine": {
    backgroundColor: "#172554"
  },
  ".cm-activeLineGutter": {
    backgroundColor: "#172554"
  },
  ".cm-cursor": {
    borderLeftColor: "#bfdbfe"
  },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground": {
    backgroundColor: "#1d4ed8"
  }
}, { dark: true });

const defaultRaw = `@suite
title=Imported Mixed Practice
description=Paste a whole suite here. Then set time, validate, confirm overwrite, and practice.
duration=15

@q
type=single
title=Which principle means one class should have one reason to change?
A=Single Responsibility Principle
B=Open Closed Principle
C=Dependency Inversion Principle
answer=A
explanation=SRP keeps a class focused on one responsibility.
tags=oop,solid

@q
type=boolean
title=JavaScript and TypeScript can both run through the Node runner.
answer=true
tags=runner`;

const aiPromptTemplate = `You are generating one complete practice suite for Ace Practice.

Return ONLY raw text in the exact parser format below. Do not use Markdown fences.

Rules:
- The suite belongs to the selected topic and must be self-contained.
- Supported question types only: single, multiple, boolean, blank, coding.
- Use a balanced mix unless the user asks for only one type.
- Every non-coding question must include answer= and explanation=.

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
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [editingTitle, setEditingTitle] = useState<Record<string, string>>({});
  const [editingDescription, setEditingDescription] = useState<Record<string, string>>({});
  const [editingDuration, setEditingDuration] = useState<Record<string, string>>({});
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [modalOpen, setModalOpen] = useState<"topic" | "suite" | null>(null);
  const [modalScope, setModalScope] = useState<BankScope>("public");
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
    () => problems.find((problem) => problem.id === codingQuestion?.problemId) || problems[0],
    [codingQuestion, problems]
  );

  useEffect(() => {
    void bootstrap();
  }, []);

  useEffect(() => {
    setSourceCode(starterCode[language]);
  }, [language]);

  useEffect(() => {
    if (!user) return;
    void refreshWorkspace();
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

  async function addTopic(targetScope: BankScope) {
    const name = newTopicName[targetScope].trim();
    if (!name) return;
    try {
      const topic = await api.createTopic({ scope: targetScope, name });
      setNewTopicName({ ...newTopicName, [targetScope]: "" });
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
      await refreshWorkspace({ scope, topicId: activeTopicId, suiteId: activeSuiteId });
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
      window.setTimeout(() => void refreshSubmissions(), 700);
    } finally {
      setIsSubmitting(false);
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
    setQuestionResults({ ...questionResults, [currentQuestion.id]: ok ? "correct" : "incorrect" });
    setFeedback(ok ? "Correct." : `Submitted. Expected answer: ${JSON.stringify(expected)}`);
  }

  function answerQuestion(questionId: string, value: unknown) {
    setAnswers({ ...answers, [questionId]: value });
    if (activeFeedbackMode === "instant") setFeedback("");
  }

  function submitFinalPractice() {
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
      const next = Math.min(620, Math.max(280, startWidth + moveEvent.clientX - startX));
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
          <label>Account<input value={authForm.username} onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })} /></label>
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
        questions={activeQuestions}
        questionIndex={questionIndex}
        currentQuestion={currentQuestion}
        answers={answers}
        feedback={feedback}
        language={language}
        sourceCode={sourceCode}
        submissions={submissions}
        isSubmitting={isSubmitting}
        selectedProblem={selectedProblem}
        remainingSeconds={remainingSeconds}
        feedbackMode={activeFeedbackMode}
        finalSubmitted={finalSubmitted}
        onBack={() => setMode("config")}
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
          onOpenModal={(type, scope) => { setModalOpen(type); setModalScope(scope); }}
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
          onOpenModal={(type, scope) => { setModalOpen(type); setModalScope(scope); }}
          onDeleteTopic={deleteTopic}
          onDeleteSuite={deleteSuite}
        />
      </aside>
      <div className="sidebar-resizer" onMouseDown={startSidebarResize} aria-label="Resize sidebar" />

      <section className="workspace">
        {mode === "config" && activeSuite ? (
          <SuiteConfig
            scope={scope}
            activeSuite={activeSuite}
            canEditSuite={canEditActiveSuite}
            activeQuestions={activeQuestions}
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
            onPractice={() => {
              setQuestionIndex(0);
              setFeedback("");
              setFinalSubmitted(false);
              setMode("practice");
            }}
          />
        ) : mode === "config" ? (
          <EmptySuiteState
            scope={scope}
            canAdd={scope === "personal" || user.role === "admin"}
            onAddSuite={() => void addSuite(scope)}
            suiteTitle={newSuiteTitle[scope]}
            onSuiteTitle={(value) => setNewSuiteTitle({ ...newSuiteTitle, [scope]: value })}
          />
        ) : null}
      </section>
      <AddItemModal
        type={modalOpen || "topic"}
        scope={modalScope}
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
            await addTopic(modalScope);
          } else {
            await addSuite(modalScope);
          }
          setModalOpen(null);
          setNewTopicName({ ...newTopicName, [modalScope]: "" });
          setNewSuiteTitle({ ...newSuiteTitle, [modalScope]: "" });
        }}
        onClose={() => {
          setModalOpen(null);
          setNewTopicName({ ...newTopicName, [modalScope]: "" });
          setNewSuiteTitle({ ...newSuiteTitle, [modalScope]: "" });
        }}
      />
    </main>
  );
}

function AddItemModal(props: {
  type: "topic" | "suite";
  scope: BankScope;
  open: boolean;
  value: string;
  onValue: (value: string) => void;
  onAdd: () => void;
  onClose: () => void;
}) {
  if (!props.open) return null;
  
  const placeholder = props.type === "topic" ? "New topic name" : "New suite title";
  const title = props.type === "topic" ? "Add Topic" : "Add Suite";
  
  return (
    <div className="modal-overlay" onClick={props.onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
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
  onOpenModal: (type: "topic" | "suite", scope: BankScope) => void;
  onDeleteTopic?: (id: string) => void;
  onDeleteSuite?: (id: string) => void;
}) {
  const disabled = props.scope === "public" && props.user.role !== "admin";
  return (
    <section className="bank-section">
      <button className="bank-heading" onClick={props.onToggleBank}>
        <span className={props.open ? "chevron open" : "chevron"} aria-hidden="true" />
        <strong>{props.title}</strong>
        {disabled && <span>admin edit</span>}
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
                onDeleteTopic={props.onDeleteTopic}
                onDeleteSuite={props.onDeleteSuite}
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
  onDeleteTopic?: (id: string) => void;
  onDeleteSuite?: (id: string) => void;
}) {
  const open = props.openTopics[props.topic.id] ?? true;
  const topicSuites = getTopicSuiteItems(props.topic, props.suites);
  const hasChildren = Boolean(props.topic.children?.length || topicSuites.length);
  const isActiveFolder = !props.activeSuiteId && props.topic.id === props.activeTopicId;
  return (
    <div>
      <div className={isActiveFolder ? "topic-row active" : "topic-row"}>
        <button className="collapse-button" onClick={() => props.onToggleTopic(props.topic.id)} aria-label={open ? "Collapse topic" : "Expand topic"}>
          {hasChildren && <span className={open ? "chevron open" : "chevron"} aria-hidden="true" />}
        </button>
        <button className="topic-main" onClick={() => props.onSelectFolder(props.scope, props.topic)}>
          <strong>{props.topic.name}</strong>
          <span>{props.topic.scorePercent}% ({props.topic.done}/{props.topic.total})</span>
        </button>
        {props.onDeleteTopic && <button className="icon-button topic-delete" onClick={() => props.onDeleteTopic?.(props.topic.id)} title="Delete topic" aria-label="Delete topic">x</button>}
      </div>
      {open && (
        <div className="child-topic">
          {topicSuites.map((suite) => (
            <div key={suite.id} className="suite-row">
              <button className={suite.id === props.activeSuiteId ? "suite-tree-item active" : "suite-tree-item"} onClick={() => props.onSelectSuite(suite.id)}>
                <strong>{suite.title}</strong>
                <span>{suite.scorePercent}% ({suite.done}/{suite.total})</span>
                <small>{suite.questionCount} questions | {suite.allowedTypes.join(", ")}</small>
              </button>
              {props.onDeleteSuite && <button className="icon-button suite-delete" onClick={() => props.onDeleteSuite?.(suite.id)} title="Delete suite" aria-label="Delete suite">x</button>}
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
  onPractice: () => void;
}) {
  return (
    <>
      <header className="hero-bar compact">
        <div>
          <p className="eyebrow">Suite Configuration</p>
          <h2>{props.activeSuite?.title || "Choose or create a suite"}</h2>
          <p>{props.activeSuite?.description || "Paste a whole raw suite, set time, add similar questions, then practice."}</p>
        </div>
        <button className="practice-button" onClick={props.onPractice} disabled={!props.activeQuestions.length}>Practice</button>
      </header>

      <section className="editor-grid">
        <section className="panel">
          <div className="panel-heading">
            <div><h3>Create / Edit Test Suite</h3><p>This page configures the suite. Code appears only inside coding questions during practice.</p></div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="secondary" onClick={() => props.activeSuite && props.onDeleteSuite(props.activeSuite.id)} disabled={!props.canEditSuite || !props.activeSuite} style={{ color: "#ef4444" }}>Delete</button>
              <button className="secondary" onClick={props.onSaveEdit} disabled={!props.canEditSuite || props.isSavingEdit}>Save</button>
            </div>
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
        </section>

        <section className="panel raw-panel">
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
        </section>
      </section>
    </>
  );
}

function PracticePanel(props: {
  suite?: TrainingSuite;
  questions: Question[];
  questionIndex: number;
  currentQuestion?: Question;
  answers: Record<string, unknown>;
  feedback: string;
  language: Language;
  sourceCode: string;
  submissions: Submission[];
  isSubmitting: boolean;
  selectedProblem?: Problem;
  remainingSeconds: number;
  feedbackMode: PracticeFeedbackMode;
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
          <div className="timer-card"><span>Mode</span><strong>{props.feedbackMode === "instant" ? "Instant" : "Final"}</strong></div>
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
            return <button key={item.id} className={`${index === props.questionIndex ? "active" : ""} ${answered ? "answered" : ""}`} onClick={() => props.onQuestionIndex(index)}><span>{index + 1}</span><em>{item.type}</em></button>;
          })}
        </aside>
        <section className="panel practice-card">
          {question ? <QuestionRenderer {...props} question={question} /> : <div className="empty-state">This suite has no questions yet.</div>}
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
  suiteTitle: string;
  onSuiteTitle: (value: string) => void;
  onAddSuite: () => void;
}) {
  return (
    <section className="panel empty-suite-panel">
      <p className="eyebrow">{props.scope} bank</p>
      <h2>No suite selected</h2>
      <p>Topic is only a folder. Add a suite under it, then configure Paste Topic Raw, time, AI generation, and practice.</p>
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
  if (props.question.type === "coding") {
    return (
      <>
        <div className="panel-heading"><div><h3>{props.question.title}</h3><p>{props.question.description || props.selectedProblem?.statement}</p></div><select value={props.language} onChange={(event) => props.onLanguage(event.target.value as Language)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <CodeEditor language={props.language} value={props.sourceCode} onChange={props.onSourceCode} />
        <div className="actions"><button onClick={props.onSubmitCode} disabled={props.isSubmitting || !props.selectedProblem}>{props.isSubmitting ? "Running..." : "Run Code"}</button><button className="secondary" onClick={props.onRefresh}>Refresh</button></div>
        <ResultList submissions={props.submissions} />
      </>
    );
  }
  return (
    <>
      <h3>{props.question.title}</h3>
      {props.question.description && <p>{props.question.description}</p>}
      {props.question.type === "single" && <OptionList question={props.question} value={value as string | undefined} onAnswer={props.onAnswer} />}
      {props.question.type === "multiple" && <MultiOptionList question={props.question} value={(value as string[] | undefined) || []} onAnswer={props.onAnswer} />}
      {props.question.type === "boolean" && <div className="choice-list"><button className={value === true ? "selected" : ""} onClick={() => props.onAnswer(props.question.id, true)}>True</button><button className={value === false ? "selected" : ""} onClick={() => props.onAnswer(props.question.id, false)}>False</button></div>}
      {props.question.type === "blank" && <input className="answer-input" placeholder="Type your answer" value={(value as string | undefined) || ""} onChange={(event) => props.onAnswer(props.question.id, event.target.value)} />}
      {props.feedbackMode === "instant" ? <div className="actions"><button onClick={props.onSubmitNonCoding}>Submit Answer</button></div> : <div className="notice">Answer saved. Submit the suite at the end to show answers.</div>}
      {props.feedback && props.feedbackMode === "instant" && <div className="notice">{props.feedback}</div>}
      {showAnswer && <AnswerReveal question={props.question} />}
    </>
  );
}

function CodeEditor({ language, value, onChange }: { language: Language; value: string; onChange: (value: string) => void }) {
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

function OptionList({ question, value, onAnswer }: { question: Question; value?: string; onAnswer: (id: string, value: unknown) => void }) {
  return <div className="choice-list">{question.options?.map((option) => <button key={option.id} className={value === option.id ? "selected" : ""} onClick={() => onAnswer(question.id, option.id)}><span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "32px", height: "32px", borderRadius: "50%", background: value === option.id ? "#2563eb" : "#e0e7ff", color: value === option.id ? "white" : "#2563eb", fontWeight: "900", fontSize: "14px"}}>{option.id}</span><span>{option.text}</span></button>)}</div>;
}

function MultiOptionList({ question, value, onAnswer }: { question: Question; value: string[]; onAnswer: (id: string, value: unknown) => void }) {
  return <div className="choice-list">{question.options?.map((option) => {
    const selected = value.includes(option.id);
    const nextValue = selected ? value.filter((id) => id !== option.id) : [...value, option.id];
    return <button key={option.id} className={selected ? "selected" : ""} onClick={() => onAnswer(question.id, nextValue)}><span style={{display: "inline-flex", alignItems: "center", justifyContent: "center", minWidth: "32px", height: "32px", borderRadius: "8px", background: selected ? "#2563eb" : "#e0e7ff", color: selected ? "white" : "#2563eb", fontWeight: "900", fontSize: "14px"}}>{selected ? "\u2713" : ""}</span><span>{option.text}</span></button>;
  })}</div>;
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

function collectTopicIds(nodes: TopicNode[], topicId: string) {
  const topic = flattenTopics(nodes).find((item) => item.id === topicId);
  return new Set(topic ? [topic.id, ...flattenTopics(topic.children || []).map((item) => item.id)] : []);
}

function getTopicSuiteItems(topic: TopicNode, allSuites: TrainingSuite[]) {
  const childIds = new Set((topic.children || []).map((child) => child.id));
  return allSuites.filter((suite) => suite.topicId === topic.id || childIds.has(suite.topicId));
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
