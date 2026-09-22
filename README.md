# Agentic RAG Travel Assistant -- Frontend

Next.js UI for the [agentic-rag-fastapi](https://github.com/YouyuLisng/agentic-rag-fastapi)
backend: a chat interface that streams an agent's tool-use decisions
live (not just the final answer), a side-by-side mode to compare the
hand-rolled agent loop against the LangChain implementation on the
same question, a `/data` page exposing the real seed data so a viewer
can independently verify the chatbot's answers, and an `/eval`
dashboard for the backend's three-layer eval framework (retrieval,
generation, tool selection).

## Stack

Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, shadcn/ui
(built on Base UI, not Radix -- prop APIs differ from the Radix-based
shadcn docs). Talks to the backend over SSE for streamed chat, plain
`fetch` for everything else.

## Setup

```bash
npm install
cp .env.example .env.local   # NEXT_PUBLIC_API_URL, defaults to http://localhost:8000
npm run dev
```

Requires the backend running separately (see that repo's README) --
this project has no server-side logic of its own beyond what Next.js
itself needs, everything real happens in the FastAPI backend.

## Private deployment (Docker)

This repo has its own standalone `Dockerfile` (multi-stage, Next.js
`output: "standalone"`) -- build and run it on its own:

```bash
docker build -t agentic-rag-frontend --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000 .
docker run -p 3000:3000 agentic-rag-frontend
```

`NEXT_PUBLIC_API_URL` is a **build** argument, not a runtime one --
Next.js inlines `process.env.NEXT_PUBLIC_*` into the client-side
bundle while compiling, so setting it only as a container environment
variable at `docker run` time has no effect on the already-built
bundle.

For the full stack (this frontend + the backend + a self-hosted
Postgres+pgvector, no external cloud dependency) via one
`docker compose up`, see `docker-compose.yml` in the backend repo --
it expects this repo cloned as a sibling directory
(`../agentic-rag-frontend`).

## Project layout

```
app/
  page.tsx        chat UI -- streams SSE, side-by-side compare mode
  data/page.tsx    read-only view of the real seed data
  eval/page.tsx    retrieval/generation/tool-selection eval dashboards
components/
  chat/            tool-call timeline, markdown rendering
  ui/               shadcn/ui components (Base UI-based)
lib/
  chat.ts          SSE parsing, chat/document-upload API calls
  data.ts          /tours, /policies fetchers
  eval.ts          /eval/* fetchers
Dockerfile
.dockerignore
```

## Testing

```bash
npm run lint
npm run typecheck
npm run build
```
