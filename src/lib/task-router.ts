export type ArloRoute = "quick_chat" | "tool_task" | "needs_clarification";

export interface RouteDecision {
  route: ArloRoute;
  reason: string;
  confidence: number; // 0..1
}

const TOOL_TASK_HINTS = [
  "book",
  "buy",
  "purchase",
  "checkout",
  "order",
  "reserve",
  "schedule",
  "email",
  "send",
  "reply",
  "fill",
  "form",
  "login",
  "sign in",
  "pay",
  "invoice",
  "download",
  "upload",
  "open website",
  "go to",
  "navigate to",
  "click",
  "search the web",
  "look up",
  "find flights",
  "find hotel",
  "create event",
  "add to calendar",
];

function normalize(text: string): string {
  return text.trim().toLowerCase();
}

export function decideRoute(input: string): RouteDecision {
  const text = normalize(input);
  if (!text) {
    return { route: "needs_clarification", reason: "Empty message", confidence: 1 };
  }

  const matched = TOOL_TASK_HINTS.find((hint) => text.includes(hint));
  if (matched) {
    return {
      route: "tool_task",
      reason: `Contains tool/action hint: "${matched}"`,
      confidence: 0.75,
    };
  }

  // Default: keep it cheap.
  return { route: "quick_chat", reason: "No tool/action hints detected", confidence: 0.7 };
}

