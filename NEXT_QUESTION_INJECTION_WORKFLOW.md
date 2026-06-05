# Next Question Injection Workflow

Use this file when a future Codex conversation receives a request like:

> 注入新题

The user will usually paste a large block of lesson text or ask Codex to read the current Microsoft Learn page, generate quiz content, inject it into the app data/template, then push to GitHub so GitHub Actions deploys to the real server.

## Do Not Waste Time

- Work in this repo: `C:\Users\13128\OneDrive\杂项\CodePractice\Ace-Coding-Practice-Platform`
- Remote: `https://github.com/JL37776/Ace-Coding-Practice-Platform.git`
- Main branch deploys through `.github/workflows/deploy-phone.yml`
- Public production URL: `https://acecode.lljobhunting.workers.dev/`
- Push to `main` triggers "Deploy to server"
- Do not edit or stage `.idea/copilot.data.migration.ask2agent.xml`
- Do not stop at local-only changes unless the user explicitly asks for local-only
- For feature/data injection requests, build, commit, push, and check GitHub Actions

## Current Question Bank Model

The hierarchy is not filesystem folders. It is a topic tree in data/API:

```text
TopicNode root
  -> TopicNode child/subtopic
     -> TrainingSuite
        -> Question
```

Important types are in:

```text
packages/shared/src/index.ts
```

Backend seed data is in:

```text
apps/backend/src/data/seed.ts
```

Raw suite parsing is in:

```text
apps/backend/src/routes.ts
```

Frontend raw template and AI prompt template are in:

```text
apps/frontend/src/App.tsx
```

## Existing Hierarchy Recommendation For Microsoft Learn C# Path

Use or create topic nodes like:

```text
Language & Framework Tracks
  -> C# Track
     -> Microsoft Learn: Get started with classes and objects
        -> OOP Foundations
```

Suites should represent page/module subtopics, for example:

```text
Compare Structured and Object-Oriented Programming
Examine the .NET Type System
```

## Raw Suite Format

The parser supports:

```text
@suite
title=<suite title>
description=<what this suite trains>
duration=<minutes>

@outline
## Source Outline
- Learning objective:
- Key concepts:
- Important distinctions:
- Common mistakes:
- Source notes:

@q
type=<single|multiple|boolean|blank|coding>
title=<question>
A=<choice>
B=<choice>
C=<choice>
D=<choice>
answer=<answer>
explanation=<why>
tags=<comma,separated,tags>
```

`@outline` is Markdown. It is stored as:

```ts
TrainingSuite.metadata.outlineMarkdown
```

In the UI, the suite outline is shown collapsed by default.

## Quiz Generation Rules From User Preference

When generating quiz questions from a learning page:

- Use English-only questions and options unless the user explicitly asks otherwise.
- Use multiple-choice questions by default.
- Do not reveal answers until the user finishes answering.
- Do not make every correct answer the same option; distribute answers across A/B/C/D.
- Do not overfit by copying page sentences word-for-word.
- Do not expand far beyond the page. Slight practical/contextual variation is okay.
- Match question count to page density:
  - Basic/transition page: 3-5 questions
  - Medium page: 6-8 questions
  - Dense/confusing page: 8-12 questions
- Focus on the most important ideas, not every sentence.

## Injection Steps

When the user says "注入新题":

1. Read the pasted text or current in-app browser page.
2. Identify target hierarchy:
   - Track
   - Applied skill / module
   - Topic
   - Subtopic
   - Suite title
3. Generate a concise `@outline` Markdown block.
4. Generate the quiz suite in raw parser format.
5. Inject data into the project:
   - If using seed data, edit `apps/backend/src/data/seed.ts`.
   - If improving the raw import/template behavior, edit `apps/backend/src/routes.ts` and `apps/frontend/src/App.tsx`.
   - Preserve existing data and IDs.
   - Use stable IDs for new seed topics/suites/questions.
6. Run:

```bash
npm run build
```

7. Stage only relevant files:

```bash
git add <relevant files>
```

8. Commit:

```bash
git commit -m "feat: add <topic> question suite"
```

9. Push:

```bash
git push origin main
```

10. Check GitHub Actions:

```powershell
Invoke-RestMethod -Uri 'https://api.github.com/repos/JL37776/Ace-Coding-Practice-Platform/actions/runs?per_page=1' -Headers @{ 'User-Agent'='Codex' } | ConvertTo-Json -Depth 6
```

Then poll the run/jobs until the deploy job succeeds or fails.

## Deployment Notes

GitHub Actions workflow:

```text
.github/workflows/deploy-phone.yml
```

The deploy job:

1. Installs dependencies
2. Builds all workspaces
3. Packages the repo
4. Uploads to server over SSH
5. Runs `infra/deploy/phone/start-ace-coding.sh`
6. Runs `infra/deploy/phone/start-aws-9999-tunnel.sh`
7. Checks:

```text
http://127.0.0.1:3100/api/health
http://127.0.0.1:8080/api/health
```

After a successful deploy, verify the public app through:

```text
https://acecode.lljobhunting.workers.dev/
```

Use the public URL for browser login checks. Do not waste time guessing the tunnel host or raw AWS IP when the Cloudflare Worker URL is available.

## Current Implemented Support

The app already supports:

- Adding child topics through the frontend topic tree
- `@outline` / `@doc` Markdown block in raw suite parsing
- Saving outline Markdown to `TrainingSuite.metadata.outlineMarkdown`
- Showing suite outline collapsed by default
- Updated frontend raw template and AI prompt template

## If Asked To Continue From Microsoft Learn

Use the in-app browser current page when available. Read the page, produce a calibrated quiz first if the user is studying interactively. Only inject into data and push when the user explicitly asks to inject/save/push.
