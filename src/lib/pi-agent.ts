export interface AgentStartTaskRequest {
  conversationId: string;
  message: string;
}

export interface AgentStartTaskResponse {
  taskId: string;
  status: "running" | "needs_approval" | "completed" | "error";
  result?: { text?: string };
  proposal?: AgentActionProposal;
  error?: string;
}

export interface AgentActionProposal {
  id: string;
  kind:
    | "web_browse"
    | "web_click"
    | "web_extract"
    | "send_email"
    | "create_calendar_event"
    | "db_write"
    | "file_edit"
    | "other";
  title: string;
  target?: string;
  risk: "low" | "medium" | "high";
  preview?: string;
  details?: Record<string, unknown>;
}

export interface AgentApproveRequest {
  decision: "approve" | "deny";
  note?: string;
}

export interface AgentApproveResponse {
  taskId: string;
  status: "running" | "completed" | "error";
  result?: { text?: string };
  error?: string;
}

function getAgentBaseUrl(fallbackApiEndpoint?: string): string {
  const env = (import.meta as unknown as { env?: Record<string, string> })?.env;
  const fromEnv = env?.VITE_ARLO_AGENT_URL;
  if (typeof fromEnv === "string" && fromEnv.trim()) return fromEnv.replace(/\/$/, "");

  // Fallback: assume a reverse-proxy path on the Pi API endpoint.
  const base = (fallbackApiEndpoint ?? "").replace(/\/$/, "");
  return base ? `${base}/agent` : "/agent";
}

export async function startAgentTask(args: {
  apiEndpoint?: string;
  apiToken: string;
  body: AgentStartTaskRequest;
}): Promise<AgentStartTaskResponse> {
  const url = `${getAgentBaseUrl(args.apiEndpoint)}/task`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiToken}`,
    },
    body: JSON.stringify(args.body),
  });
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "Request failed")
        : `Agent request failed (${res.status})`;
    throw new Error(message);
  }
  return payload as AgentStartTaskResponse;
}

export async function approveAgentTask(args: {
  apiEndpoint?: string;
  apiToken: string;
  taskId: string;
  body: AgentApproveRequest;
}): Promise<AgentApproveResponse> {
  const url = `${getAgentBaseUrl(args.apiEndpoint)}/task/${encodeURIComponent(args.taskId)}/approve`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${args.apiToken}`,
    },
    body: JSON.stringify(args.body),
  });
  const payload = (await res.json().catch(() => null)) as unknown;
  if (!res.ok) {
    const message =
      payload && typeof payload === "object" && "error" in payload
        ? String((payload as { error?: unknown }).error ?? "Request failed")
        : `Agent approval failed (${res.status})`;
    throw new Error(message);
  }
  return payload as AgentApproveResponse;
}

