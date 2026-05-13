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

const DEFAULT_MODEL = "claude-sonnet-4-6";
const MODEL_ALIASES = new Map<string, string>([
  ["claude-3-5-sonnet-latest", DEFAULT_MODEL],
  ["claude-3-5-sonnet-20240620", DEFAULT_MODEL],
  ["claude-sonnet-4-20250514", DEFAULT_MODEL],
]);
const FALLBACK_MODELS = [DEFAULT_MODEL, "claude-3-7-sonnet-20250219", "claude-3-5-haiku-20241022"];

export function normalizeAnthropicModel(model?: string | null): string {
  const trimmed = model?.trim();
  if (!trimmed) return DEFAULT_MODEL;
  return MODEL_ALIASES.get(trimmed) ?? trimmed;
}

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
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
  };
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

  const requestedModel = normalizeAnthropicModel(model);
  const candidateModels = Array.from(new Set([requestedModel, ...FALLBACK_MODELS]));
  let lastError: string | null = null;

  for (const candidateModel of candidateModels) {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: candidateModel,
        system,
        max_tokens: maxTokens,
        temperature,
        messages,
      }),
    });

    const payload = (await response.json()) as AnthropicResponse;

    if (response.ok) {
      return payload;
    }

    const message = payload.error?.message || `Anthropic request failed (${response.status})`;
    const isMissingModel = response.status === 404 && /^model:/i.test(message);
    if (!isMissingModel) {
      throw new Error(message);
    }

    console.warn(`[anthropic] Model unavailable: ${candidateModel}. Trying fallback.`);
    lastError = message;
  }

  throw new Error(lastError || "No supported Anthropic models were available for this request");
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
