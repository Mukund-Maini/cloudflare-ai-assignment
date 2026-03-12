# TaskPilot — AI Task Assistant on Cloudflare

An AI-powered task management assistant built entirely on Cloudflare, using the [Agents SDK](https://developers.cloudflare.com/agents/).

## Live Demo

https://ai-task-agent.mukundmaini.workers.dev

## Architecture

| Requirement | Implementation |
|---|---|
| **LLM** | GLM-4.7 Flash via Workers AI (`@cf/zai-org/glm-4.7-flash`) with native function calling |
| **Workflow / Coordination** | Durable Objects (via `AIChatAgent`) with tool orchestration, `@callable()` RPC methods |
| **User Input (Chat)** | WebSocket-based real-time chat UI built with React + `useAgentChat` |
| **Memory / State** | Persistent agent state (tasks, user profile) synced to all clients in real-time; SQLite-backed message history with automatic resumable streams |

## Features

- **Task management** — Add, complete, remove, and list tasks through natural conversation
- **Interactive sidebar** — Click checkboxes to toggle tasks, hover to delete — instant updates via direct RPC
- **Persistent memory** — Tasks and user profile survive restarts, deploys, and Durable Object hibernation
- **Real-time sync** — State changes broadcast to all connected clients instantly
- **Tool use** — 5 server-side tools the LLM calls autonomously + 2 `@callable()` RPC methods for direct UI interactions
- **Streaming responses** — Token-by-token streaming over WebSocket with automatic resume on disconnect

## Tech Stack

- **Backend**: Cloudflare Workers + Durable Objects + Workers AI
- **Frontend**: React 19 + Tailwind CSS 4 + Vite
- **SDK**: `agents` (Cloudflare Agents SDK) + `ai` (Vercel AI SDK v6) + `workers-ai-provider`

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (free tier works)
- `npm` (comes with Node.js)

### Local Development

```bash
# 1. Clone the repo
git clone https://github.com/Mukund-Maini/cf_ai_taskpilot.git
cd cf_ai_taskpilot

# 2. Install dependencies
npm install

# 3. Authenticate with Cloudflare (needed for Workers AI binding)
npx wrangler login

# 4. Build frontend + start local Worker
npm run preview
```

Open http://localhost:8787 in your browser. The chat UI will load and you can interact with the AI assistant.

> **Note:** The AI binding (`env.AI`) requires a Cloudflare account and runs in remote mode even during local dev. The Durable Object runs locally.

### Deploy to Cloudflare

```bash
# Build frontend and deploy everything
npm run deploy
```

You'll get a live URL like `https://ai-task-agent.<your-subdomain>.workers.dev`.

### Try It Out

1. Open the deployed URL (or the live demo above)
2. Type **"Add a task to review PRs"** — the AI will use the `addTask` tool and the task appears in the sidebar
3. Type **"My name is Alex"** — the AI updates your profile via the `setUserProfile` tool
4. Click the **checkbox** next to a task in the sidebar to mark it done
5. Hover over a task and click **✕** to delete it
6. Type **"What are my pending tasks?"** — the AI lists them using the `listTasks` tool

## Project Structure

```
src/
  server.ts    — TaskAgent (AIChatAgent subclass) with tools and @callable() RPC methods
  App.tsx      — React chat UI with interactive task sidebar
  main.tsx     — React entry point
  styles.css   — Tailwind CSS entry
wrangler.jsonc — Cloudflare Worker config (Durable Objects, AI binding, assets)
```

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Vite dev server (frontend only, no Worker) |
| `npm run build` | Build frontend to `dist/` |
| `npm run preview` | Build + run full stack locally with `wrangler dev` |
| `npm run deploy` | Build + deploy to Cloudflare |
