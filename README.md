# Ace Coding Practice Platform

LeetCode-style practice MVP. The current loop is:

1. Open the frontend.
2. Pick the built-in Two Sum problem.
3. Write Python or JavaScript.
4. Submit.
5. The backend starts a Docker language runner.
6. The runner executes hidden/sample tests and returns `accepted`, `wrong_answer`, or an error status.

The first production target is a single Azure Ubuntu VM running Docker Compose.

## Local Development

Install dependencies:

```bash
npm install
```

Run backend and frontend in two terminals:

```bash
npm run dev:backend
npm run dev:frontend
```

By default, backend development can use the mock judge. To test the real Docker judge locally, Docker must be running and the runner images must exist:

```bash
docker build -t ace-judge-python:3.12 infra/runners/python
docker build -t ace-judge-javascript:22 infra/runners/javascript
```

Then set:

```bash
JUDGE_PROVIDER=docker
```

## Docker Compose

Build all app images and runner images:

```bash
docker compose --profile runner-images build
```

Start the web stack:

```bash
docker compose up -d nginx frontend backend
```

Open:

```text
http://localhost:8080
```

The backend container mounts `/var/run/docker.sock` so it can start short-lived runner containers. The runner containers are isolated with:

- no network
- CPU limit
- memory limit
- PID limit
- read-only filesystem
- writable `/tmp`

This is enough for an MVP and internal testing, but it is not a perfect sandbox for hostile public code.

## Azure VM Deployment

Recommended MVP VM:

```text
Standard_B2ms
Ubuntu 24.04 LTS
64GB or 128GB Standard SSD
```

Install Docker on the VM:

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker "$USER"
```

Clone or copy this project to the VM, then:

```bash
docker compose --profile runner-images build
docker compose up -d nginx frontend backend
docker compose ps
```

For a simple first deployment, open Azure NSG port `80` and map compose port `80:80` instead of `8080:80` in `docker-compose.yml`.

## Current Scope

Implemented now:

- Python practice loop
- JavaScript practice loop
- TypeScript practice loop
- remote server runner queue
- in-memory problems/submissions
- exact-output testcase checking
- Docker runner provider
- Azure VM friendly Docker Compose deployment

## Server Runner

The server runner is for the Ubuntu server environment where Docker is not available. It runs as a service, polls the backend queue, executes jobs for runtimes that exist on the server, and posts results back.

Backend config:

```bash
JUDGE_PROVIDER=remote-runner
RUNNER_SHARED_TOKEN=change-me
```

Runner config:

```bash
BACKEND_URL=http://127.0.0.1:3100
RUNNER_SHARED_TOKEN=change-me
RUNNER_POLL_MS=1200
RUNNER_TIMEOUT_MS=6000
```

Start on the server:

```bash
npm install
npm run build
infra/deploy/phone/start-ace-coding.sh
```

The runner auto-detects available languages:

```text
python      requires python3
javascript  requires node
typescript  requires node; TypeScript transpiler is bundled in the runner package
sql         requires sqlite3
csharp      requires dotnet SDK
java        requires javac and java
```

Isolation on the server runner is process-level only: per-job temp directories, timeout, output truncation, and no long-lived user files. This is acceptable for controlled practice workloads, but not enough for hostile public submissions. For stronger isolation later, move runners to Docker/gVisor/Firecracker on a dedicated Linux host.

Next natural steps:

- persist problems and submissions in PostgreSQL
- add admin problem editing
- add Redis/BullMQ for async jobs
- add stronger sandboxing for public traffic
