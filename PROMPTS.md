# AI Prompts Used

This project was built with AI-assisted coding using **Cursor** (Claude). Below are the key prompts used during development.

---

## Initial Project Setup

**Prompt:**
> See instructions below for Cloudflare AI app assignment. SUBMIT GitHub repo URL for the AI project here. (Please do not submit irrelevant repositories.)
> Optional Assignment Instructions: We plan to fast track review of candidates who complete an assignment to build a type of AI-powered application on Cloudflare. An AI-powered application should include the following components:
> LLM (recommend using Llama 3.3 on Workers AI), or an external LLM of your choice
> Workflow / coordination (recommend using Workflows, Workers or Durable Objects)
> User input via chat or voice (recommend using Pages or Realtime)
> Memory or state

**What it did:** Scaffolded the entire project — installed dependencies (`agents`, `workers-ai-provider`, `ai`, `react`, `tailwindcss`, `vite`), created the Wrangler config with Durable Object bindings and AI binding, wrote the `TaskAgent` server class with `AIChatAgent`, tools (addTask, completeTask, removeTask, listTasks, setUserProfile), and the React chat UI with `useAgentChat` hook and a task sidebar. Created the GitHub repo and deployed to Cloudflare.

---

## Debugging: Blank Screen Fix

**Prompt:**
> now its just showing a blank screen

**What it did:** Added an error boundary to surface the actual error. Discovered the crash was `Cannot read properties of undefined (reading 'trim')` — caused by using the old AI SDK v2 API (`input`, `handleInputChange`, `handleSubmit` from `useChat`) which no longer exists in v3. Fixed by managing input state with `useState` and using `sendMessage()` directly, matching the official agents-starter patterns.

---

## Debugging: Tool Calling Not Working

**Prompt:**
> i got this response, but no tasks were added

**What it did:** Identified that Llama 3.3 on Workers AI was outputting tool calls as raw JSON text instead of structured function calls. Switched to `@cf/zai-org/glm-4.7-flash` (the model used by the official Cloudflare agents-starter) which has proper native function calling support through the AI SDK.

---

## Feature: Interactive Task Sidebar

**Prompt:**
> are you supposed to be able to manually click the task to complete it?
> yes

**What it did:** Added `@callable()` RPC methods (`toggleTask`, `deleteTask`) to the server-side `TaskAgent` class. Updated the sidebar to have clickable checkboxes that toggle tasks done/undone and a delete button (✕) on hover. The client calls `agent.call("toggleTask", [taskId])` directly over WebSocket for instant state updates without going through the LLM.

---

## Repo Naming & Documentation

**Prompt:**
> IMPORTANT NOTE: To be considered, your repository name must be prefixed with cf_ai_, must include a README.md file with project documentation and clear running instructions to try out components (either locally or via deployed link). AI-assisted coding is encouraged, but you must include AI prompts used in PROMPTS.md

**What it did:** Renamed the GitHub repo to `cf_ai_taskpilot`, rewrote README.md with full architecture docs, prerequisites, local dev instructions, deploy steps, and a "Try It Out" walkthrough. Created this PROMPTS.md file.
