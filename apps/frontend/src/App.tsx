import { useEffect, useMemo, useState } from "react";
import type { Problem, Submission } from "@ace/shared";
import { api } from "./api";
import "./styles.css";

const starterCode = {
  python: "def two_sum(nums, target):\n    seen = {}\n    for i, n in enumerate(nums):\n        if target - n in seen:\n            return [seen[target - n], i]\n        seen[n] = i",
  javascript:
    "function twoSum(nums, target) {\n  const seen = new Map();\n  for (let i = 0; i < nums.length; i++) {\n    const need = target - nums[i];\n    if (seen.has(need)) return [seen.get(need), i];\n    seen.set(nums[i], i);\n  }\n}"
};

export default function App() {
  const [problems, setProblems] = useState<Problem[]>([]);
  const [selectedId, setSelectedId] = useState("two-sum");
  const [language, setLanguage] = useState<"python" | "javascript">("python");
  const [sourceCode, setSourceCode] = useState(starterCode.python);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedProblem = useMemo(
    () => problems.find((problem) => problem.id === selectedId),
    [problems, selectedId]
  );

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setSourceCode(starterCode[language]);
  }, [language]);

  async function refresh() {
    const [problemList, submissionList] = await Promise.all([api.listProblems(), api.listSubmissions()]);
    setProblems(problemList);
    setSubmissions(submissionList);
    if (!selectedId && problemList[0]) setSelectedId(problemList[0].id);
  }

  async function submit() {
    if (!selectedProblem) return;
    setIsSubmitting(true);
    try {
      const submission = await api.createSubmission({
        problemId: selectedProblem.id,
        language,
        sourceCode
      });
      setSubmissions((items) => [submission, ...items]);
      window.setTimeout(() => void refresh(), 900);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="app-shell">
      <aside className="problem-list">
        <div>
          <p className="eyebrow">Ace Coding</p>
          <h1>Practice</h1>
        </div>
        {problems.map((problem) => (
          <button
            key={problem.id}
            className={problem.id === selectedId ? "problem active" : "problem"}
            onClick={() => setSelectedId(problem.id)}
          >
            <strong>{problem.title}</strong>
            <span>{problem.difficulty} · {problem.tags.join(", ")}</span>
          </button>
        ))}
      </aside>

      <section className="workspace">
        <header className="toolbar">
          <div>
            <h2>{selectedProblem?.title || "Loading problem"}</h2>
            <p>{selectedProblem?.statement}</p>
          </div>
          <select value={language} onChange={(event) => setLanguage(event.target.value as typeof language)}>
            <option value="python">Python</option>
            <option value="javascript">JavaScript</option>
          </select>
        </header>

        <textarea
          className="editor"
          value={sourceCode}
          spellCheck={false}
          onChange={(event) => setSourceCode(event.target.value)}
        />

        <div className="actions">
          <button onClick={submit} disabled={isSubmitting || !selectedProblem}>
            {isSubmitting ? "Submitting..." : "Submit"}
          </button>
          <button className="secondary" onClick={() => void refresh()}>Refresh</button>
        </div>

        <section className="submissions">
          <h3>Submissions</h3>
          {submissions.length === 0 ? (
            <p className="muted">No submissions yet.</p>
          ) : (
            submissions.slice(0, 8).map((submission) => (
              <article key={submission.id} className="submission">
                <div>
                  <strong>{submission.status}</strong>
                  <span>{submission.language} · {new Date(submission.createdAt).toLocaleString()}</span>
                </div>
                <pre>{submission.result?.stdout || submission.result?.stderr || "Waiting for judge..."}</pre>
              </article>
            ))
          )}
        </section>
      </section>
    </main>
  );
}
