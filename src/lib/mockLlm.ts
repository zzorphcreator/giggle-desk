import type { Capture, ChatMessage } from "@/types/capture";
import { BUSINESS_NAME } from "./prompt";

/**
 * Deterministic demo/mock LLM — no API key required.
 * Heuristics extract contact info + intent and craft witty replies.
 */

function extractName(text: string): string | null {
  const patterns = [
    /(?:my name is|i'm|i am|this is|call me)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
    /(?:name['']s)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      // Preserve original casing from the match
      return m[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());
    }
  }
  return null;
}

function extractPhone(text: string): string | null {
  const m = text.match(
    /(?:\+?1[-.\s]?)?(?:\(?\d{3}\)?[-.\s]?)\d{3}[-.\s]?\d{4}/
  );
  return m ? m[0].replace(/\s+/g, " ").trim() : null;
}

function extractEmail(text: string): string | null {
  const m = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

function detectJokeBanter(text: string): boolean {
  return /\b(joke|funny|laugh|pun|knock[\s-]?knock|why did|tell me something funny|make me laugh|comedy|hilarious)\b/i.test(
    text
  );
}

function detectMessageIntent(text: string): boolean {
  return /\b(leave (a )?message|take (a )?message|pass (this|it|along)|let .+ know|call me back|callback|leave (a )?note)\b/i.test(
    text
  );
}

function detectAppointment(text: string): boolean {
  return /\b(appointment|book|schedule|meeting|reserve|reservation)\b/i.test(
    text
  );
}

function detectRouting(text: string): boolean {
  return /\b(speak (to|with)|transfer|connect me|sales|support|billing|manager)\b/i.test(
    text
  );
}

function detectFeedback(text: string): boolean {
  return /\b(feedback|review|rate|rating|complaint|compliment)\b/i.test(text);
}

function extractMessageBody(text: string): string | null {
  const patterns = [
    /(?:message(?:\s+is)?)\s*[:\-]\s*(.+)/i,
    /(?:please\s+)?tell\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s+(?:that\s+)?(.+)/,
    /let\s+.+\s+know(?:\s+that)?\s+(.+)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function extractMessageFor(text: string): string | null {
  // Case-sensitive proper names; avoid matching "for me" / "the"
  const patterns = [
    /(?:take a )?message for\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /(?:please\s+)?tell\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s+(?:that\b|the\b|to\b|about\b)/,
    /pass (?:this )?to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/,
    /for\s+(the (?:manager|boss|owner|team))\b/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim();
  }
  return null;
}

function extractDesiredWhen(text: string): string | null {
  const m = text.match(
    /\b(tomorrow|today|next week|monday|tuesday|wednesday|thursday|friday|saturday|sunday|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?|\d{1,2}:\d{2}\s*(?:am|pm)?|morning|afternoon|evening)\b/i
  );
  return m ? m[0] : null;
}

const JOKES = [
  "Why did the receptionist bring a ladder to work? To take things to the next level — and also so callers stop saying 'I'll hold.'",
  "I told a voicemail it needed better boundaries. It said, 'Please leave a message after the beep' — classic avoidant attachment.",
  "Knock knock. Who's there? Interrupting cow. Interrupting c— MOO. Sorry, occupational hazard.",
  "Our hold music once filed for workers' comp. Too many loops.",
];

function pickJoke(turnIndex: number): string {
  return JOKES[turnIndex % JOKES.length];
}

function wittyAck(name: string | null): string {
  if (name) {
    return `Got it, ${name}! Writing that down with my imaginary glitter pen.`;
  }
  return "Got it! Writing that down with my imaginary glitter pen.";
}

export function mockChat(
  userText: string,
  prior: ChatMessage[],
  capture: Capture
): { reply: string; capture: Capture } {
  const next: Capture = structuredClone(capture);
  next.updatedAt = new Date().toISOString();

  const name = extractName(userText);
  const phone = extractPhone(userText);
  const email = extractEmail(userText);
  if (name) next.caller.name = name;
  if (phone) next.caller.phone = phone;
  if (email) next.caller.email = email;

  const lower = userText.toLowerCase();
  const turnIndex = prior.filter((m) => m.role === "user").length;

  if (/\b(love|great|awesome|thanks|hilarious|lol|haha)\b/i.test(userText)) {
    next.sentiment = {
      label: "positive",
      score: 0.85,
      notes: "Caller enjoying the banter",
    };
  } else if (/\b(angry|upset|frustrated|terrible|hate)\b/i.test(userText)) {
    next.sentiment = {
      label: "negative",
      score: 0.2,
      notes: "Caller seems frustrated",
    };
  } else if (detectJokeBanter(userText)) {
    next.sentiment = {
      label: "positive",
      score: 0.8,
      notes: "Joke mode engaged",
    };
  }

  let reply = "";

  const wantsJoke = detectJokeBanter(userText);
  const wantsMessage = detectMessageIntent(userText);
  const wantsAppt = detectAppointment(userText);
  const wantsRoute = detectRouting(userText);
  const wantsFeedback = detectFeedback(userText);

  // Pure joke / chat-first (no concurrent business ask)
  if (wantsJoke && !wantsMessage && !wantsAppt && !wantsRoute) {
    next.intent = {
      primary: "chat",
      summary: "Wanted a joke / funny chat",
      confidence: 0.9,
    };
    next.flags.jokeModeOnly = true;
    reply = `${pickJoke(turnIndex)} Want another one, or shall I take a message while the crowd's still warm?`;
  } else if (wantsAppt) {
    next.intent = {
      primary: "appointment",
      summary: "Wants to book an appointment",
      confidence: 0.85,
    };
    next.flags.jokeModeOnly = false;
    const when = extractDesiredWhen(userText);
    if (when) next.appointment.desiredWhen = when;
    next.appointment.status = "requested";
    next.appointment.notes = userText.trim();
    const missing: string[] = [];
    if (!next.caller.name) missing.push("name");
    if (!next.caller.phone) missing.push("phone");
    reply = when
      ? `${wittyAck(next.caller.name)} Slot vibes for "${when}" noted — like a calendar that does improv. ${missing.length ? `Toss me your ${missing.join(" and ")} and I'll lock the request.` : "I've got your contact — request is in!"}`
      : `Appointments! My favorite plot twist. When works for you, and ${missing.length ? `what's your ${missing.join(" / ")}?` : "any notes for the calendar?"}`;
  } else if (wantsRoute) {
    next.intent = {
      primary: "route",
      summary: "Wants to be connected / routed",
      confidence: 0.8,
    };
    next.flags.jokeModeOnly = false;
    next.routing.needed = true;
    if (/\bsales\b/i.test(userText)) next.routing.department = "sales";
    else if (/\bsupport\b/i.test(userText)) next.routing.department = "support";
    else if (/\bbilling\b/i.test(userText)) next.routing.department = "billing";
    else if (/\bmanager\b/i.test(userText)) next.routing.department = "manager";
    next.routing.reason = userText.trim();
    reply = `Routing request stamped! ${next.routing.department ? `I'll flag ${next.routing.department}` : "I'll flag the right desk"} — think of me as a friendly GPS that tells dad jokes. ${!next.caller.name || !next.caller.phone ? "Name and callback number?" : "You're all set on contact info."}`;
  } else if (wantsFeedback) {
    next.intent = {
      primary: "feedback",
      summary: "Sharing feedback",
      confidence: 0.8,
    };
    next.flags.jokeModeOnly = false;
    next.feedback.comment = userText.trim();
    const ratingMatch = userText.match(/\b([1-5])\s*(?:\/\s*5|stars?)?\b/);
    if (ratingMatch) next.feedback.rating = Number(ratingMatch[1]);
    reply = `Feedback received — I'll put it on the fridge of corporate memory. ${next.feedback.rating ? `${next.feedback.rating}/5 noted.` : "Want to slap a 1–5 rating on it for flair?"}`;
  } else if (
    wantsMessage ||
    (next.intent.primary === "message" &&
      (name || phone || extractMessageBody(userText) || extractMessageFor(userText)))
  ) {
    next.intent = {
      primary: "message",
      summary: "Wants to leave a message",
      confidence: 0.9,
    };
    next.flags.jokeModeOnly = false;
    const body = extractMessageBody(userText);
    const forWho = extractMessageFor(userText);
    if (forWho) next.message.for = forWho;
    if (body) next.message.body = body;
    if (!next.message.urgency) next.message.urgency = "normal";
    if (/\b(urgent|asap|emergency|right away)\b/i.test(userText)) {
      next.message.urgency = "high";
    }

    const missing: string[] = [];
    if (!next.caller.name) missing.push("your name");
    if (!next.caller.phone) missing.push("a callback number");
    if (!next.message.body) missing.push("the message itself");

    if (missing.length) {
      reply = `Message mode: activated. ${wittyAck(next.caller.name)} Still need ${missing.join(", ")} — then I'll courier it with ceremonial jazz hands.`;
    } else {
      reply = `Message locked and loaded for ${next.message.for ?? "the team"}! From ${next.caller.name} (${next.caller.phone}): "${next.message.body}". I'll make sure it doesn't get lost behind the metaphorical potted plant. Anything else before I do a victory dance?`;
    }
  } else if (name || phone || email) {
    if (next.intent.primary === "chat" || next.intent.primary === "unknown") {
      next.intent = {
        primary: next.message.body ? "message" : "chat",
        summary: next.message.body
          ? "Leaving a message"
          : "Shared contact info",
        confidence: 0.7,
      };
    }
    const bits = [
      name ? `name=${name}` : null,
      phone ? `phone=${phone}` : null,
      email ? `email=${email}` : null,
    ].filter(Boolean);
    reply = `${wittyAck(name ?? next.caller.name)} Filed ${bits.join(", ")} in the vault of Very Important Stuff. Want to leave a message, book something, or keep the comedy hour going?`;
  } else if (
    /\b(hi|hello|hey|good (morning|afternoon|evening))\b/i.test(lower) &&
    turnIndex === 0
  ) {
    next.intent = {
      primary: "chat",
      summary: "Greeting",
      confidence: 0.95,
    };
    reply = `Hey hey! Welcome to ${BUSINESS_NAME} — I'm the receptionist with the punchlines and the clipboard. Want a joke, need to leave a message, book a time, or just vibe? Your call, comedy captain.`;
  } else if (
    /\b(thanks|thank you|bye|goodbye|that's all|thats all)\b/i.test(lower)
  ) {
    next.sentiment = {
      label: "positive",
      score: 0.9,
      notes: "Wrapping up positively",
    };
    reply = `Anytime! You've been a delightful audience of one. If you need ${BUSINESS_NAME} again, I'll be here polishing my one-liners. Take care!`;
  } else {
    if (next.intent.primary === "unknown") {
      next.intent = {
        primary: "chat",
        summary: "Casual conversation",
        confidence: 0.6,
      };
    }
    reply = `Hmm, interesting plot point! I'm nodding wisely (which looks hilarious on a bot). Want me to take a message for someone, pencil in an appointment, or shall we workshop another joke first?`;
  }

  if (
    next.message.body &&
    next.caller.name &&
    next.caller.phone &&
    next.intent.primary === "message"
  ) {
    next.intent.confidence = 0.95;
    next.intent.summary = `Message for ${next.message.for ?? "the team"}`;
  }

  return { reply, capture: next };
}
