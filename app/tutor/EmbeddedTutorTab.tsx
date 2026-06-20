"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// ── Types ──────────────────────────────────────────────────────────────────────

interface TutorSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  streaming?: boolean;
}

interface Props {
  courseId: string;
  suggestedQuestions: string[];
}

// ── Markdown components (compact for chat) ────────────────────────────────────

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-2.5 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-gray-600">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1 mb-2.5 ml-0.5">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1 mb-2.5 ml-4 list-decimal">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-1.5 leading-relaxed">
      <span className="text-[#7F77DD] mt-[3px] flex-shrink-0 text-xs">•</span>
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-[3px] border-[#7F77DD] bg-[#EEEDFE] pl-3 pr-2 py-1.5 rounded-r-md mb-2.5 text-[#3C3489] text-xs">
      {children}
    </blockquote>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = Boolean(className);
    return isBlock ? (
      <pre className="bg-gray-950 text-emerald-400 rounded-lg p-3 mb-2.5 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-[#EEEDFE] text-[#3C3489] px-1 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-sm font-bold text-gray-900 mt-3 mb-1.5">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-semibold text-gray-900 mt-2.5 mb-1">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-xs font-semibold text-gray-800 mt-2 mb-1">{children}</h3>
  ),
};

// ── Tutor avatar ───────────────────────────────────────────────────────────────

function TutorAvatar() {
  return (
    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#7F77DD] to-[#3C3489] flex items-center justify-center flex-shrink-0">
      <svg width="11" height="11" viewBox="0 0 16 16" fill="none">
        <path d="M8 1L13 4V8C13 11 10.5 13.5 8 15C5.5 13.5 3 11 3 8V4L8 1Z" fill="white" fillOpacity="0.9" />
        <circle cx="8" cy="7" r="2" fill="white" fillOpacity="0.7" />
      </svg>
    </div>
  );
}

// ── Thinking dots ──────────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-0.5">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]/40"
          style={{
            animation: "emb-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: ChatMessage }) {
  if (msg.role === "user") {
    return (
      <div className="flex justify-end">
        <div
          className="max-w-[78%] rounded-2xl rounded-tr-sm px-3.5 py-2.5 text-sm text-[#3C3489] leading-relaxed"
          style={{ background: "#EEEDFE" }}
        >
          {msg.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <TutorAvatar />
      <div
        className="max-w-[82%] bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5 text-sm text-gray-700"
        style={{ border: "0.5px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}
      >
        {msg.streaming && !msg.content ? (
          <ThinkingDots />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {msg.content}
          </ReactMarkdown>
        )}
        {msg.streaming && msg.content && (
          <span className="inline-block w-0.5 h-3.5 bg-[#7F77DD] animate-pulse ml-0.5 rounded-full" />
        )}
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function EmbeddedTutorTab({ courseId, suggestedQuestions }: Props) {
  const [sessions, setSessions] = useState<TutorSession[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [switchingSession, setSwitchingSession] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load sessions on first mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/tutor/sessions");
        const data = await res.json();
        const loadedSessions: TutorSession[] = data.sessions ?? [];
        setSessions(loadedSessions);

        if (loadedSessions.length > 0) {
          const first = loadedSessions[0];
          setActiveSessionId(first.id);
          const msgRes = await fetch(`/api/tutor/messages?sessionId=${first.id}`);
          const msgData = await msgRes.json();
          setMessages(
            (msgData.messages ?? []).map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
              id: m.id,
              role: m.role,
              content: m.content,
            }))
          );
        }
      } catch {
        // Silent fail — user can still start a new chat
      } finally {
        setInitialLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }, [input]);

  const handleSwitchSession = useCallback(async (session: TutorSession) => {
    if (session.id === activeSessionId || switchingSession) return;
    setSwitchingSession(true);
    setError(null);
    setActiveSessionId(session.id);
    setMessages([]);
    try {
      const res = await fetch(`/api/tutor/messages?sessionId=${session.id}`);
      const data = await res.json();
      setMessages(
        (data.messages ?? []).map((m: { id: string; role: "user" | "assistant"; content: string }) => ({
          id: m.id,
          role: m.role,
          content: m.content,
        }))
      );
    } catch {
      setError("Failed to load messages.");
    } finally {
      setSwitchingSession(false);
    }
  }, [activeSessionId, switchingSession]);

  const handleNewChat = useCallback(() => {
    setActiveSessionId(null);
    setMessages([]);
    setError(null);
    setInput("");
    textareaRef.current?.focus();
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || streaming) return;

    setInput("");
    setError(null);
    setStreaming(true);
    setThinking(true);

    const userMsgId = `u-${Date.now()}`;
    const asstMsgId = `a-${Date.now()}`;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: trimmed },
      { id: asstMsgId, role: "assistant", content: "", streaming: true },
    ]);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: activeSessionId ?? undefined,
          message: trimmed,
          courseId,
        }),
      });

      if (!res.ok || !res.body) {
        const errJson = res.headers.get("content-type")?.includes("json") ? await res.json() : null;
        throw new Error(errJson?.error ?? "Request failed");
      }

      setThinking(false);

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          let event: Record<string, unknown>;
          try { event = JSON.parse(raw); } catch { continue; }

          switch (event.type) {
            case "session": {
              const newId = event.sessionId as string;
              setActiveSessionId(newId);
              break;
            }
            case "token": {
              accContent += event.text as string;
              const snap = accContent;
              setMessages((prev) =>
                prev.map((m) => m.id === asstMsgId ? { ...m, content: snap } : m)
              );
              break;
            }
            case "title": {
              const newTitle = event.title as string;
              const sid = event.sessionId as string;
              setSessions((prev) => {
                const exists = prev.find((s) => s.id === sid);
                if (exists) {
                  return prev.map((s) => s.id === sid ? { ...s, title: newTitle } : s);
                }
                return [
                  { id: sid, title: newTitle, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                  ...prev,
                ];
              });
              break;
            }
            case "done": {
              setMessages((prev) =>
                prev.map((m) => m.id === asstMsgId ? { ...m, streaming: false } : m)
              );
              break;
            }
            case "error":
              throw new Error((event.error as string) ?? "Generation failed");
          }
        }
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unknown error";
      console.error("[EmbeddedTutorTab] send failed:", errMsg);
      setMessages((prev) => prev.filter((m) => m.id !== asstMsgId));
      setError(`Error: ${errMsg}`);
    } finally {
      setStreaming(false);
      setThinking(false);
      textareaRef.current?.focus();
    }
  }, [activeSessionId, courseId, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const isEmpty = messages.length === 0 && !initialLoading;

  return (
    <>
      <style>{`
        @keyframes emb-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div
        className="flex bg-white rounded-2xl overflow-hidden"
        style={{ height: 540, border: "0.5px solid #E5E7EB", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}
      >
        {/* ── Sidebar ──────────────────────────────────────────────────────── */}
        <div
          className={`flex flex-col flex-shrink-0 border-r border-gray-100 bg-[#FAFAFA] transition-all duration-200 overflow-hidden ${
            sidebarOpen ? "w-[190px]" : "w-0"
          }`}
        >
          {/* New chat */}
          <div className="px-3 pt-3 pb-2 flex-shrink-0">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#7F77DD] hover:bg-[#3C3489] transition-colors"
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New chat
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {initialLoading ? (
              <div className="space-y-1.5 px-1 pt-1">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-7 bg-gray-200 animate-pulse rounded-md" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-[10px] text-gray-400 text-center py-4 px-2 leading-relaxed">
                No chats yet — ask a question to start
              </p>
            ) : (
              sessions.map((s) => (
                <button
                  key={s.id}
                  onClick={() => handleSwitchSession(s)}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors truncate ${
                    s.id === activeSessionId
                      ? "bg-[#EEEDFE] text-[#3C3489]"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                >
                  {s.title}
                </button>
              ))
            )}
          </div>
        </div>

        {/* ── Main chat area ────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="h-10 flex items-center px-3 gap-2 border-b border-gray-100 flex-shrink-0">
            <button
              onClick={() => setSidebarOpen((v) => !v)}
              className="p-1 rounded hover:bg-gray-100 transition-colors flex-shrink-0"
              aria-label="Toggle sessions"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-[#7F77DD] to-[#3C3489] flex items-center justify-center flex-shrink-0">
              <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L13 4V8C13 11 10.5 13.5 8 15C5.5 13.5 3 11 3 8V4L8 1Z" fill="white" />
              </svg>
            </div>
            <p className="text-xs font-semibold text-gray-800 truncate">
              {sessions.find((s) => s.id === activeSessionId)?.title ?? "AI Tutor"}
            </p>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-4 py-4">
            {initialLoading ? (
              <div className="flex justify-center items-center h-full">
                <div className="w-5 h-5 rounded-full border-2 border-[#7F77DD]/30 border-t-[#7F77DD] animate-spin" />
              </div>
            ) : isEmpty ? (
              /* Empty state */
              <div className="flex flex-col items-center justify-center h-full text-center pb-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#7F77DD] to-[#3C3489] flex items-center justify-center mb-4 shadow-md">
                  <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                    <path d="M8 1L13 4V8C13 11 10.5 13.5 8 15C5.5 13.5 3 11 3 8V4L8 1Z" fill="white" fillOpacity="0.9" />
                    <circle cx="8" cy="7" r="2" fill="white" fillOpacity="0.7" />
                  </svg>
                </div>
                <p className="text-sm font-semibold text-gray-900 mb-1">Ask your tutor</p>
                <p className="text-xs text-gray-500 mb-5 max-w-[220px] leading-relaxed">
                  I know your course and where you&rsquo;re stuck. Try one of these:
                </p>
                <div className="w-full space-y-2 max-w-xs">
                  {suggestedQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => sendMessage(q)}
                      disabled={streaming}
                      className="w-full text-left px-3.5 py-2.5 bg-white rounded-xl text-xs text-gray-700 hover:border-[#7F77DD] hover:text-[#3C3489] transition-all disabled:opacity-50"
                      style={{ border: "0.5px solid #E5E7EB" }}
                    >
                      <span className="text-[#7F77DD] font-medium mr-1.5">↗</span>
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3.5">
                {switchingSession ? (
                  <div className="flex justify-center py-6">
                    <div className="w-5 h-5 rounded-full border-2 border-[#7F77DD]/30 border-t-[#7F77DD] animate-spin" />
                  </div>
                ) : (
                  <>
                    {messages.map((m) => (
                      <MessageBubble key={m.id} msg={m} />
                    ))}
                    {thinking && (
                      <div className="flex gap-2">
                        <TutorAvatar />
                        <div
                          className="bg-white rounded-2xl rounded-tl-sm px-3.5 py-2.5"
                          style={{ border: "0.5px solid #E5E7EB" }}
                        >
                          <p className="text-[10px] text-gray-400 mb-1">Thinking…</p>
                          <ThinkingDots />
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="flex justify-center">
                        <p className="text-xs text-[#D85A30] bg-red-50 px-3 py-1.5 rounded-full">
                          {error}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 px-3 py-2.5 border-t border-gray-100">
            <div
              className="flex items-end gap-2 rounded-xl px-3.5 py-2 focus-within:border-[#7F77DD] transition-colors"
              style={{ border: "1px solid #E5E7EB" }}
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask anything about your course…"
                rows={1}
                disabled={streaming}
                className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none leading-relaxed disabled:opacity-50"
                style={{ minHeight: 22, maxHeight: 120 }}
              />
              <button
                onClick={() => sendMessage(input)}
                disabled={!input.trim() || streaming}
                className="flex-shrink-0 w-7 h-7 rounded-lg bg-[#7F77DD] hover:bg-[#3C3489] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                aria-label="Send"
              >
                {streaming ? (
                  <div className="w-3 h-3 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-1.5">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
