"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────────

export interface TutorSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

export interface TutorMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

interface Props {
  sessions: TutorSession[];
  initialMessages: TutorMessage[];
  initialSessionId: string | null;
  courseId: string;
  courseTitle: string;
  suggestedQuestions: string[];
}

// ── Markdown component map ─────────────────────────────────────────────────────

const mdComponents = {
  p: ({ children }: { children?: React.ReactNode }) => (
    <p className="mb-3 last:mb-0 leading-relaxed">{children}</p>
  ),
  strong: ({ children }: { children?: React.ReactNode }) => (
    <strong className="font-semibold text-gray-900">{children}</strong>
  ),
  em: ({ children }: { children?: React.ReactNode }) => (
    <em className="italic text-gray-600">{children}</em>
  ),
  ul: ({ children }: { children?: React.ReactNode }) => (
    <ul className="space-y-1.5 mb-3 ml-1">{children}</ul>
  ),
  ol: ({ children }: { children?: React.ReactNode }) => (
    <ol className="space-y-1.5 mb-3 ml-4 list-decimal">{children}</ol>
  ),
  li: ({ children }: { children?: React.ReactNode }) => (
    <li className="flex gap-2 leading-relaxed">
      <span className="text-[#7F77DD] mt-[3px] flex-shrink-0 text-xs">•</span>
      <span>{children}</span>
    </li>
  ),
  blockquote: ({ children }: { children?: React.ReactNode }) => (
    <blockquote className="border-l-3 border-[#7F77DD] bg-[#EEEDFE] pl-4 pr-3 py-2 rounded-r-lg mb-3 text-[#3C3489] text-sm">
      {children}
    </blockquote>
  ),
  code: ({ className, children }: { className?: string; children?: React.ReactNode }) => {
    const isBlock = Boolean(className);
    return isBlock ? (
      <pre className="bg-gray-950 text-emerald-400 rounded-lg p-4 mb-3 overflow-x-auto text-xs font-mono leading-relaxed">
        <code>{children}</code>
      </pre>
    ) : (
      <code className="bg-[#EEEDFE] text-[#3C3489] px-1.5 py-0.5 rounded text-xs font-mono">
        {children}
      </code>
    );
  },
  h1: ({ children }: { children?: React.ReactNode }) => (
    <h1 className="text-base font-bold text-gray-900 mt-4 mb-2">{children}</h1>
  ),
  h2: ({ children }: { children?: React.ReactNode }) => (
    <h2 className="text-sm font-bold text-gray-900 mt-3 mb-2">{children}</h2>
  ),
  h3: ({ children }: { children?: React.ReactNode }) => (
    <h3 className="text-sm font-semibold text-gray-800 mt-3 mb-1">{children}</h3>
  ),
};

// ── Tutor avatar ───────────────────────────────────────────────────────────────

function TutorAvatar({ size = "sm" }: { size?: "sm" | "xs" }) {
  const dim = size === "xs" ? "w-6 h-6" : "w-8 h-8";
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br from-[#7F77DD] to-[#3C3489] flex items-center justify-center flex-shrink-0`}>
      <svg width={size === "xs" ? 10 : 13} height={size === "xs" ? 10 : 13} viewBox="0 0 16 16" fill="none">
        <path d="M8 1L13 4V8C13 11 10.5 13.5 8 15C5.5 13.5 3 11 3 8V4L8 1Z" fill="white" fillOpacity="0.9" />
        <circle cx="8" cy="7" r="2" fill="white" fillOpacity="0.7" />
      </svg>
    </div>
  );
}

// ── Message bubble ─────────────────────────────────────────────────────────────

function MessageBubble({
  message,
  streaming,
}: {
  message: TutorMessage;
  streaming?: boolean;
}) {
  const isUser = message.role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end gap-2 group">
        <div
          className="max-w-[78%] rounded-2xl rounded-tr-sm px-4 py-3 text-sm text-[#3C3489] leading-relaxed"
          style={{ background: "#EEEDFE" }}
        >
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5 group">
      <TutorAvatar />
      <div
        className="max-w-[82%] bg-white rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-gray-700 leading-relaxed"
        style={{ border: "0.5px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
      >
        {streaming && !message.content ? (
          <ThinkingDots />
        ) : (
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
            {message.content}
          </ReactMarkdown>
        )}
        {streaming && message.content && (
          <span className="inline-block w-0.5 h-4 bg-[#7F77DD] animate-pulse ml-0.5 rounded-full" />
        )}
      </div>
    </div>
  );
}

// ── Thinking indicator ─────────────────────────────────────────────────────────

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="w-1.5 h-1.5 rounded-full bg-[#7F77DD]/40"
          style={{
            animation: "tutor-bounce 1.2s ease-in-out infinite",
            animationDelay: `${i * 0.2}s`,
          }}
        />
      ))}
    </div>
  );
}

// ── Session item ───────────────────────────────────────────────────────────────

function SessionItem({
  session,
  active,
  onClick,
}: {
  session: TutorSession;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-3 py-2.5 rounded-lg text-xs font-medium transition-colors truncate ${
        active
          ? "bg-[#EEEDFE] text-[#3C3489]"
          : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      }`}
    >
      {session.title}
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export function TutorClient({
  sessions: initialSessions,
  initialMessages,
  initialSessionId,
  courseId,
  courseTitle,
  suggestedQuestions,
}: Props) {
  const searchParams = useSearchParams();
  const lessonContext = searchParams.get("lesson");
  const lessonTitle = searchParams.get("lessonTitle");

  const [sessions, setSessions] = useState<TutorSession[]>(initialSessions);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(initialSessionId);
  const [messages, setMessages] = useState<(TutorMessage & { streaming?: boolean })[]>(
    initialMessages
  );
  const [input, setInput] = useState(
    lessonTitle ? `I'm working on the lesson "${lessonTitle}" — help me understand it` : ""
  );
  const [streaming, setStreaming] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingMsgIdRef = useRef<string | null>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [input]);

  const handleSwitchSession = useCallback(async (session: TutorSession) => {
    if (session.id === activeSessionId) return;
    setActiveSessionId(session.id);
    setMessages([]);
    setError(null);
    setLoadingMessages(true);

    try {
      const res = await fetch(`/api/tutor/messages?sessionId=${session.id}`);
      const data = await res.json();
      if (data.messages) {
        setMessages(data.messages);
      }
    } catch {
      setError("Failed to load messages.");
    } finally {
      setLoadingMessages(false);
    }
  }, [activeSessionId]);

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

    const userMsgId = `user-${Date.now()}`;
    const streamMsgId = `streaming-${Date.now()}`;
    streamingMsgIdRef.current = streamMsgId;

    setMessages((prev) => [
      ...prev,
      { id: userMsgId, role: "user", content: trimmed, created_at: new Date().toISOString() },
      { id: streamMsgId, role: "assistant", content: "", created_at: new Date().toISOString(), streaming: true },
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
        const errJson = res.headers.get("content-type")?.includes("json")
          ? await res.json()
          : null;
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
          try {
            event = JSON.parse(raw);
          } catch {
            continue;
          }

          switch (event.type) {
            case "session": {
              const newId = event.sessionId as string;
              setActiveSessionId(newId);
              break;
            }
            case "token": {
              accContent += event.text as string;
              const captured = accContent;
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId ? { ...m, content: captured } : m
                )
              );
              break;
            }
            case "title": {
              const newTitle = event.title as string;
              const sid = event.sessionId as string;
              setSessions((prev) => {
                const exists = prev.find((s) => s.id === sid);
                if (exists) {
                  return prev.map((s) =>
                    s.id === sid ? { ...s, title: newTitle, updated_at: new Date().toISOString() } : s
                  );
                }
                return [
                  {
                    id: sid,
                    title: newTitle,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                  },
                  ...prev,
                ];
              });
              break;
            }
            case "done": {
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === streamMsgId ? { ...m, streaming: false } : m
                )
              );
              break;
            }
            case "error": {
              throw new Error((event.error as string) ?? "Generation failed");
            }
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setMessages((prev) => prev.filter((m) => m.id !== streamMsgId));
      setError(msg === "Rate limit reached." ? `Daily limit reached (50 messages). Come back tomorrow!` : "Something went wrong — please try again.");
    } finally {
      setStreaming(false);
      setThinking(false);
      streamingMsgIdRef.current = null;
      textareaRef.current?.focus();
    }
  }, [activeSessionId, courseId, streaming]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const currentSession = sessions.find((s) => s.id === activeSessionId);
  const isEmpty = messages.length === 0;

  return (
    <>
      <style>{`
        @keyframes tutor-bounce {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <div className="flex h-screen bg-[#FAFAFA] overflow-hidden">
        {/* ── Sidebar ───────────────────────────────────────────────────────── */}
        <aside
          className={`flex-shrink-0 bg-white border-r border-gray-100 flex flex-col transition-all duration-200 ${
            sidebarOpen ? "w-[250px]" : "w-0 overflow-hidden"
          }`}
        >
          {/* Sidebar header */}
          <div className="h-14 flex items-center justify-between px-4 border-b border-gray-100 flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 rounded-md bg-[#7F77DD] flex items-center justify-center">
                <svg width="10" height="10" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1L12 4V10L7 13L2 10V4L7 1Z" fill="white" fillOpacity="0.9" />
                </svg>
              </div>
              <span className="text-xs font-bold text-gray-900 tracking-tight">CourseForge</span>
            </div>
          </div>

          {/* New chat button */}
          <div className="px-3 pt-4 pb-2 flex-shrink-0">
            <button
              onClick={handleNewChat}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white bg-[#7F77DD] hover:bg-[#3C3489] transition-colors"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              New chat
            </button>
          </div>

          {/* Sessions list */}
          <div className="flex-1 overflow-y-auto px-2 py-1 space-y-0.5">
            {sessions.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4 px-2">No chats yet</p>
            ) : (
              sessions.map((session) => (
                <SessionItem
                  key={session.id}
                  session={session}
                  active={session.id === activeSessionId}
                  onClick={() => handleSwitchSession(session)}
                />
              ))
            )}
          </div>

          {/* Nav links */}
          <div className="px-3 py-4 border-t border-gray-100 flex-shrink-0 space-y-0.5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1" />
                <rect x="14" y="3" width="7" height="7" rx="1" />
                <rect x="3" y="14" width="7" height="7" rx="1" />
                <rect x="14" y="14" width="7" height="7" rx="1" />
              </svg>
              Dashboard
            </Link>
            <Link
              href="/analytics"
              className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-gray-500 hover:bg-gray-100 hover:text-gray-800 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              Analytics
            </Link>
          </div>
        </aside>

        {/* ── Main area ─────────────────────────────────────────────────────── */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Top bar */}
          <nav className="h-14 bg-white border-b border-gray-100 flex items-center px-4 flex-shrink-0">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <button
                onClick={() => setSidebarOpen((v) => !v)}
                className="p-1.5 rounded-md hover:bg-gray-100 transition-colors flex-shrink-0"
                aria-label="Toggle sidebar"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
              <div className="flex items-center gap-2 min-w-0">
                <TutorAvatar size="xs" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 leading-tight">
                    {currentSession?.title ?? "AI Tutor"}
                  </p>
                  <p className="text-[10px] text-gray-400 truncate">{courseTitle}</p>
                </div>
              </div>
            </div>
          </nav>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto px-4 py-6">
              {loadingMessages ? (
                <div className="flex justify-center py-12">
                  <div className="w-6 h-6 rounded-full border-2 border-[#7F77DD]/30 border-t-[#7F77DD] animate-spin" />
                </div>
              ) : isEmpty ? (
                /* Empty state */
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#7F77DD] to-[#3C3489] flex items-center justify-center mb-5 shadow-lg">
                    <svg width="28" height="28" viewBox="0 0 16 16" fill="none">
                      <path d="M8 1L13 4V8C13 11 10.5 13.5 8 15C5.5 13.5 3 11 3 8V4L8 1Z" fill="white" fillOpacity="0.9" />
                      <circle cx="8" cy="7" r="2" fill="white" fillOpacity="0.7" />
                    </svg>
                  </div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1.5">Your personal tutor</h2>
                  <p className="text-sm text-gray-500 max-w-sm leading-relaxed mb-8">
                    I know your course, your progress, and where you&rsquo;re stuck. Ask me anything.
                  </p>

                  {/* Suggested questions */}
                  <div className="w-full max-w-sm space-y-2.5">
                    {suggestedQuestions.map((q, i) => (
                      <button
                        key={i}
                        onClick={() => sendMessage(q)}
                        disabled={streaming}
                        className="w-full text-left px-4 py-3.5 bg-white rounded-xl text-sm text-gray-700 hover:border-[#7F77DD] hover:text-[#3C3489] transition-all disabled:opacity-50"
                        style={{ border: "0.5px solid #E5E7EB" }}
                      >
                        <span className="text-[#7F77DD] mr-2 font-medium text-xs">↗</span>
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Messages */
                <div className="space-y-4">
                  {messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      streaming={msg.streaming}
                    />
                  ))}

                  {thinking && (
                    <div className="flex gap-2.5">
                      <TutorAvatar />
                      <div
                        className="bg-white rounded-2xl rounded-tl-sm px-4 py-3"
                        style={{ border: "0.5px solid #E5E7EB", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
                      >
                        <p className="text-xs text-gray-400 mb-1">Tutor is thinking…</p>
                        <ThinkingDots />
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="flex justify-center">
                      <p className="text-xs text-[#D85A30] bg-red-50 px-4 py-2 rounded-full">
                        {error}
                      </p>
                    </div>
                  )}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Input bar */}
          <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3">
            <div className="max-w-2xl mx-auto">
              <div
                className="flex items-end gap-2 bg-white rounded-2xl px-4 py-2.5 transition-shadow focus-within:shadow-md"
                style={{ border: "1px solid #E5E7EB" }}
              >
                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask your tutor anything…"
                  rows={1}
                  disabled={streaming}
                  className="flex-1 resize-none bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none leading-relaxed disabled:opacity-50"
                  style={{ minHeight: 24, maxHeight: 160 }}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || streaming}
                  className="flex-shrink-0 w-8 h-8 rounded-xl bg-[#7F77DD] hover:bg-[#3C3489] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center transition-colors"
                  aria-label="Send"
                >
                  {streaming ? (
                    <div className="w-3.5 h-3.5 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                  ) : (
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">
                Enter to send · Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
