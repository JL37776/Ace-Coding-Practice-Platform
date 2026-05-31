# Azure Container Apps Judge Runners

The app keeps code execution behind a backend `JudgeProvider`. Production should
use one Azure Container Apps Job per language:

```text
code-runner-python
code-runner-javascript
```

Each job receives a submission id, fetches source/test data from the phone
backend, runs in an isolated Azure container, posts the result back, and exits.

## First Azure Shape

```text
CPU: 0.25 or 0.5
Memory: 0.5Gi or 1Gi
Max parallel executions: 1
Replica timeout: 10-30 seconds
Scale: manual job execution from backend
```

Do not use Docker-in-Docker. The runner image itself contains the language
runtime and runs the submitted code directly inside that one Azure job
container.

## Backend Env

```text
JUDGE_PROVIDER=azure-container-apps
AZURE_SUBSCRIPTION_ID=...
AZURE_RESOURCE_GROUP=...
AZURE_LOCATION=australiaeast
AZURE_CONTAINER_APP_JOB_PYTHON=code-runner-python
AZURE_CONTAINER_APP_JOB_JAVASCRIPT=code-runner-javascript
PUBLIC_BASE_URL=http://13.217.45.222:9999
```

The provider is intentionally thin right now. The next step is to add the Azure
ARM call that starts a Container Apps Job execution with the submission id.
