"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import styles from "./ChatApp.module.css";

interface UiMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

const WELCOME: UiMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hey hey! Welcome to Acme SMB Demo — I'm your funny receptionist. Crack a joke request, leave a message, book a time, or just vibe. Want a twist? Say \"act as Musk\" (or anyone) and I'll match the tone. What'll it be?",
};

export default function ChatApp() {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<UiMessage[]>([WELCOME]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<string>("mock");
  const [personaAs, setPersonaAs] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/chat")
      .then((r) => r.json())
      .then((d: { mode?: string }) => {
        if (d.mode) setMode(d.mode);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setError(null);
    const userMsg: UiMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      content: text,
    };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Chat failed");
      }
      setSessionId(data.sessionId);
      if (data.mode) setMode(data.mode);
      setPersonaAs(data.capture?.persona?.activeAs ?? null);
      setMessages((m) => [
        ...m,
        {
          id: `a-${Date.now()}`,
          role: "assistant",
          content: data.reply,
        },
      ]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }, [input, loading, sessionId]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  };

  const reset = () => {
    setSessionId(null);
    setMessages([WELCOME]);
    setPersonaAs(null);
    setError(null);
    setInput("");
    inputRef.current?.focus();
  };

  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Giggle Desk</h1>
          <p className={styles.subtitle}>
            Acme SMB Demo · funny receptionist ·{" "}
            <span className={styles.badge}>{mode} mode</span>
            {personaAs ? (
              <>
                {" "}
                · <span className={styles.personaBadge}>as {personaAs}</span>
              </>
            ) : null}
          </p>
        </div>
        <button type="button" className={styles.resetBtn} onClick={reset}>
          New session
        </button>
      </header>

      <div className={styles.main}>
        <section className={styles.chatPane} aria-label="Chat">
          <div className={styles.thread}>
            {messages.map((m) => (
              <div
                key={m.id}
                className={
                  m.role === "user" ? styles.bubbleUser : styles.bubbleAssistant
                }
              >
                <span className={styles.roleLabel}>
                  {m.role === "user"
                    ? "You"
                    : personaAs
                      ? `Receptionist · ${personaAs}`
                      : "Receptionist"}
                </span>
                <p>{m.content}</p>
              </div>
            ))}
            {loading && (
              <div className={styles.bubbleAssistant}>
                <span className={styles.roleLabel}>Receptionist</span>
                <p className={styles.typing}>typing a punchline…</p>
              </div>
            )}
            <div ref={bottomRef} />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.composer}>
            <input
              ref={inputRef}
              className={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder='Say hi, "act as Musk", or leave a message…'
              disabled={loading}
              aria-label="Message"
            />
            <button
              type="button"
              className={styles.sendBtn}
              onClick={() => void send()}
              disabled={loading || !input.trim()}
            >
              Send
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
