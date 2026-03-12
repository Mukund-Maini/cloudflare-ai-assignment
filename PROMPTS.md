# AI Prompts Used

This project was built with AI-assisted coding using **Cursor** (Claude). Below are the key prompts used during development.

---

## 1. Project Architecture

> Scaffold a Cloudflare Workers project using the Agents SDK with an AIChatAgent subclass that has persistent state via Durable Objects. Use Workers AI with a model that supports native function calling through the Vercel AI SDK. Set up the frontend with React 19, Vite, and Tailwind CSS 4, connecting to the agent via the useAgentChat hook over WebSocket.

---

## 2. Server-Side Tool Definitions

> Define server-side tools for the AIChatAgent using the AI SDK's `tool()` function with Zod input schemas: addTask, completeTask, removeTask, listTasks, and setUserProfile. Each tool should mutate the agent's Durable Object state via `this.setState()` so changes are broadcast to all connected clients in real-time. Use `convertToModelMessages` for the message history and `stepCountIs(5)` to cap tool use loops.

---

## 3. Client-Side RPC for Direct State Mutations

> Add `@callable()` RPC methods on the TaskAgent for toggleTask and deleteTask so the React frontend can call them directly via `agent.call()` over the existing WebSocket connection, bypassing the LLM for UI-driven actions. Wire these up to clickable checkboxes and a hover-reveal delete button in the sidebar component.

---

## 4. AI SDK v3 Migration

> The useAgentChat hook is crashing because I'm destructuring `input`, `handleInputChange`, and `handleSubmit` which don't exist in @ai-sdk/react v3. Refactor to manage input state locally with useState and use `sendMessage()` directly with the `{ role, parts }` message format. Add an ErrorBoundary wrapper so rendering errors surface visibly instead of showing a blank screen.

---

## 5. Function Calling Model Selection

> Llama 3.3 on Workers AI is emitting tool calls as raw JSON text instead of structured function call responses. Switch to `@cf/zai-org/glm-4.7-flash` which the official cloudflare/agents-starter uses and has verified native function calling support through the workers-ai-provider. Keep the tool definitions and streaming response pattern the same.

---

## 6. Wrangler Configuration

> Configure wrangler.jsonc with a Durable Object binding for TaskAgent with SQLite storage (new_sqlite_classes migration), an AI binding for Workers AI, and a static assets binding pointed at the Vite build output directory. Enable nodejs_compat and observability. Set up package.json scripts so `npm run preview` builds then runs wrangler dev, and `npm run deploy` builds then runs wrangler deploy.
