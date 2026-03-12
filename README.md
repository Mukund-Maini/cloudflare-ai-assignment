# TaskPilot — AI Task Assistant on Cloudflare

An AI-powered task management assistant built entirely on Cloudflare, using the [Agents SDK](https://developers.cloudflare.com/agents/).

## Architecture

| Requirement | Implementation |
|---|---|
| **LLM** | GLM-4.7 Flash via Workers AI (`@cf/zai-org/glm-4.7-flash`) with native function calling |
| **Workflow / Coordination** | Durable Objects (via `AIChatAgent`) with tool orchestration and cron scheduling |
| **User Input (Chat)** | WebSocket-based real-time chat UI built with React + `useAgentChat` |
| **Memory / State** | Persistent agent state (tasks, user profile, mood) synced to all clients in real-time; SQLite-backed message history with automatic resumable streams |

## Features

- **Task management** — Add, complete, remove, and list tasks through natural conversation
- **Persistent memory** — Tasks and user profile survive restarts, deploys, and hibernation
- **Real-time sync** — State changes broadcast to all connected clients instantly
- **Scheduled summaries** — Agent wakes itself on a cron schedule to generate task summaries
- **Tool use** — 6 server-side tools the LLM calls autonomously (add/complete/remove/list tasks, set profile, get time)
- **Streaming responses** — Token-by-token streaming over WebSocket with automatic resume on disconnect

## Tech Stack

- **Backend**: Cloudflare Workers + Durable Objects + Workers AI
- **Frontend**: React 19 + Tailwind CSS 4 + Vite
- **SDK**: `agents` (Cloudflare Agents SDK) + `ai` (Vercel AI SDK) + `workers-ai-provider`

## Live Demo

https://ai-task-agent.mukundmaini.workers.dev

## Getting Started

```bash
npm install
npm run dev        # Start Vite dev server (frontend only)
npm run preview    # Build + run full stack locally with wrangler
npm run deploy     # Build + deploy to Cloudflare
```

## Project Structure

```
src/
  server.ts    — TaskAgent (AIChatAgent subclass) + Worker fetch handler
  App.tsx      — React chat UI with task sidebar
  main.tsx     — React entry point
  styles.css   — Tailwind CSS entry
```
