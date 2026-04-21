export interface AnthropicMessage {
  role: "user" | "assistant";
  content: string;
}

export interface AnthropicRequest {
  model?: string;
  system?: string;
  messages: AnthropicMessage[];
  temperature?: number;
  maxTokens?: number;
}

// Use a pinned, known-valid Sonnet model. The previous alias/default
// returned 404 from Anthropic in this project.
const DEFAULT_MODEL = "claude-3-5-sonnet-20240620";

interface AnthropicContentBlock {
  type: string;
  text?: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  model: string;
  content: AnthropicContentBlock[];
  stop_reason?: string;
  error?: { message?: string };
}

export async function callAnthropicMessages({
  model = DEFAULT_MODEL,
  system,
  messages,
  temperature = 0.4,
  maxTokens = 800,
}: AnthropicRequest): Promise<AnthropicResponse> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  if (!messages.length) {
    throw new Error("At least one message is required");
  }

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      system,
      max_tokens: maxTokens,
      temperature,
      messages,
    }),
  });

  const payload = (await response.json()) as AnthropicResponse;

  if (!response.ok) {
    throw new Error(payload.error?.message || `Anthropic request failed (${response.status})`);
  }

  return payload;
}

export function extractTextFromAnthropic(payload: AnthropicResponse): string {
  return (payload.content || [])
    .filter((block) => block.type === "text" && typeof block.text === "string")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

export function buildAnthropicErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  return fallback;
}

export async function generateAnthropicMessage({
  prompt,
  system,
  model,
  temperature,
  maxTokens,
}: {
  prompt: string;
  system?: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}): Promise<string> {
  const payload = await callAnthropicMessages({
    model,
    system,
    temperature,
    maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = extractTextFromAnthropic(payload);
  if (!text) throw new Error("Anthropic returned an empty response");
  return text;
}
