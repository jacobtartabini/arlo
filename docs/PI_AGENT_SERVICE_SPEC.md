# Raspberry Pi Agent Service (Docker) — PydanticAI + Anthropic + Playwright

This document is the **separate deliverable** for the new Raspberry Pi–hosted autonomous agent service. It is designed to work with the frontend changes in this repo (see `src/lib/pi-agent.ts`), and to keep token usage low via **routing, structured outputs, caching, and compact context**.

## Goals
- Run a **tool-using autonomous agent** on your Raspberry Pi (Docker container).
- Support **explicit approvals** before risky actions.
- Keep routine chat cheap by only invoking this agent when needed.

## Runtime & networking assumptions
- The web app will call one of:
  - `VITE_ARLO_AGENT_URL` (recommended), e.g. `https://raspberrypi.your-tailnet.ts.net:8443`
  - OR a reverse-proxy path on your existing Pi API endpoint: `<apiEndpoint>/agent`
- The service must accept `Authorization: Bearer <arlo-api-token>` (same token used by your Pi WS server today).

## HTTP API contract (must match the app)

### `POST /task`
Start a task.

Request body:
```json
{
  "conversationId": "uuid-or-string",
  "message": "User request"
}
```

Response body:
```json
{
  "taskId": "uuid",
  "status": "running|needs_approval|completed|error",
  "result": { "text": "..." },
  "proposal": {
    "id": "uuid",
    "kind": "web_browse|web_click|web_extract|send_email|create_calendar_event|db_write|file_edit|other",
    "title": "Human readable",
    "target": "optional target host/account",
    "risk": "low|medium|high",
    "preview": "optional preview/diff/what will happen",
    "details": { "any": "json" }
  },
  "error": "optional"
}
```

Notes:
- If the agent completes synchronously for small tasks, return `status=completed` with `result.text`.
- If approvals are required, return `status=needs_approval` with a populated `proposal`.

### `POST /task/{taskId}/approve`
Resume a paused task after approval/denial.

Request body:
```json
{
  "decision": "approve|deny",
  "note": "optional user guidance"
}
```

Response body:
```json
{
  "taskId": "uuid",
  "status": "running|completed|error",
  "result": { "text": "..." },
  "error": "optional"
}
```

### `GET /task/{taskId}`
Optional (recommended) polling endpoint for long-running jobs.

## Security requirements (non-negotiable)
- **Auth**: require `Authorization: Bearer <arlo-api-token>` and validate it server-side.
- **SSRF protection** (Playwright + any fetch): block `localhost`, RFC1918, link-local, metadata IPs; prefer domain allowlist.
- **Domain allowlist** for browsing (configurable), and denylist for known risky hosts.
- **Timeouts**: cap runtime per task (e.g. 60–180s) and per action.
- **Budgets**: max tool steps per task; max pages; max downloads; max extracted text size.
- **Audit logs**: store (sanitized) tool calls, destinations, and approvals with task IDs.
- **No secret exfiltration**: never return cookies/tokens to the client; only return summarized results.

## Agent design (PydanticAI)

### Recommended model tiering
- Router / extraction / classification: a cheaper model (short outputs).
- Multi-step planning / synthesis: stronger model only when needed.

### Core PydanticAI components
- **Agent**: uses typed result models for:
  - `FinalAnswer(text: str, next_steps: list[str] | None)`
  - `ActionProposal(...)` (mirrors the API proposal schema)
- **Tools** (typed, validated):
  - `web_search(query: str) -> SearchResults`
  - `browser_open(url: str) -> PageHandle`
  - `browser_click(selector: str) -> None`
  - `browser_type(selector: str, text: str) -> None`
  - `browser_extract(schema: JSONSchema | PydanticModel) -> dict`
  - `memory_get(user_id, query)`, `memory_put(user_id, fact)`
  - Optional: `supabase_read(...)`, `supabase_write_allowlisted(...)`

### Approval gating
The agent must not execute side-effect actions unless:
- It emits `ActionProposal(risk=medium|high, preview=...)`
- The server pauses the run and returns `status=needs_approval`
- The run resumes only after `/approve` returns `"approve"`

## Docker setup (arm64)

### `docker-compose.yml` (example)
```yaml
services:
  arlo-agent:
    image: arlo-agent:latest
    restart: unless-stopped
    environment:
      - ARLO_API_TOKEN=...
      - ANTHROPIC_API_KEY=...
      - SUPABASE_URL=...
      - SUPABASE_SERVICE_ROLE_KEY=...
      - AGENT_ALLOWLIST=example.com,google.com
    ports:
      - "8443:8443"
```

### Container notes for Playwright
- Install Playwright + browser deps in the image.
- Prefer Chromium only to reduce size.
- Run with a non-root user where possible.

## Minimal implementation outline (Python)

Suggested stack:
- **FastAPI** (or Starlette) for HTTP endpoints
- **PydanticAI** for the agent
- **playwright** for browser automation
- Optional: **redis** for caching/search/page snapshots (or sqlite)

Pseudo-structure:
```
arlo_agent/
  app.py            # FastAPI routes: /task, /approve, /task/{id}
  agent.py          # PydanticAI agent, tools, policies
  tools/
    browser.py
    search.py
    memory.py
  storage.py        # task store + audit logs
  settings.py       # env parsing (allowlists, budgets)
Dockerfile
docker-compose.yml
```

### Caching (token saver)
- Cache `web_search(query)` results for 10–60 minutes.
- Cache page extraction outputs keyed by `(url, extraction_schema_hash)`.
- Persist a compact task summary so re-runs don’t resend full context.

## Integration checklist (with this repo)
- Set `VITE_ARLO_AGENT_URL` in the web app environment to your Pi agent base URL (recommended).
- Ensure reverse proxy/CORS allows calls from your app origin.
- Implement the API contract above so `src/lib/pi-agent.ts` works without changes.

