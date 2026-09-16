/** Capture schema — matches SPEC.md exactly */

export type IntentPrimary =
  | "message"
  | "appointment"
  | "question"
  | "feedback"
  | "chat"
  | "route"
  | "other"
  | "unknown";

export type SentimentLabel = "positive" | "neutral" | "negative" | "mixed";

export type Urgency = "low" | "normal" | "high" | null;

export type AppointmentStatus = "none" | "requested" | "tentative" | "confirmed";

export interface Caller {
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
}

export interface Intent {
  primary: IntentPrimary;
  summary: string;
  confidence: number;
}

export interface Sentiment {
  label: SentimentLabel;
  score: number;
  notes: string | null;
}

export interface MessageCapture {
  for: string | null;
  body: string | null;
  urgency: Urgency;
}

export interface Appointment {
  desiredWhen: string | null;
  durationMinutes: number | null;
  partySize: number | null;
  notes: string | null;
  status: AppointmentStatus;
}

export interface Routing {
  needed: boolean;
  department: string | null;
  reason: string | null;
}

export interface Feedback {
  rating: number | null;
  comment: string | null;
}

export interface Flags {
  needsHuman: boolean;
  jokeModeOnly: boolean;
}

export interface Capture {
  sessionId: string;
  updatedAt: string;
  caller: Caller;
  intent: Intent;
  sentiment: Sentiment;
  message: MessageCapture;
  appointment: Appointment;
  routing: Routing;
  feedback: Feedback;
  flags: Flags;
}

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
}

export interface Session {
  id: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
  capture: Capture;
}

export interface ChatRequest {
  sessionId?: string;
  message: string;
}

export interface ChatResponse {
  sessionId: string;
  reply: string;
  capture: Capture;
}
