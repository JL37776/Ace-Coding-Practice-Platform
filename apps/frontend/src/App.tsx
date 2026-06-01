import { useEffect, useMemo, useState, type MouseEvent as ReactMouseEvent } from "react";
import type { AuthSession, BankScope, Language, Problem, Question, Submission, TopicNode, TrainingSuite, User } from "@ace/shared";
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

const defaultRaw = `@suite
title=Imported Mixed Practice
description=Paste a whole suite here. Then set time, validate, import, and practice.
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
- single: provide A=, B=, C= or more options, answer=A.
- multiple: provide options, answer=A,C.
- boolean: answer=true or answer=false.
- blank: answer=exact expected text.
- coding: include title, description, tags, and a short starter requirement. Keep it runnable later by the code runner.
- Difficulty should match the requested learner level.
- Generate realistic interview/training questions, not vague trivia.

Format:
@suite
title=<suite title>
description=<what this suite trains>
duration=<minutes>

@q
type=single
title=<question>
A=<option>
B=<option>
C=<option>
answer=<option id>
explanation=<why>
tags=<comma,separated,tags>

@q
type=boolean
title=<statement>
answer=true
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

  const publicTopics = topics.filter((topic) => topic.scope === "public");
  const personalTopics = topics.filter((topic) => topic.scope === "personal");
  const activeSuite = suites.find((suite) => suite.id === activeSuiteId);
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
  }, [user, activeTopicId, scope]);

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

  async function refreshWorkspace() {
    const [topicList, suiteList, questionList, problemList, submissionList] = await Promise.all([
      api.listTopics(),
      api.listSuites(),
      api.listQuestions(),
      api.listProblems(),
      api.listSubmissions()
    ]);
    const activeTopicIds = collectTopicIds(topicList, activeTopicId);
    const scopedSuites = suiteList.filter((suite) => suite.scope === scope && activeTopicIds.has(suite.topicId));
    setTopics(topicList);
    setSuites(suiteList);
    setQuestions(questionList);
    setProblems(problemList);
    setSubmissions(submissionList);
    if (!scopedSuites.some((suite) => suite.id === activeSuiteId)) setActiveSuiteId(scopedSuites[0]?.id || "");
    setQuestionIndex(0);
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
    const topic = await api.createTopic({ scope: targetScope, name });
    setNewTopicName({ ...newTopicName, [targetScope]: "" });
    selectTopic(targetScope, topic.id);
    await refreshWorkspace();
  }

  async function addSuite(targetScope: BankScope) {
    const title = newSuiteTitle[targetScope].trim();
    if (!title) return;
    const targetTopicId = pickSuiteTopicId(topics, targetScope, scope === targetScope ? activeTopicId : undefined);
    if (!targetTopicId) return;
    const suite = await api.createSuite({
      scope: targetScope,
      topicId: targetTopicId,
      title,
      description: "Created from the suite quick-add panel.",
      questionCount: 0,
      durationMinutes: 15,
      allowedTypes: ["single", "multiple", "boolean", "blank", "coding"]
    });
    setNewSuiteTitle({ ...newSuiteTitle, [targetScope]: "" });
    setScope(targetScope);
    setActiveSuiteId(suite.id);
    await refreshWorkspace();
  }

  async function parseRaw() {
    if (!activeTopicId) return;
    const parsed = await api.parseTopicRaw({ scope, topicId: activeTopicId, raw: rawText });
    setRawPreview(JSON.stringify(parsed, null, 2));
    setRawParsedQuestions(parsed.questions);
    setEditorMessage(`Parsed ${parsed.questions.length} questions for ${parsed.suite.title}.`);
  }

  async function importRaw() {
    if (!activeTopicId) return;
    const imported = await api.importTopicRaw({ scope, topicId: activeTopicId, raw: rawText });
    setActiveSuiteId(imported.suite.id);
    setRawParsedQuestions(imported.questions);
    setEditorMessage(`Imported ${imported.questions.length} questions into ${imported.suite.title}.`);
    await refreshWorkspace();
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
    setFeedback(ok ? "Correct." : `Submitted. Expected answer: ${JSON.stringify(expected)}`);
  }

  function selectTopic(targetScope: BankScope, id: string) {
    setScope(targetScope);
    setActiveTopicId(id);
    setMode("config");
  }

  function selectFolder(targetScope: BankScope, topic: TopicNode) {
    const firstSuite = getTopicSuiteItems(topic, suites.filter((suite) => suite.scope === targetScope))[0];
    setScope(targetScope);
    setActiveTopicId(firstSuite?.topicId || topic.id);
    setActiveSuiteId(firstSuite?.id || "");
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
        onBack={() => setMode("config")}
        onQuestionIndex={(index) => { setQuestionIndex(index); setFeedback(""); }}
        onAnswer={(questionId, value) => setAnswers({ ...answers, [questionId]: value })}
        onSubmitNonCoding={submitNonCoding}
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
        />
      </aside>
      <div className="sidebar-resizer" onMouseDown={startSidebarResize} aria-label="Resize sidebar" />

      <section className="workspace">
        {mode === "config" && activeSuite ? (
          <SuiteConfig
            scope={scope}
            activeSuite={activeSuite}
            activeQuestions={activeQuestions}
            rawParsedQuestions={rawParsedQuestions}
            activeTopicId={activeTopicId}
            rawText={rawText}
            rawPreview={rawPreview}
            editorMessage={editorMessage}
            onRawText={setRawText}
            onParseRaw={() => void parseRaw()}
            onImportRaw={() => void importRaw()}
            aiPromptTemplate={aiPromptTemplate}
            onPractice={() => {
              setQuestionIndex(0);
              setFeedback("");
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
    </main>
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
              />
            )) : <div className="bank-empty">No topics yet.</div>}
          </div>
          <div className="bank-add">
            <input placeholder="New topic name" value={props.newTopicName} onChange={(event) => props.onTopicName(event.target.value)} />
            <button onClick={props.onAddTopic} disabled={disabled}>Add Topic</button>
            <input placeholder="New suite title" value={props.newSuiteTitle} onChange={(event) => props.onSuiteTitle(event.target.value)} />
            <button onClick={props.onAddSuite} disabled={disabled}>Add Suite</button>
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
      </div>
      {open && (
        <div className="child-topic">
          {topicSuites.map((suite) => (
            <button key={suite.id} className={suite.id === props.activeSuiteId ? "suite-tree-item active" : "suite-tree-item"} onClick={() => props.onSelectSuite(suite.id)}>
              <strong>{suite.title}</strong>
              <span>{suite.scorePercent}% ({suite.done}/{suite.total})</span>
              <small>{suite.questionCount} questions | {suite.allowedTypes.join(", ")}</small>
            </button>
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
  activeQuestions: Question[];
  rawParsedQuestions: Question[];
  activeTopicId: string;
  rawText: string;
  rawPreview: string;
  editorMessage: string;
  aiPromptTemplate: string;
  onRawText: (value: string) => void;
  onParseRaw: () => void;
  onImportRaw: () => void;
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
            <button className="secondary">Save</button>
          </div>
          <div className="form-grid">
            <label>Suite Name<input value={props.activeSuite?.title || ""} readOnly /></label>
            <label>Parent Topic<input value={props.activeTopicId} readOnly /></label>
            <label>Time Limit<input value={`${props.activeSuite?.durationMinutes || 15} minutes`} readOnly /></label>
            <label>Question Count<input value={`${props.activeSuite?.questionCount || props.activeQuestions.length} questions`} readOnly /></label>
          </div>
          <div className="type-row">{(props.activeSuite?.allowedTypes || ["single", "multiple", "boolean", "blank", "coding"]).map((type) => <span key={type}>{type}</span>)}</div>
          {props.rawParsedQuestions.length > 0 && <RawQuestionSummary questions={props.rawParsedQuestions} />}
          <div className="question-list">{props.activeQuestions.map((question, index) => <article key={question.id}><strong>{index + 1}. {question.title}</strong><span>{question.type} | {question.difficulty}</span></article>)}</div>
        </section>

        <section className="panel raw-panel">
          <div className="panel-heading"><div><h3>Paste Topic Raw</h3><p>Paste AI/generated raw content for one full suite. Parse, validate, import.</p></div><button className="secondary">AI Similar Questions</button></div>
          <label className="prompt-template-label">
            AI Prompt Template
            <textarea className="prompt-template" value={props.aiPromptTemplate} readOnly />
          </label>
          <textarea className="raw-editor" value={props.rawText} onChange={(event) => props.onRawText(event.target.value)} />
          <div className="actions"><button onClick={props.onParseRaw}>Parse</button><button className="secondary" onClick={props.onParseRaw}>Validate</button><button onClick={props.onImportRaw}>Import</button></div>
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
  onBack: () => void;
  onQuestionIndex: (index: number) => void;
  onAnswer: (questionId: string, value: unknown) => void;
  onSubmitNonCoding: () => void;
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
          <div className="timer-card"><span>Time Left</span><strong>{formatSeconds(props.remainingSeconds)}</strong></div>
          <div className="timer-card"><span>Progress</span><strong>{progress}%</strong></div>
          <button className="secondary" onClick={props.onBack}>Exit Practice</button>
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
            <button disabled={props.questionIndex >= props.questions.length - 1} onClick={() => props.onQuestionIndex(props.questionIndex + 1)}>Next</button>
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
  if (props.question.type === "coding") {
    return (
      <>
        <div className="panel-heading"><div><h3>{props.question.title}</h3><p>{props.question.description || props.selectedProblem?.statement}</p></div><select value={props.language} onChange={(event) => props.onLanguage(event.target.value as Language)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
        <textarea className="editor" value={props.sourceCode} spellCheck={false} onChange={(event) => props.onSourceCode(event.target.value)} />
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
      <div className="actions"><button onClick={props.onSubmitNonCoding}>Submit Answer</button></div>
      {props.feedback && <div className="notice">{props.feedback}</div>}
    </>
  );
}

function OptionList({ question, value, onAnswer }: { question: Question; value?: string; onAnswer: (id: string, value: unknown) => void }) {
  return <div className="choice-list">{question.options?.map((option) => <button key={option.id} className={value === option.id ? "selected" : ""} onClick={() => onAnswer(question.id, option.id)}><strong>{option.id}</strong>{option.text}</button>)}</div>;
}

function MultiOptionList({ question, value, onAnswer }: { question: Question; value: string[]; onAnswer: (id: string, value: unknown) => void }) {
  return <div className="choice-list">{question.options?.map((option) => {
    const selected = value.includes(option.id);
    return <button key={option.id} className={selected ? "selected" : ""} onClick={() => onAnswer(question.id, selected ? value.filter((id) => id !== option.id) : [...value, option.id])}><strong>{option.id}</strong>{option.text}</button>;
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

function formatSubmission(submission: Submission) {
  if (!submission.result) return "Waiting for runner...";
  return [submission.result.stdout, submission.result.stderr, ...submission.result.testcaseResults.map((item) => `${item.testcaseId}: ${item.status}${item.stderr ? ` - ${item.stderr}` : ""}`)].filter(Boolean).join("\n") || "Judge finished.";
}

function formatSeconds(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60).toString().padStart(2, "0");
  return `${minutes}:${seconds}`;
}
