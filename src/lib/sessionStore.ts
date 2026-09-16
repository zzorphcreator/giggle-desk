import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import type { Capture, ChatMessage, Session } from "@/types/capture";
import { emptyCapture } from "./emptyCapture";

const DATA_DIR = path.join(process.cwd(), "data");
const SESSIONS_FILE = path.join(DATA_DIR, "sessions.json");

type Store = Record<string, Session>;

type GlobalWithStore = typeof globalThis & {
  __giggleDeskSessions?: Store;
};

/** Vercel / Lambda: cwd is read-only. Local: keep JSON file persistence. */
function useMemoryStore(): boolean {
  return Boolean(
    process.env.VERCEL ||
      process.env.AWS_LAMBDA_FUNCTION_NAME ||
      process.env.USE_MEMORY_STORE === "1"
  );
}

function memoryStore(): Store {
  const g = globalThis as GlobalWithStore;
  if (!g.__giggleDeskSessions) {
    g.__giggleDeskSessions = {};
  }
  return g.__giggleDeskSessions;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readStore(): Store {
  if (useMemoryStore()) {
    return memoryStore();
  }
  ensureDataDir();
  if (!fs.existsSync(SESSIONS_FILE)) {
    return {};
  }
  try {
    const raw = fs.readFileSync(SESSIONS_FILE, "utf-8");
    return JSON.parse(raw) as Store;
  } catch {
    return {};
  }
}

function writeStore(store: Store): void {
  if (useMemoryStore()) {
    (globalThis as GlobalWithStore).__giggleDeskSessions = store;
    return;
  }
  ensureDataDir();
  fs.writeFileSync(SESSIONS_FILE, JSON.stringify(store, null, 2), "utf-8");
}

export function createSession(): Session {
  const id = randomUUID();
  const now = new Date().toISOString();
  const session: Session = {
    id,
    createdAt: now,
    updatedAt: now,
    messages: [],
    capture: emptyCapture(id),
  };
  const store = readStore();
  store[id] = session;
  writeStore(store);
  return session;
}

export function getSession(id: string): Session | null {
  const store = readStore();
  return store[id] ?? null;
}

export function getOrCreateSession(id?: string): Session {
  if (id) {
    const existing = getSession(id);
    if (existing) return existing;
  }
  return createSession();
}

export function appendMessage(
  sessionId: string,
  message: ChatMessage,
  capture?: Capture
): Session {
  const store = readStore();
  const session = store[sessionId];
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  session.messages.push(message);
  session.updatedAt = new Date().toISOString();
  if (capture) {
    session.capture = { ...capture, sessionId, updatedAt: session.updatedAt };
  }
  store[sessionId] = session;
  writeStore(store);
  return session;
}

export function updateCapture(sessionId: string, capture: Capture): Session {
  const store = readStore();
  const session = store[sessionId];
  if (!session) {
    throw new Error(`Session not found: ${sessionId}`);
  }
  const now = new Date().toISOString();
  session.capture = { ...capture, sessionId, updatedAt: now };
  session.updatedAt = now;
  store[sessionId] = session;
  writeStore(store);
  return session;
}
