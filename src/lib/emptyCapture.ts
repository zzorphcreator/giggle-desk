import type { Capture } from "@/types/capture";

export function emptyCapture(sessionId: string): Capture {
  return {
    sessionId,
    updatedAt: new Date().toISOString(),
    caller: {
      name: null,
      phone: null,
      email: null,
      company: null,
    },
    intent: {
      primary: "chat",
      summary: "Just chatting",
      confidence: 0.5,
    },
    sentiment: {
      label: "neutral",
      score: 0.5,
      notes: null,
    },
    message: {
      for: null,
      body: null,
      urgency: null,
    },
    appointment: {
      desiredWhen: null,
      durationMinutes: null,
      partySize: null,
      notes: null,
      status: "none",
    },
    routing: {
      needed: false,
      department: null,
      reason: null,
    },
    feedback: {
      rating: null,
      comment: null,
    },
    flags: {
      needsHuman: false,
      jokeModeOnly: false,
    },
    persona: {
      activeAs: null,
    },
  };
}
