import { AIChatAgent } from "agents/ai-chat-agent";
import { routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import {
  streamText,
  convertToModelMessages,
  tool,
  type StreamTextOnFinishCallback,
  type ToolSet,
} from "ai";
import { z } from "zod";
import type { OnChatMessageOptions } from "agents/ai-chat-agent";

type Task = {
  id: string;
  text: string;
  done: boolean;
  createdAt: string;
};

type AgentState = {
  tasks: Task[];
  userName: string | null;
  mood: string | null;
  lastSummary: string | null;
};

const DEFAULT_STATE: AgentState = {
  tasks: [],
  userName: null,
  mood: null,
  lastSummary: null,
};

export class TaskAgent extends AIChatAgent<Env, AgentState> {
  initialState: AgentState = DEFAULT_STATE;

  onStart(): void {
    this.schedule("0 9 * * 1-5", "dailySummary");
  }

  async dailySummary() {
    const tasks = this.state.tasks;
    const pending = tasks.filter((t) => !t.done);
    if (pending.length === 0) return;

    const workersai = createWorkersAI({ binding: this.env.AI });
    const { text } = await streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      prompt: `Summarize these pending tasks in a motivating way: ${pending.map((t) => t.text).join(", ")}`,
    });
    this.setState({
      ...this.state,
      lastSummary: text,
    });
  }

  async onChatMessage(
    onFinish: StreamTextOnFinishCallback<ToolSet>,
    options?: OnChatMessageOptions
  ) {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const pendingTasks = this.state.tasks.filter((t) => !t.done);
    const completedTasks = this.state.tasks.filter((t) => t.done);

    const systemPrompt = `You are a helpful AI task assistant running on Cloudflare Workers. Your name is TaskPilot.

Current user context:
- User name: ${this.state.userName ?? "not set yet"}
- Mood: ${this.state.mood ?? "unknown"}
- Pending tasks (${pendingTasks.length}): ${pendingTasks.map((t) => `"${t.text}"`).join(", ") || "none"}
- Completed tasks (${completedTasks.length}): ${completedTasks.map((t) => `"${t.text}"`).join(", ") || "none"}
${this.state.lastSummary ? `- Last daily summary: ${this.state.lastSummary}` : ""}

You help the user manage tasks, track progress, and stay productive. Be concise and friendly.
When the user tells you their name, use the setUserProfile tool. When they want to manage tasks, use the appropriate task tools.
Always confirm actions you've taken. Use markdown formatting for lists.`;

    const result = streamText({
      model: workersai("@cf/meta/llama-3.3-70b-instruct-fp8-fast"),
      system: systemPrompt,
      messages: await convertToModelMessages(this.messages),
      tools: {
        addTask: tool({
          description:
            "Add a new task to the user's task list. Use when the user asks to add, create, or remember a task.",
          parameters: z.object({
            text: z.string().describe("The task description"),
          }),
          execute: async ({ text }) => {
            const newTask: Task = {
              id: crypto.randomUUID(),
              text,
              done: false,
              createdAt: new Date().toISOString(),
            };
            this.setState({
              ...this.state,
              tasks: [...this.state.tasks, newTask],
            });
            return { success: true, task: newTask };
          },
        }),

        completeTask: tool({
          description:
            "Mark a task as done. Match by task text (partial match okay).",
          parameters: z.object({
            searchText: z
              .string()
              .describe("Text to search for in the task list"),
          }),
          execute: async ({ searchText }) => {
            const lower = searchText.toLowerCase();
            const task = this.state.tasks.find(
              (t) => !t.done && t.text.toLowerCase().includes(lower)
            );
            if (!task) return { success: false, error: "Task not found" };
            this.setState({
              ...this.state,
              tasks: this.state.tasks.map((t) =>
                t.id === task.id ? { ...t, done: true } : t
              ),
            });
            return { success: true, task: { ...task, done: true } };
          },
        }),

        removeTask: tool({
          description: "Remove a task from the list entirely.",
          parameters: z.object({
            searchText: z
              .string()
              .describe("Text to search for in the task list"),
          }),
          execute: async ({ searchText }) => {
            const lower = searchText.toLowerCase();
            const task = this.state.tasks.find((t) =>
              t.text.toLowerCase().includes(lower)
            );
            if (!task) return { success: false, error: "Task not found" };
            this.setState({
              ...this.state,
              tasks: this.state.tasks.filter((t) => t.id !== task.id),
            });
            return { success: true, removed: task.text };
          },
        }),

        listTasks: tool({
          description:
            "List all tasks. Can filter by status (all, pending, completed).",
          parameters: z.object({
            filter: z
              .enum(["all", "pending", "completed"])
              .default("all")
              .describe("Which tasks to show"),
          }),
          execute: async ({ filter }) => {
            let tasks = this.state.tasks;
            if (filter === "pending") tasks = tasks.filter((t) => !t.done);
            if (filter === "completed") tasks = tasks.filter((t) => t.done);
            return {
              tasks,
              total: this.state.tasks.length,
              pending: this.state.tasks.filter((t) => !t.done).length,
              completed: this.state.tasks.filter((t) => t.done).length,
            };
          },
        }),

        setUserProfile: tool({
          description: "Set or update the user's name and/or mood.",
          parameters: z.object({
            name: z.string().optional().describe("The user's name"),
            mood: z.string().optional().describe("The user's current mood"),
          }),
          execute: async ({ name, mood }) => {
            this.setState({
              ...this.state,
              userName: name ?? this.state.userName,
              mood: mood ?? this.state.mood,
            });
            return {
              success: true,
              name: name ?? this.state.userName,
              mood: mood ?? this.state.mood,
            };
          },
        }),

        getCurrentTime: tool({
          description:
            "Get the current UTC time. Useful when the user asks about time or for scheduling.",
          parameters: z.object({}),
          execute: async () => {
            return { time: new Date().toISOString() };
          },
        }),
      },
      maxSteps: 5,
      onFinish,
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ??
      env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
