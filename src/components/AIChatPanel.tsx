"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";
import { useChatPanel } from "@/lib/chat-context";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";
const CONFIG_KEY = "ai_chat_config";
const WIDTH_KEY = "ai_chat_panel_width";
const MIN_WIDTH = 200;
const MAX_WIDTH = 800;
const DEFAULT_WIDTH = 448;

function loadConfig(): AIConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { baseUrl: DEFAULT_BASE_URL, apiKey: "", model: DEFAULT_MODEL };
}

function loadWidth(): number {
  try {
    const raw = localStorage.getItem(WIDTH_KEY);
    if (raw) return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Number(raw)));
  } catch {}
  return DEFAULT_WIDTH;
}

export function AIChatPanel() {
  const { panelOpen, closePanel } = useChatPanel();
  const [config, setConfig] = useState<AIConfig>({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: "",
    model: DEFAULT_MODEL,
  });
  const [showConfig, setShowConfig] = useState(true);
  const [sessionId, setSessionId] = useState<number | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const [panelWidth, setPanelWidth] = useState(DEFAULT_WIDTH);
  const panelWidthRef = useRef(DEFAULT_WIDTH);
  const resizing = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const sessionCreated = useRef(false);

  // Load config and width from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const saved = loadConfig();
    setConfig(saved);
    if (saved.apiKey) setShowConfig(false);
    setPanelWidth(loadWidth());
  }, []);

  // Auto-create a session on first mount
  useEffect(() => {
    if (!sessionCreated.current) {
      sessionCreated.current = true;
      createSession();
    }
  }, []);

  // Load messages when session changes
  useEffect(() => {
    if (sessionId) loadMessages(sessionId);
  }, [sessionId]);

  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() =>
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" }),
    );
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  async function createSession() {
    try {
      const res = await fetch("/api/ai-chat/sessions", { method: "POST" });
      if (res.ok) {
        const session = (await res.json()) as { id: number };
        setSessionId(session.id);
      }
    } catch {}
  }

  async function loadMessages(sid: number) {
    try {
      const res = await fetch(`/api/ai-chat/sessions/${sid}`);
      if (res.ok) {
        const data = (await res.json()) as { messages: ChatMessage[] };
        setMessages(data.messages || []);
      }
    } catch {}
  }

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    if (!config.apiKey) {
      setShowConfig(true);
      return;
    }

    // Ensure we have a session
    let sid = sessionId;
    if (!sid) {
      try {
        const res = await fetch("/api/ai-chat/sessions", { method: "POST" });
        if (res.ok) {
          const s = (await res.json()) as { id: number };
          setSessionId(s.id);
          sid = s.id;
        } else return;
      } catch {
        return;
      }
    }

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: sid, content: text, ...config }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "请求失败" }))) as { error: string };
        setStreamingContent(`错误: ${err.error || res.status}`);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ") || line.includes("[DONE]")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            const delta = parsed.choices?.[0]?.delta?.content || "";
            accumulated += delta;
            setStreamingContent(accumulated);
          } catch {}
        }
      }

      if (accumulated)
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: accumulated },
        ]);
    } catch (err: unknown) {
      setStreamingContent(`错误: ${(err as Error)?.message || "网络异常"}`);
    } finally {
      setStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  // Resize handlers
  const handleResizeStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      resizing.current = true;
      document.body.style.cursor = "ew-resize";
      document.body.style.userSelect = "none";

      const startX = e.clientX;
      const startWidth = panelWidth;

      const onMove = (ev: MouseEvent) => {
        if (!resizing.current) return;
        const delta = startX - ev.clientX;
        const newWidth = Math.min(
          MAX_WIDTH,
          Math.max(MIN_WIDTH, startWidth + delta),
        );
        panelWidthRef.current = newWidth;
        setPanelWidth(newWidth);
      };

      const onUp = () => {
        resizing.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
        document.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseup", onUp);
        localStorage.setItem(WIDTH_KEY, String(panelWidthRef.current));
      };

      document.addEventListener("mousemove", onMove);
      document.addEventListener("mouseup", onUp);
    },
    [panelWidth],
  );

  if (!panelOpen) return null;

  return (
    <aside
      className="shrink-0 border-l border-neutral-800 bg-neutral-900 h-full flex flex-col relative"
      style={{ width: panelWidth }}
    >
      {/* Resize handle */}
      <div
        className="absolute top-0 -left-1 w-2 h-full cursor-ew-resize z-10 hover:bg-blue-500/20 transition-colors"
        onMouseDown={handleResizeStart}
      />
      {/* Header */}
      <div className="shrink-0 px-3 py-2.5 border-b border-neutral-800 flex items-center justify-between">
        <span className="text-sm font-medium text-white flex items-center gap-1.5">
          🤖 AI 助手
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowConfig((v) => !v)}
            className={`transition-colors p-0.5 ${
              showConfig ? "text-blue-400" : "text-neutral-500 hover:text-white"
            }`}
            title="配置"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51z" />
            </svg>
          </button>
          <button
            onClick={closePanel}
            className="text-neutral-500 hover:text-white transition-colors p-0.5"
            title="关闭"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* Config collapsible */}
      {showConfig && (
        <div className="shrink-0 px-3 py-2 border-b border-neutral-800 space-y-2">
          <input
            type="password"
            placeholder="API Key"
            value={config.apiKey}
            onChange={(e) => {
              const c = { ...config, apiKey: e.target.value };
              setConfig(c);
              localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
            }}
            className="w-full bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 font-mono"
          />
          <div className="flex gap-1">
            <input
              type="text"
              placeholder={DEFAULT_BASE_URL}
              value={config.baseUrl}
              onChange={(e) => {
                const c = { ...config, baseUrl: e.target.value };
                setConfig(c);
                localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
              }}
              className="flex-1 bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
            <input
              type="text"
              placeholder={DEFAULT_MODEL}
              value={config.model}
              onChange={(e) => {
                const c = { ...config, model: e.target.value };
                setConfig(c);
                localStorage.setItem(CONFIG_KEY, JSON.stringify(c));
              }}
              className="w-16 bg-neutral-800 border border-neutral-700 rounded px-2 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            />
          </div>
          {config.apiKey && (
            <button
              onClick={() => setShowConfig(false)}
              className="w-full text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              开始对话
            </button>
          )}
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500 text-xs px-2">
            <span className="text-2xl mb-2">🤖</span>
            <p className="mb-1">AI 财务助手</p>
            <p className="text-neutral-600">问我关于财务状况的任何问题</p>
            {!config.apiKey && (
              <button
                onClick={() => setShowConfig(true)}
                className="mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded px-3 py-1.5 text-xs transition-colors"
              >
                配置 AI 接口
              </button>
            )}
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[90%] rounded-lg px-2.5 py-1.5 text-xs leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-sm"
                  : "bg-neutral-800 text-neutral-200 rounded-bl-sm"
              }`}
            >
              {msg.role === "user" ? (
                <span className="whitespace-pre-wrap">{msg.content}</span>
              ) : (
                <MarkdownContent content={msg.content} />
              )}
            </div>
          </div>
        ))}

        {streaming && streamingContent && (
          <div className="flex justify-start">
            <div className="max-w-[90%] bg-neutral-800 text-neutral-200 rounded-lg rounded-bl-sm px-2.5 py-1.5 text-xs leading-relaxed">
              <MarkdownContent content={streamingContent} />
              <span className="inline-block w-1.5 h-3 bg-blue-400 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 text-neutral-400 rounded-lg rounded-bl-sm px-2.5 py-2 text-xs flex items-center gap-1">
              <span
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="shrink-0 px-3 py-2 border-t border-neutral-800">
        <div className="flex gap-1.5">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder={config.apiKey ? "提问..." : "请先配置 API Key"}
            disabled={streaming}
            rows={1}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-1.5 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
            style={{ minHeight: "30px", maxHeight: "80px" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${Math.min(el.scrollHeight, 80)}px`;
            }}
          />
          {streaming ? (
            <button
              onClick={() => abortRef.current?.abort()}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white rounded-lg px-2 py-1.5 text-xs transition-colors"
            >
              ■
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim() || !config.apiKey}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-lg px-2 py-1.5 text-xs transition-colors"
            >
              ↵
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
