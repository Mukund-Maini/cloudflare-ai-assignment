import { AIChatAgent, type OnChatMessageOptions } from "@cloudflare/ai-chat";
import { routeAgentRequest } from "agents";
import { createWorkersAI } from "workers-ai-provider";
import {
  streamText,
  convertToModelMessages,
  tool,
  stepCountIs,
} from "ai";
import { z } from "zod";

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
};

const DEFAULT_STATE: AgentState = {
  tasks: [],
  userName: null,
  mood: null,
};

export class TaskAgent extends AIChatAgent<Env, AgentState> {
  initialState: AgentState = DEFAULT_STATE;

  async onChatMessage(
    _onFinish: unknown,
    options?: OnChatMessageOptions
  ) {
    try {
    const workersai = createWorkersAI({ binding: this.env.AI });

    const pendingTasks = this.state.tasks.filter((t) => !t.done);
    const completedTasks = this.state.tasks.filter((t) => t.done);

    const systemPrompt = `You are a helpful AI task assistant called TaskPilot running on Cloudflare Workers.

Current user context:
- User name: ${this.state.userName ?? "not set yet"}
- Mood: ${this.state.mood ?? "unknown"}
- Pending tasks (${pendingTasks.length}): ${pendingTasks.map((t) => `"${t.text}"`).join(", ") || "none"}
- Completed tasks (${completedTasks.length}): ${completedTasks.map((t) => `"${t.text}"`).join(", ") || "none"}

You help the user manage tasks, track progress, and stay productive. Be concise and friendly.
When the user tells you their name, use the setUserProfile tool. When they want to manage tasks, use the appropriate task tools.
Always confirm actions you've taken.`;

    const result = streamText({
      model: workersai("@cf/zai-org/glm-4.7-flash"),
      system: systemPrompt,
      messages: await convertToModelMessages(this.messages),
      tools: {
        addTask: tool({
          description:
            "Add a new task to the user's task list.",
          inputSchema: z.object({
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
          inputSchema: z.object({
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
          inputSchema: z.object({
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
            "List all tasks. Can filter by status.",
          inputSchema: z.object({
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
          inputSchema: z.object({
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
      },
      stopWhen: stepCountIs(5),
      abortSignal: options?.abortSignal,
    });

    return result.toUIMessageStreamResponse();
    } catch (err) {
      console.error("onChatMessage error:", err);
      throw err;
    }
  }
}

export default {
  async fetch(request: Request, env: Env) {
    return (
      (await routeAgentRequest(request, env)) ||
      env.ASSETS.fetch(request)
    );
  },
} satisfies ExportedHandler<Env>;
