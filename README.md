# Giggle Desk

Chat-first funny SMB receptionist demo for **Acme SMB Demo**, with a live **Captured so far** panel that shows the incremental capture schema from the product spec.

## Quick start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Mock mode works out of the box — **no API key required**.

## Mock vs real LLM

| Mode | When | Notes |
|------|------|--------|
| **Mock** (default) | No `OPENAI_API_KEY`, or `FORCE_MOCK_LLM=1` | Deterministic heuristics: jokes, name/phone/email extraction, message/appointment/route intents |
| **OpenAI** | `OPENAI_API_KEY` set | Persona + schema extraction via chat completions; falls back to mock on API errors |

Copy `.env.example` to `.env.local` if you want the real LLM path:

```bash
cp .env.example .env.local
# edit OPENAI_API_KEY=sk-...
```

Env vars:

- `OPENAI_API_KEY` — optional; enables OpenAI path
- `OPENAI_MODEL` — optional; default `gpt-4o-mini`
- `FORCE_MOCK_LLM` — set to `1` / `true` to force mock even if a key is present

## Try the happy path

In the chat UI (or via `POST /api/chat`):

1. **Joke banter:** `Tell me something funny!`  
   → `intent.primary: chat`, `flags.jokeModeOnly: true`, witty joke reply
2. **Message intent:** `Ha! Okay, can you take a message for Jordan?`  
   → `intent.primary: message`, `message.for: Jordan`
3. **Contact + body:** `My name is Sam Rivera and my number is 555-010-4422. Please tell Jordan the delivery will arrive Thursday morning and to call me back.`  
   → `caller.name` / `caller.phone` filled, message body captured
4. **Wrap up:** `That's all, thanks!`  
   → positive sentiment

Watch the right-hand **Captured so far** panel update each turn.

Full fixture transcript: [`fixtures/happy-path.json`](fixtures/happy-path.json).

Run the fixture against the mock LLM (no server needed):

```bash
npm run fixture:happy-path
```

## API

`POST /api/chat`

```json
{ "sessionId": "<optional uuid>", "message": "Hello!" }
```

Response:

```json
{
  "sessionId": "...",
  "reply": "...",
  "capture": { "...schema from SPEC..." },
  "mode": "mock"
}
```

`GET /api/chat` — health + current LLM mode.

Sessions are stored in `data/sessions.json` (local JSON file; no auth).

## Stack

- Next.js (App Router) + TypeScript
- In-memory / local JSON session store
- Minimal deps (no Twilio, no multi-tenant config)

## Capture schema

See `src/types/capture.ts` — fields and enums match the product SPEC exactly.
