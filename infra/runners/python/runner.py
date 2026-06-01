import contextlib
import io
import json
import os
import resource
import signal
import sys
import time
import traceback


PAYLOAD_PATH = os.environ.get("JUDGE_PAYLOAD_PATH", "/workspace/payload.json")


def main():
    limit_process()
    started = time.monotonic()
    payload = read_payload()

    submission = payload["submission"]
    problem = payload["problem"]
    test_cases = payload["testCases"]
    config = problem.get("configJson", {})
    entrypoint = get_entrypoint(config)

    namespace = {}
    captured = io.StringIO()
    try:
        with contextlib.redirect_stdout(captured):
            exec(compile(submission["sourceCode"], "submission.py", "exec"), namespace)
    except Exception:
        emit(
            {
                "status": "compile_error",
                "stdout": captured.getvalue()[:8000],
                "stderr": traceback.format_exc()[:8000],
                "durationMs": elapsed_ms(started),
                "testcaseResults": [],
            }
        )
        return

    fn = namespace.get(entrypoint)
    if not callable(fn):
        emit(
            {
                "status": "runtime_error",
                "stdout": captured.getvalue()[:8000],
                "stderr": f"Expected a callable function named {entrypoint}",
                "durationMs": elapsed_ms(started),
                "testcaseResults": [],
            }
        )
        return

    testcase_results = []
    overall_status = "accepted"
    for test_case in test_cases:
        case_started = time.monotonic()
        status = "accepted"
        stderr = ""
        try:
            args = dict(test_case["inputJson"])
            signal.alarm(max(1, int(config.get("timeLimitMs", 5000) / 1000)))
            actual = fn(**args)
            signal.alarm(0)
            if actual != test_case["expectedJson"]:
                status = "wrong_answer"
                stderr = f"expected {json.dumps(test_case['expectedJson'])}, got {json.dumps(actual)}"
        except TimeoutError:
            status = "time_limit_exceeded"
            stderr = "Time limit exceeded"
        except Exception:
            status = "runtime_error"
            stderr = traceback.format_exc(limit=5)
        finally:
            signal.alarm(0)

        if status != "accepted" and overall_status == "accepted":
            overall_status = status
        testcase_results.append(
            {
                "testcaseId": test_case["id"],
                "status": status,
                "stderr": stderr[:1000],
                "durationMs": elapsed_ms(case_started),
            }
        )

    emit(
        {
            "status": overall_status,
            "stdout": captured.getvalue()[:8000],
            "stderr": "",
            "durationMs": elapsed_ms(started),
            "testcaseResults": testcase_results,
        }
    )


def get_entrypoint(config):
    entrypoint = config.get("entrypoint", {}).get("python")
    if entrypoint:
        return entrypoint
    function_name = config.get("functionName", "solution")
    return "".join([f"_{c.lower()}" if c.isupper() else c for c in function_name]).lstrip("_")


def read_payload():
    if os.path.exists(PAYLOAD_PATH):
        with open(PAYLOAD_PATH, "r", encoding="utf-8") as file:
            return json.load(file)
    return json.loads(sys.stdin.read())


def elapsed_ms(started):
    return int((time.monotonic() - started) * 1000)


def limit_process():
    resource.setrlimit(resource.RLIMIT_CPU, (5, 5))
    resource.setrlimit(resource.RLIMIT_AS, (256 * 1024 * 1024, 256 * 1024 * 1024))
    signal.signal(signal.SIGALRM, lambda *_args: (_ for _ in ()).throw(TimeoutError()))


def emit(payload):
    print(json.dumps(payload, ensure_ascii=False), flush=True)


if __name__ == "__main__":
    main()
