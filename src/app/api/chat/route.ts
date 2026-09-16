import { NextRequest, NextResponse } from "next/server";
import type { ChatRequest, ChatResponse } from "@/types/capture";
import { generateReply, getLlmMode } from "@/lib/llm";
import {
  appendMessage,
  getOrCreateSession,
  getSession,
} from "@/lib/sessionStore";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ChatRequest;
    const message = (body.message ?? "").trim();
    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    const session = getOrCreateSession(body.sessionId);
    const now = new Date().toISOString();

    appendMessage(session.id, {
      role: "user",
      content: message,
      timestamp: now,
    });

    const fresh = getSession(session.id)!;

    const { reply, capture, mode } = await generateReply(
      message,
      fresh.messages,
      fresh.capture
    );

    appendMessage(
      session.id,
      {
        role: "assistant",
        content: reply,
        timestamp: new Date().toISOString(),
      },
      capture
    );

    const response: ChatResponse & { mode: string } = {
      sessionId: session.id,
      reply,
      capture,
      mode,
    };

    return NextResponse.json(response);
  } catch (err) {
    console.error("chat API error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    business: "Acme SMB Demo",
    mode: getLlmMode(),
  });
}
