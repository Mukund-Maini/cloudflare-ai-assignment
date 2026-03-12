interface Env {
  AI: Ai;
  TASK_AGENT: DurableObjectNamespace;
  ASSETS: Fetcher;
}

interface Cloudflare {
  Env: Env;
}
