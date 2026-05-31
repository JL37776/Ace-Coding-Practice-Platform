# Ace Coding Practice Platform

MVP coding practice platform for problems, submissions, and pluggable judge runners.

## Architecture

```text
apps/frontend        React/Vite UI
apps/backend         Express API and judge orchestration
packages/shared      Shared domain types and constants
infra/deploy         Phone Ubuntu deployment assets
infra/runners        Azure Container Apps runner notes
```

The backend uses a `JudgeProvider` interface. Local development uses a mock provider, while production can switch to Azure Container Apps Jobs by setting `JUDGE_PROVIDER=azure-container-apps`.

## Local Development

```bash
npm install
npm run dev:backend
npm run dev:frontend
```

## Phone Ubuntu Deployment

GitHub Actions deploys over SSH on push to `main`. Configure repository secrets:

```text
PHONE_SSH_HOST
PHONE_SSH_PORT
PHONE_SSH_USER
PHONE_SSH_KEY
PHONE_DEPLOY_PATH
```

For your AWS tunnel, set `PHONE_SSH_PORT` to `9999` if that is the exposed SSH tunnel port.
