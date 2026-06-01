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
description=Paste raw topic content, validate it, then import it into the selected bank.
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
  const [language, setLanguage] = useState<Language>("python");
  const [sourceCode, setSourceCode] = useState(starterCode.python);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", displayName: "New Learner" });
  const [authError, setAuthError] = useState("");
  const [rawText, setRawText] = useState(defaultRaw);
  const [rawPreview, setRawPreview] = useState("");
  const [editorMessage, setEditorMessage] = useState("");
  const [newTopicName, setNewTopicName] = useState("");
  const [newSuiteTitle, setNewSuiteTitle] = useState("");

  const publicTopics = topics.filter((topic) => topic.scope === "public");
  const personalTopics = topics.filter((topic) => topic.scope === "personal");
  const activeSuite = suites.find((suite) => suite.id === activeSuiteId);
  const activeQuestions = questions.filter((question) => question.suiteId === activeSuiteId);
  const codingQuestion = activeQuestions.find((question) => question.type === "coding");
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
      api.listSuites(activeTopicId, scope),
      api.listQuestions(undefined, scope),
      api.listProblems(),
      api.listSubmissions()
    ]);
    setTopics(topicList);
    setSuites(suiteList);
    setQuestions(questionList);
    setProblems(problemList);
    setSubmissions(submissionList);
    if (!suiteList.some((suite) => suite.id === activeSuiteId) && suiteList[0]) setActiveSuiteId(suiteList[0].id);
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
    if (!newTopicName.trim()) return;
    const topic = await api.createTopic({ scope: targetScope, name: newTopicName.trim() });
    setNewTopicName("");
    setScope(targetScope);
    setActiveTopicId(topic.id);
    await refreshWorkspace();
  }

  async function addSuite(targetScope: BankScope) {
    if (!newSuiteTitle.trim()) return;
    const suite = await api.createSuite({
      scope: targetScope,
      topicId: activeTopicId,
      title: newSuiteTitle.trim(),
      description: "Created from the suite quick-add panel.",
      questionCount: 0,
      durationMinutes: 15,
      allowedTypes: ["single", "multiple", "boolean", "blank", "coding"]
    });
    setNewSuiteTitle("");
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
        <BankPanel title="Public Question Bank" scope="public" topics={publicTopics} activeScope={scope} activeId={activeTopicId} user={user} onSelect={selectTopic} />
        <BankPanel title="Personal Question Bank" scope="personal" topics={personalTopics} activeScope={scope} activeId={activeTopicId} user={user} onSelect={selectTopic} />
        <div className="quick-add">
          <strong>Add to {scope === "public" ? "Public" : "My"} Bank</strong>
          <input placeholder="New topic name" value={newTopicName} onChange={(event) => setNewTopicName(event.target.value)} />
          <button onClick={() => void addTopic(scope)} disabled={scope === "public" && user.role !== "admin"}>Add Topic</button>
          <input placeholder="New suite title" value={newSuiteTitle} onChange={(event) => setNewSuiteTitle(event.target.value)} />
          <button onClick={() => void addSuite(scope)} disabled={scope === "public" && user.role !== "admin"}>Add Suite</button>
        </div>
      </aside>

      <section className="workspace">
        <header className="hero-bar">
          <div>
            <p className="eyebrow">Topic to Suite to Practice to Score</p>
            <h2>{activeSuite?.title || "Choose a suite"}</h2>
            <p>{activeSuite?.description || "Create a personal suite or choose a public suite to start."}</p>
          </div>
          <div className="score-card"><strong>{activeSuite ? `${activeSuite.scorePercent}% (${activeSuite.done}/${activeSuite.total})` : "0% (0/0)"}</strong><span>auto score</span></div>
        </header>

        <section className="suite-grid">
          {suites.length === 0 ? <div className="empty-state">No {scope} suites under this topic yet.</div> : suites.map((suite) => (
            <button key={suite.id} className={suite.id === activeSuiteId ? "suite-card active" : "suite-card"} onClick={() => setActiveSuiteId(suite.id)}>
              <span>{suite.scope} suite</span><strong>{suite.title}</strong><p>{suite.description}</p><em>{suite.scorePercent}% ({suite.done}/{suite.total})</em>
            </button>
          ))}
        </section>

        <section className="editor-grid">
          <section className="panel">
            <div className="panel-heading"><div><h3>Create / Edit Test Suite</h3><p>Suite fields, constraints, raw import, and AI generation live here.</p></div><button className="secondary">Global Constraints</button></div>
            <div className="form-grid">
              <label>Suite Name<input value={activeSuite?.title || ""} readOnly /></label>
              <label>Parent Topic<input value={activeTopicId} readOnly /></label>
              <label>Time Limit<input value={`${activeSuite?.durationMinutes || 15} minutes`} readOnly /></label>
              <label>Question Count<input value={`${activeSuite?.questionCount || activeQuestions.length} questions`} readOnly /></label>
            </div>
            <div className="type-row">{(activeSuite?.allowedTypes || ["single", "multiple", "boolean", "blank", "coding"]).map((type) => <span key={type}>{type}</span>)}</div>
            <div className="question-list">{activeQuestions.map((question) => <article key={question.id}><strong>{question.title}</strong><span>{question.type} | {question.difficulty}</span>{question.options && <p>{question.options.map((option) => `${option.id}. ${option.text}`).join("  ")}</p>}</article>)}</div>
          </section>

          <section className="panel raw-panel">
            <div className="panel-heading"><div><h3>Paste Topic Raw</h3><p>Paste AI-generated questions and answers, then parse, validate, and import.</p></div><button className="secondary">AI Add Questions</button></div>
            <textarea className="raw-editor" value={rawText} onChange={(event) => setRawText(event.target.value)} />
            <div className="actions"><button onClick={() => void parseRaw()}>Parse</button><button className="secondary" onClick={() => void parseRaw()}>Validate</button><button onClick={() => void importRaw()}>Import</button></div>
            {editorMessage && <div className="notice">{editorMessage}</div>}
            {rawPreview && <pre className="raw-preview">{rawPreview}</pre>}
          </section>
        </section>

        <section className="content-grid">
          <section className="panel runner-panel">
            <div className="panel-heading"><div><h3>Runner Practice</h3><p>{selectedProblem?.statement || "Coding question is required for runner submission."}</p></div><select value={language} onChange={(event) => setLanguage(event.target.value as Language)}>{languages.map((item) => <option key={item} value={item}>{item}</option>)}</select></div>
            <textarea className="editor" value={sourceCode} spellCheck={false} onChange={(event) => setSourceCode(event.target.value)} />
            <div className="actions"><button onClick={submitCode} disabled={isSubmitting || !selectedProblem}>{isSubmitting ? "Submitting..." : "Run Code"}</button><button className="secondary" onClick={() => void refreshSubmissions()}>Refresh</button></div>
          </section>
          <section className="panel">
            <h3>Recent Results</h3>
            <div className="submission-list">{submissions.slice(0, 6).map((submission) => <article key={submission.id} className="submission"><strong>{submission.status}</strong><span>{submission.language} | {new Date(submission.createdAt).toLocaleString()}</span><pre>{formatSubmission(submission)}</pre></article>)}</div>
          </section>
        </section>
      </section>
    </main>
  );

  function selectTopic(targetScope: BankScope, id: string) {
    setScope(targetScope);
    setActiveTopicId(id);
  }
}

function BankPanel({ title, scope, topics, activeScope, activeId, user, onSelect }: { title: string; scope: BankScope; topics: TopicNode[]; activeScope: BankScope; activeId: string; user: User; onSelect: (scope: BankScope, id: string) => void }) {
  const disabled = scope === "public" && user.role !== "admin";
  return (
    <section className="bank-section">
      <div className="bank-heading"><strong>{title}</strong>{disabled && <span>admin only edit</span>}</div>
      <div className="tree-list">{topics.length ? topics.map((topic) => <TopicNodeView key={topic.id} scope={scope} topic={topic} active={activeScope === scope && activeId === topic.id} activeId={activeId} onSelect={onSelect} />) : <div className="bank-empty">No topics yet.</div>}</div>
    </section>
  );
}

function TopicNodeView({ topic, scope, active, activeId, onSelect }: { topic: TopicNode; scope: BankScope; active: boolean; activeId: string; onSelect: (scope: BankScope, id: string) => void }) {
  return (
    <div>
      <button className={active ? "topic active" : "topic"} onClick={() => onSelect(scope, topic.id)}><strong>{topic.name}</strong><span>{topic.scorePercent}% ({topic.done}/{topic.total})</span></button>
      {topic.children?.map((child) => <div key={child.id} className="child-topic"><TopicNodeView topic={child} scope={scope} active={activeId === child.id} activeId={activeId} onSelect={onSelect} /></div>)}
    </div>
  );
}

function formatSubmission(submission: Submission) {
  if (!submission.result) return "Waiting for runner...";
  return [submission.result.stdout, submission.result.stderr, ...submission.result.testcaseResults.map((item) => `${item.testcaseId}: ${item.status}${item.stderr ? ` - ${item.stderr}` : ""}`)].filter(Boolean).join("\n") || "Judge finished.";
}
