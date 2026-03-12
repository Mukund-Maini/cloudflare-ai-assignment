import { useAgent } from "agents/react";
import { useAgentChat } from "@cloudflare/ai-chat/react";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  Component,
  type ReactNode,
} from "react";
import type { UIMessage } from "ai";

class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div className="h-screen flex items-center justify-center bg-zinc-950 text-white p-8">
          <div className="max-w-lg text-center">
            <h1 className="text-xl font-semibold text-red-400 mb-4">
              Something went wrong
            </h1>
            <pre className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-4 overflow-auto text-left whitespace-pre-wrap">
              {this.state.error.message}
              {"\n\n"}
              {this.state.error.stack}
            </pre>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

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

function TaskSidebar({
  state,
  onToggle,
  onDelete,
}: {
  state: AgentState | null;
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}) {
  if (!state) return null;

  const pending = state.tasks.filter((t) => !t.done);
  const completed = state.tasks.filter((t) => t.done);

  return (
    <aside className="w-72 border-r border-zinc-800 bg-zinc-950 p-4 flex flex-col gap-4 overflow-y-auto hidden md:flex">
      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Profile
        </h2>
        <div className="text-sm text-zinc-300 space-y-1">
          <p>
            <span className="text-zinc-500">Name:</span>{" "}
            {state.userName ?? "Not set"}
          </p>
          <p>
            <span className="text-zinc-500">Mood:</span>{" "}
            {state.mood ?? "Unknown"}
          </p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Pending ({pending.length})
        </h2>
        {pending.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No pending tasks</p>
        ) : (
          <ul className="space-y-1">
            {pending.map((task) => (
              <li
                key={task.id}
                className="group text-sm text-zinc-300 flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-900 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onToggle(task.id)}
                  className="mt-0.5 h-4 w-4 rounded border border-zinc-600 flex-shrink-0 hover:border-emerald-500 hover:bg-emerald-500/10 transition-colors cursor-pointer"
                />
                <span className="flex-1 min-w-0 truncate">{task.text}</span>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="mt-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-2">
          Completed ({completed.length})
        </h2>
        {completed.length === 0 ? (
          <p className="text-xs text-zinc-600 italic">No completed tasks</p>
        ) : (
          <ul className="space-y-1">
            {completed.map((task) => (
              <li
                key={task.id}
                className="group text-sm text-zinc-500 flex items-start gap-2 rounded-lg px-1.5 py-1 hover:bg-zinc-900 transition-colors"
              >
                <button
                  type="button"
                  onClick={() => onToggle(task.id)}
                  className="mt-0.5 h-4 w-4 rounded bg-emerald-600/30 border border-emerald-600 flex-shrink-0 flex items-center justify-center text-[10px] text-emerald-400 hover:bg-emerald-600/50 transition-colors cursor-pointer"
                >
                  ✓
                </button>
                <span className="flex-1 min-w-0 truncate line-through">
                  {task.text}
                </span>
                <button
                  type="button"
                  onClick={() => onDelete(task.id)}
                  className="mt-0.5 text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs cursor-pointer"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}

function MessageBubble({ message }: { message: UIMessage }) {
  const isUser = message.role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
          isUser
            ? "bg-blue-600 text-white"
            : "bg-zinc-800 text-zinc-200 border border-zinc-700"
        }`}
      >
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            return <span key={i}>{part.text}</span>;
          }
          if (part.type === "tool-invocation") {
            const { toolInvocation } = part;
            return (
              <div
                key={i}
                className="my-1 px-2 py-1 rounded bg-zinc-900/50 text-xs text-zinc-400 border border-zinc-700/50"
              >
                <span className="font-mono">{toolInvocation.toolName}</span>
                {toolInvocation.state === "result" && (
                  <span className="ml-2 text-emerald-400">✓</span>
                )}
              </div>
            );
          }
          return null;
        })}
      </div>
    </div>
  );
}

function Chat() {
  const [agentState, setAgentState] = useState<AgentState | null>(null);
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const agent = useAgent<AgentState>({
    agent: "task-agent",
    onStateUpdate: useCallback(
      (state: AgentState) => setAgentState(state),
      []
    ),
  });

  const { messages, sendMessage, clearHistory, status } = useAgentChat({
    agent,
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const isStreaming = status === "streaming" || status === "submitted";

  const send = useCallback(() => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    sendMessage({ role: "user", parts: [{ type: "text", text }] });
  }, [input, isStreaming, sendMessage]);

  const handleToggleTask = useCallback(
    (taskId: string) => {
      agent.call("toggleTask", [taskId]);
    },
    [agent]
  );

  const handleDeleteTask = useCallback(
    (taskId: string) => {
      agent.call("deleteTask", [taskId]);
    },
    [agent]
  );

  return (
    <div className="h-screen flex bg-zinc-950 text-white">
      <TaskSidebar
        state={agentState}
        onToggle={handleToggleTask}
        onDelete={handleDeleteTask}
      />

      <main className="flex-1 flex flex-col min-w-0">
        <header className="border-b border-zinc-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold">
              T
            </div>
            <div>
              <h1 className="text-base font-semibold">TaskPilot</h1>
              <p className="text-xs text-zinc-500">
                AI task assistant &middot; Powered by Workers AI on Cloudflare
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={clearHistory}
            className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors px-2 py-1 rounded hover:bg-zinc-800 cursor-pointer"
          >
            Clear chat
          </button>
        </header>

        <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-2xl font-bold mb-4">
                T
              </div>
              <h2 className="text-xl font-semibold mb-2">
                Welcome to TaskPilot
              </h2>
              <p className="text-zinc-500 text-sm max-w-md mb-6">
                I help you manage tasks, stay organized, and keep track of your
                progress. Try saying:
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "Add a task to review PRs",
                  "What are my pending tasks?",
                  "My name is Alex",
                  "Mark review PRs as done",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    className="px-3 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs text-zinc-300 hover:bg-zinc-700 transition-colors cursor-pointer"
                    onClick={() => {
                      sendMessage({
                        role: "user",
                        parts: [{ type: "text", text: suggestion }],
                      });
                    }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="space-y-3 max-w-3xl mx-auto">
              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              {isStreaming && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 border border-zinc-700 rounded-2xl px-4 py-2.5 text-sm">
                    <span className="inline-flex gap-1">
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:0ms]" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:150ms]" />
                      <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:300ms]" />
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="border-t border-zinc-800 px-6 py-4 flex-shrink-0">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
            className="flex gap-2 max-w-3xl mx-auto"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Ask me to add a task, check your list, or anything else..."
              className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50"
              disabled={isStreaming}
            />
            <button
              type="submit"
              disabled={isStreaming || !input.trim()}
              className="bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl px-5 py-2.5 text-sm font-medium transition-colors"
            >
              Send
            </button>
          </form>
          <p className="text-center text-[10px] text-zinc-600 mt-2">
            Built on Cloudflare Workers AI &middot; Durable Objects &middot;
            Agents SDK
          </p>
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Chat />
    </ErrorBoundary>
  );
}
