import type { Capture, ChatMessage } from "@/types/capture";
import { SYSTEM_PROMPT } from "./prompt";
import { mockChat } from "./mockLlm";

export type LlmMode = "mock" | "openai";

export function getLlmMode(): LlmMode {
  if (process.env.FORCE_MOCK_LLM === "1" || process.env.FORCE_MOCK_LLM === "true") {
    return "mock";
  }
  if (process.env.OPENAI_API_KEY) {
    return "openai";
  }
  return "mock";
}

function buildUserPayload(
  userText: string,
  capture: Capture
): string {
  const activeAs = capture.persona?.activeAs ?? null;
  return JSON.stringify({
    userMessage: userText,
    currentCapture: capture,
    activePersona: activeAs,
    instruction: activeAs
      ? `Reply with JSON { reply, capture }. Merge new extractions into currentCapture. Stay in the voice/style of "${activeAs}" unless the user clears the persona. Update persona.activeAs accordingly.`
      : "Reply with JSON { reply, capture }. Merge new extractions into currentCapture. If they request act-as, set persona.activeAs.",
  });
}

async function openaiChat(
  userText: string,
  history: ChatMessage[],
  capture: Capture
): Promise<{ reply: string; capture: Capture }> {
  const apiKey = process.env.OPENAI_API_KEY!;
  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const messages: { role: string; content: string }[] = [
    { role: "system", content: SYSTEM_PROMPT },
    ...history
      .filter((m) => m.role === "user" || m.role === "assistant")
      .slice(-12)
      .map((m) => ({ role: m.role, content: m.content })),
    { role: "user", content: buildUserPayload(userText, capture) },
  ];

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.7,
      response_format: { type: "json_object" },
      messages,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI error ${res.status}: ${errText}`);
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned empty content");
  }

  const parsed = JSON.parse(content) as {
    reply?: string;
    capture?: Capture;
  };

  if (!parsed.reply || !parsed.capture) {
    throw new Error("OpenAI JSON missing reply or capture");
  }

  const nextCapture: Capture = {
    ...parsed.capture,
    sessionId: capture.sessionId,
    updatedAt: new Date().toISOString(),
    persona: parsed.capture.persona ?? capture.persona ?? { activeAs: null },
  };

  return {
    reply: parsed.reply,
    capture: nextCapture,
  };
}

export async function generateReply(
  userText: string,
  history: ChatMessage[],
  capture: Capture
): Promise<{ reply: string; capture: Capture; mode: LlmMode }> {
  const mode = getLlmMode();
  if (mode === "openai") {
    try {
      const result = await openaiChat(userText, history, capture);
      return { ...result, mode };
    } catch (err) {
      // Fall back to mock so the demo never hard-fails
      console.error("OpenAI path failed, falling back to mock:", err);
      const result = mockChat(userText, history, capture);
      return { ...result, mode: "mock" };
    }
  }
  const result = mockChat(userText, history, capture);
  return { ...result, mode };
}
