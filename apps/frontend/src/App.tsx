import { useEffect, useMemo, useState } from "react";
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
  const [editorMessage, setEditorMessage] = useState("");
  const [newTopicName, setNewTopicName] = useState<Record<BankScope, string>>({ public: "", personal: "" });
  const [newSuiteTitle, setNewSuiteTitle] = useState<Record<BankScope, string>>({ public: "", personal: "" });
  const [openBank, setOpenBank] = useState<Record<BankScope, boolean>>({ public: true, personal: true });
  const [openTopics, setOpenTopics] = useState<Record<string, boolean>>({});

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
    const targetTopicId =
      scope === targetScope && flattenTopics(topics).some((topic) => topic.id === activeTopicId && topic.scope === targetScope)
        ? activeTopicId
        : flattenTopics(topics).find((topic) => topic.scope === targetScope)?.id;
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
    const parsed = await api.parseTopicRaw({ scope, topicId: activeTopicId, raw: rawText });
    setRawPreview(JSON.stringify(parsed, null, 2));
    setEditorMessage(`Parsed ${parsed.questions.length} questions for ${parsed.suite.title}.`);
  }

  async function importRaw() {
    const imported = await api.importTopicRaw({ scope, topicId: activeTopicId, raw: rawText });
    setActiveSuiteId(imported.suite.id);
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

  return (
    <main className="app-shell">
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
          onSelectSuite={(id) => { setScope("public"); setActiveSuiteId(id); setMode("config"); }}
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
          onSelectSuite={(id) => { setScope("personal"); setActiveSuiteId(id); setMode("config"); }}
          onTopicName={(value) => setNewTopicName({ ...newTopicName, personal: value })}
          onSuiteTitle={(value) => setNewSuiteTitle({ ...newSuiteTitle, personal: value })}
          onAddTopic={() => void addTopic("personal")}
          onAddSuite={() => void addSuite("personal")}
        />
      </aside>

      <section className="workspace">
        {mode === "config" ? (
          <SuiteConfig
            scope={scope}
            activeSuite={activeSuite}
            activeQuestions={activeQuestions}
            activeTopicId={activeTopicId}
            rawText={rawText}
            rawPreview={rawPreview}
            editorMessage={editorMessage}
            onRawText={setRawText}
            onParseRaw={() => void parseRaw()}
            onImportRaw={() => void importRaw()}
            onPractice={() => {
              setQuestionIndex(0);
              setFeedback("");
              setMode("practice");
            }}
          />
        ) : (
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
            onBack={() => setMode("config")}
            onQuestionIndex={(index) => { setQuestionIndex(index); setFeedback(""); }}
            onAnswer={(questionId, value) => setAnswers({ ...answers, [questionId]: value })}
            onSubmitNonCoding={submitNonCoding}
            onLanguage={setLanguage}
            onSourceCode={setSourceCode}
            onSubmitCode={() => void submitCode()}
            onRefresh={() => void refreshSubmissions()}
          />
        )}
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
        <strong>{props.open ? "[-]" : "[+]"} {props.title}</strong>
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
  onSelectSuite: (id: string) => void;
}) {
  const open = props.openTopics[props.topic.id] ?? true;
  const topicSuites = props.suites.filter((suite) => suite.topicId === props.topic.id);
  const hasChildren = Boolean(props.topic.children?.length || topicSuites.length);
  return (
    <div>
      <div className={props.topic.id === props.activeTopicId ? "topic-row active" : "topic-row"}>
        <button className="collapse-button" onClick={() => props.onToggleTopic(props.topic.id)}>{hasChildren ? (open ? "-" : "+") : ""}</button>
        <button className="topic-main" onClick={() => props.onSelectTopic(props.scope, props.topic.id)}>
          <strong>{props.topic.name}</strong>
          <span>{props.topic.scorePercent}% ({props.topic.done}/{props.topic.total})</span>
        </button>
      </div>
      {open && (
        <div className="child-topic">
          {props.topic.children?.map((child) => <TopicNodeView key={child.id} {...props} topic={child} />)}
          {topicSuites.map((suite) => (
            <button key={suite.id} className={suite.id === props.activeSuiteId ? "suite-tree-item active" : "suite-tree-item"} onClick={() => props.onSelectSuite(suite.id)}>
              <strong>{suite.title}</strong>
              <span>{suite.scorePercent}% ({suite.done}/{suite.total})</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function SuiteConfig(props: {
  scope: BankScope;
  activeSuite?: TrainingSuite;
  activeQuestions: Question[];
  activeTopicId: string;
  rawText: string;
  rawPreview: string;
  editorMessage: string;
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
          <div className="question-list">{props.activeQuestions.map((question, index) => <article key={question.id}><strong>{index + 1}. {question.title}</strong><span>{question.type} | {question.difficulty}</span></article>)}</div>
        </section>

        <section className="panel raw-panel">
          <div className="panel-heading"><div><h3>Paste Topic Raw</h3><p>Paste AI/generated raw content for one full suite. Parse, validate, import.</p></div><button className="secondary">AI Similar Questions</button></div>
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
  return (
    <>
      <header className="hero-bar compact">
        <div>
          <p className="eyebrow">Practice</p>
          <h2>{props.suite?.title || "Practice Suite"}</h2>
          <p>Question {props.questionIndex + 1} / {props.questions.length || 0}</p>
        </div>
        <button className="secondary" onClick={props.onBack}>Back to Suite Config</button>
      </header>
      <section className="practice-layout">
        <aside className="question-nav">
          {props.questions.map((item, index) => <button key={item.id} className={index === props.questionIndex ? "active" : ""} onClick={() => props.onQuestionIndex(index)}>{index + 1}. {item.type}</button>)}
        </aside>
        <section className="panel practice-card">
          {question ? <QuestionRenderer {...props} question={question} /> : <div className="empty-state">This suite has no questions yet.</div>}
        </section>
      </section>
    </>
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

function formatSubmission(submission: Submission) {
  if (!submission.result) return "Waiting for runner...";
  return [submission.result.stdout, submission.result.stderr, ...submission.result.testcaseResults.map((item) => `${item.testcaseId}: ${item.status}${item.stderr ? ` - ${item.stderr}` : ""}`)].filter(Boolean).join("\n") || "Judge finished.";
}
