import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  unauthorizedResponse,
  jsonResponse,
  errorResponse,
} from "../_shared/arloAuth.ts";
import { getClientIP, checkRateLimit } from "../_shared/rateLimit.ts";
import { AUTH_RATE_LIMITS, logAuthFailure } from "../_shared/authRateLimit.ts";
import { generateAnthropicMessage } from "../_shared/anthropic.ts";

interface DraftReplyRequest {
  context?: string;
  threadId?: string;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsOptions(req);
  }

  if (req.method !== "POST") {
    return errorResponse(req, "Method not allowed", 405);
  }

  const originError = validateOrigin(req);
  if (originError) return originError;

  const ip = getClientIP(req);
  const rateResult = checkRateLimit(ip, {
    ...AUTH_RATE_LIMITS.dataApi,
    keyPrefix: "ai_draft_reply",
    maxRequests: 20,
  });
  if (!rateResult.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        code: "RATE_LIMITED",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(rateResult.retryAfterSeconds || 60),
        },
      },
    );
  }

  const authResult = await verifyArloJWT(req);
  if (!authResult.authenticated) {
    logAuthFailure(req, `ai-draft-reply: ${authResult.error}`);
    return unauthorizedResponse(req, authResult.error || "Authentication required");
  }

  try {
    const body = (await req.json()) as DraftReplyRequest;
    if (!body.context || !body.context.trim()) {
      return errorResponse(req, "context is required", 400);
    }

    const prompt = `You write concise, professional email replies.
Return only the drafted reply body with no markdown, no greeting placeholders, and no explanations.
If context is incomplete, draft a polite reply that asks one clarifying question.

Email context:
${body.context}`;

    const draft = await generateAnthropicMessage({
      prompt,
      system: "You are an assistant that drafts high-quality email replies.",
      maxTokens: 500,
      temperature: 0.4,
    });

    return jsonResponse(req, {
      success: true,
      threadId: body.threadId || null,
      draft,
    });
  } catch (error) {
    console.error("[ai-draft-reply] Error:", error);
    return errorResponse(
      req,
      error instanceof Error ? error.message : "Failed to generate draft",
      500,
    );
  }
});
