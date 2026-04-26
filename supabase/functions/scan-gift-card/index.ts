/**
 * Scan Gift Card Edge Function
 *
 * Accepts a base64-encoded image of a physical gift card and uses
 * Lovable AI Gateway (google/gemini-2.5-flash) to extract structured fields:
 *  - merchant_name
 *  - balance (numeric)
 *  - card_number_last4
 *  - expiry_date (YYYY-MM-DD if visible)
 *  - notes (any other helpful info, e.g. PIN visible / scratch off, currency)
 */

import {
  verifyArloJWT,
  handleCorsOptions,
  validateOrigin,
  jsonResponse,
  errorResponse,
  unauthorizedResponse,
} from "../_shared/arloAuth.ts";
import { getClientIP, checkRateLimit } from "../_shared/rateLimit.ts";
import { AUTH_RATE_LIMITS, logAuthFailure } from "../_shared/authRateLimit.ts";

interface ScanRequest {
  image_base64?: string; // data URL or raw base64
  mime_type?: string;     // e.g. "image/jpeg"
}

interface ScanResult {
  merchant_name: string | null;
  balance: number | null;
  card_number_last4: string | null;
  expiry_date: string | null;
  notes: string | null;
  confidence: "high" | "medium" | "low";
}

const SYSTEM_PROMPT = `You analyze photos of physical gift cards. Extract:
- merchant_name (e.g. "Amazon", "Starbucks", "Visa")
- balance as a number in the card's currency (look for printed value, "$25", "£50", etc.). If not printed return null.
- card_number_last4 (last 4 digits of long number, if visible)
- expiry_date in YYYY-MM-DD format if printed (use the 1st of the month if only month/year)
- notes: short string, mention if PIN is hidden under scratch-off, or anything unusual
- confidence: "high" if clearly a gift card, "medium" if partial info, "low" if unsure

Return ONLY valid JSON matching this schema. No markdown, no commentary.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleCorsOptions(req);
  if (req.method !== "POST") return errorResponse(req, "Method not allowed", 405);

  const originError = validateOrigin(req);
  if (originError) return originError;

  // Rate limit
  const ip = getClientIP(req);
  const rate = checkRateLimit(ip, {
    ...AUTH_RATE_LIMITS.dataApi,
    keyPrefix: "scan_gift_card",
    maxRequests: 10,
  });
  if (!rate.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests", code: "RATE_LIMITED" }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": String(rate.retryAfterSeconds || 60) } },
    );
  }

  const auth = await verifyArloJWT(req);
  if (!auth.authenticated) {
    logAuthFailure(req, `scan-gift-card: ${auth.error}`);
    return unauthorizedResponse(req, auth.error || "Authentication required");
  }

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) {
    return errorResponse(req, "AI gateway not configured", 500);
  }

  let body: ScanRequest;
  try {
    body = await req.json();
  } catch {
    return errorResponse(req, "Invalid JSON", 400);
  }

  if (!body.image_base64 || typeof body.image_base64 !== "string") {
    return errorResponse(req, "image_base64 is required", 400);
  }

  // Normalize to data URL
  let dataUrl = body.image_base64.trim();
  if (!dataUrl.startsWith("data:")) {
    const mime = body.mime_type || "image/jpeg";
    dataUrl = `data:${mime};base64,${dataUrl}`;
  }

  // Reject huge payloads (~6MB base64 limit)
  if (dataUrl.length > 8_000_000) {
    return errorResponse(req, "Image too large — please use a smaller photo", 413);
  }

  try {
    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          {
            role: "user",
            content: [
              { type: "text", text: "Extract the gift card details from this image. Return only JSON." },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (aiResponse.status === 429) {
      return errorResponse(req, "AI rate limit reached. Try again in a moment.", 429);
    }
    if (aiResponse.status === 402) {
      return errorResponse(req, "AI credits exhausted. Add credits in Lovable settings.", 402);
    }
    if (!aiResponse.ok) {
      const text = await aiResponse.text();
      console.error("[scan-gift-card] AI gateway error", aiResponse.status, text);
      return errorResponse(req, "AI processing failed", 502);
    }

    const aiJson = await aiResponse.json();
    const content: string = aiJson?.choices?.[0]?.message?.content ?? "{}";

    let parsed: ScanResult;
    try {
      parsed = JSON.parse(content);
    } catch {
      console.error("[scan-gift-card] Could not parse AI output", content);
      return errorResponse(req, "Could not read card details — please try a clearer photo", 422);
    }

    // Sanity coercion
    const result: ScanResult = {
      merchant_name: parsed.merchant_name ? String(parsed.merchant_name).slice(0, 80) : null,
      balance: typeof parsed.balance === "number" && isFinite(parsed.balance) ? parsed.balance : null,
      card_number_last4: parsed.card_number_last4
        ? String(parsed.card_number_last4).replace(/\D/g, "").slice(-4) || null
        : null,
      expiry_date: parsed.expiry_date && /^\d{4}-\d{2}-\d{2}$/.test(String(parsed.expiry_date))
        ? String(parsed.expiry_date)
        : null,
      notes: parsed.notes ? String(parsed.notes).slice(0, 300) : null,
      confidence: ["high", "medium", "low"].includes(parsed.confidence as string)
        ? (parsed.confidence as ScanResult["confidence"])
        : "low",
    };

    return jsonResponse(req, { success: true, ...result });
  } catch (error) {
    console.error("[scan-gift-card] Error:", error);
    return errorResponse(req, error instanceof Error ? error.message : "Internal error", 500);
  }
});
