import json
import os
import resource
import subprocess
import tempfile
import time
import urllib.request


BACKEND_URL = os.environ.get("BACKEND_URL", "").rstrip("/")
SUBMISSION_ID = os.environ.get("SUBMISSION_ID", "")


def main():
    if not BACKEND_URL or not SUBMISSION_ID:
        raise SystemExit("BACKEND_URL and SUBMISSION_ID are required")

    submission = get_json(f"{BACKEND_URL}/api/submissions/{SUBMISSION_ID}")["data"]

    started = time.monotonic()
    with tempfile.TemporaryDirectory() as tmp:
        source_path = os.path.join(tmp, "main.py")
        with open(source_path, "w", encoding="utf-8") as file:
            file.write(submission["sourceCode"])

        proc = subprocess.run(
            ["python", source_path],
            cwd=tmp,
            capture_output=True,
            text=True,
            timeout=5,
            preexec_fn=limit_process,
        )

    result = {
        "status": "accepted" if proc.returncode == 0 else "runtime_error",
        "stdout": proc.stdout[:8000],
        "stderr": proc.stderr[:8000],
        "durationMs": int((time.monotonic() - started) * 1000),
        "testcaseResults": [],
    }
    post_json(f"{BACKEND_URL}/api/internal/judge-results/{SUBMISSION_ID}", result)


def limit_process():
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    resource.setrlimit(resource.RLIMIT_AS, (128 * 1024 * 1024, 128 * 1024 * 1024))


def get_json(url):
    with urllib.request.urlopen(url, timeout=10) as response:
        return json.loads(response.read().decode("utf-8"))


def post_json(url, payload):
    data = json.dumps(payload).encode("utf-8")
    request = urllib.request.Request(url, data=data, headers={"content-type": "application/json"})
    with urllib.request.urlopen(request, timeout=10) as response:
        response.read()


if __name__ == "__main__":
    main()
