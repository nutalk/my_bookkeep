"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MarkdownContent } from "@/components/MarkdownContent";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AIConfig {
  baseUrl: string;
  apiKey: string;
  model: string;
}

const CONFIG_KEY = "ai_chat_config";
const MESSAGES_KEY = "ai_chat_messages";
const DEFAULT_BASE_URL = "https://api.openai.com/v1";
const DEFAULT_MODEL = "gpt-4o";

function loadConfig(): AIConfig {
  if (typeof window === "undefined") {
    return { baseUrl: DEFAULT_BASE_URL, apiKey: "", model: DEFAULT_MODEL };
  }
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { baseUrl: DEFAULT_BASE_URL, apiKey: "", model: DEFAULT_MODEL };
}

function saveConfig(config: AIConfig) {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
}

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return [];
}

function saveMessages(messages: ChatMessage[]) {
  try {
    localStorage.setItem(MESSAGES_KEY, JSON.stringify(messages));
  } catch {}
}

export default function AIChatPage() {
  const [config, setConfig] = useState<AIConfig>({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: "",
    model: DEFAULT_MODEL,
  });
  const [showConfig, setShowConfig] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  // Load persisted data from localStorage after mount (avoids hydration mismatch)
  useEffect(() => {
    const savedConfig = loadConfig();
    const savedMessages = loadMessages();
    setConfig(savedConfig);
    setMessages(savedMessages);
    if (savedConfig.apiKey) {
      setShowConfig(false);
    }
  }, []);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [streamingContent, setStreamingContent] = useState("");
  const abortRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingContent, scrollToBottom]);

  // Persist messages to localStorage whenever they change
  useEffect(() => {
    saveMessages(messages);
  }, [messages]);

  // Focus input after mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSaveConfig = (newConfig: AIConfig) => {
    setConfig(newConfig);
    saveConfig(newConfig);
    setShowConfig(false);
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;

    // Validate config
    if (!config.apiKey) {
      setShowConfig(true);
      return;
    }

    setInput("");
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(newMessages);
    setStreaming(true);
    setStreamingContent("");

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages,
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          model: config.model,
        }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const err = (await res.json().catch(() => ({ error: "请求失败" }))) as { error: string };
        setStreamingContent(`**错误**: ${err.error || `HTTP ${res.status}`}`);
        setStreaming(false);
        return;
      }

      const reader = res.body?.getReader();
      if (!reader) {
        setStreamingContent("**错误**: 无法读取响应流");
        setStreaming(false);
        return;
      }

      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") continue;

          try {
            const parsed = JSON.parse(data);
            const content = parsed.choices?.[0]?.delta?.content || "";
            accumulated += content;
            setStreamingContent(accumulated);
          } catch {}
        }
      }

      // Add assistant message to history
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: accumulated },
      ]);
    } catch (err: unknown) {
      if ((err as Error)?.name === "AbortError") {
        setStreamingContent("**已停止**");
      } else {
        setStreamingContent(
          `**错误**: ${(err as Error)?.message || "网络异常"}`,
        );
      }
    } finally {
      setStreaming(false);
      setStreamingContent("");
      abortRef.current = null;
      inputRef.current?.focus();
    }
  };

  const handleStop = () => {
    abortRef.current?.abort();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClearChat = () => {
    if (messages.length === 0) return;
    if (confirm("确定清空所有聊天记录？此操作不可恢复。")) {
      setMessages([]);
      localStorage.removeItem(MESSAGES_KEY);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-0px)]">
      {/* Top: API Config */}
      <div className="shrink-0 border-b border-neutral-800 bg-neutral-900/80 backdrop-blur-sm">
        {showConfig ? (
          <ConfigForm
            config={config}
            onSave={handleSaveConfig}
            onCancel={
              messages.length > 0 ? () => setShowConfig(false) : undefined
            }
          />
        ) : (
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-white">
                🤖 AI 财务助手
              </span>
              <span className="text-xs text-neutral-500">
                {config.baseUrl.replace(/\/+$/, "")} / {config.model}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`inline-block w-2 h-2 rounded-full ${config.apiKey ? "bg-green-500" : "bg-red-500"}`}
              />
              <span className="text-xs text-neutral-500">
                {config.apiKey ? "已配置" : "未配置"}
              </span>
              <button
                onClick={() => setShowConfig(true)}
                className="ml-2 text-xs text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-md px-2.5 py-1 transition-colors"
              >
                修改配置
              </button>
              <button
                onClick={handleClearChat}
                disabled={messages.length === 0}
                className="text-xs text-neutral-500 hover:text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-md px-2.5 py-1 transition-colors disabled:opacity-30"
              >
                清空对话
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Middle: Chat Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.length === 0 && !streaming && (
          <div className="flex flex-col items-center justify-center h-full text-center text-neutral-500">
            <span className="text-5xl mb-4">🤖</span>
            <p className="text-lg font-medium text-neutral-400 mb-2">
              AI 财务助手
            </p>
            <p className="text-sm max-w-md">
              我可以帮你分析资产配置、优化负债结构、预测现金流，或回答任何关于你财务状况的问题。
            </p>
            {!config.apiKey && (
              <button
                onClick={() => setShowConfig(true)}
                className="mt-4 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm transition-colors"
              >
                先配置 AI 接口
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
              className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-blue-600 text-white rounded-br-md"
                  : "bg-neutral-800 text-neutral-200 rounded-bl-md"
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
            <div className="max-w-[75%] bg-neutral-800 text-neutral-200 rounded-2xl rounded-bl-md px-4 py-2.5 text-sm leading-relaxed">
              <MarkdownContent content={streamingContent} />
              <span className="inline-block w-2 h-4 bg-blue-400 ml-0.5 animate-pulse" />
            </div>
          </div>
        )}

        {streaming && !streamingContent && (
          <div className="flex justify-start">
            <div className="bg-neutral-800 text-neutral-400 rounded-2xl rounded-bl-md px-4 py-3 text-sm flex items-center gap-2">
              <span
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="w-2 h-2 bg-blue-400 rounded-full animate-bounce"
                style={{ animationDelay: "300ms" }}
              />
            </div>
          </div>
        )}

        <div ref={chatEndRef} />
      </div>

      {/* Bottom: Input */}
      <div className="shrink-0 border-t border-neutral-800 bg-neutral-900/80 backdrop-blur-sm px-6 py-3">
        <div className="flex items-end gap-3 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                config.apiKey ? "输入你的财务问题..." : "请先配置 AI 接口..."
              }
              disabled={streaming}
              rows={1}
              className="w-full bg-neutral-800 border border-neutral-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 resize-none disabled:opacity-50"
              style={{ minHeight: "40px", maxHeight: "120px" }}
              onInput={(e) => {
                const el = e.currentTarget;
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
              }}
            />
          </div>
          {streaming ? (
            <button
              onClick={handleStop}
              className="shrink-0 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="6" width="12" height="12" rx="2" />
              </svg>
              停止
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="shrink-0 bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded-xl px-4 py-2.5 text-sm font-medium transition-colors flex items-center gap-1.5"
            >
              <svg
                className="w-4 h-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
              发送
            </button>
          )}
        </div>
        <p className="text-xs text-neutral-600 text-center mt-1.5">
          AI 回答仅供参考，不构成专业财务建议 ·
          数据基于你当前的资产、负债和交易记录
        </p>
      </div>
    </div>
  );
}

function ConfigForm({
  config,
  onSave,
  onCancel,
}: {
  config: AIConfig;
  onSave: (config: AIConfig) => void;
  onCancel?: () => void;
}) {
  const [form, setForm] = useState<AIConfig>(config);
  const [saving, setSaving] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    // Small delay for UX
    setTimeout(() => {
      onSave(form);
      setSaving(false);
    }, 200);
  };

  return (
    <form onSubmit={handleSubmit} className="px-6 py-4 space-y-3">
      <div className="flex items-center justify-between mb-1">
        <h3 className="text-sm font-medium text-white flex items-center gap-2">
          <svg
            className="w-4 h-4"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          AI 接口配置
        </h3>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-xs text-neutral-400 hover:text-white transition-colors"
          >
            收起
          </button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_1fr] gap-3">
        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            API 地址
          </label>
          <input
            type="url"
            value={form.baseUrl}
            onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            placeholder={DEFAULT_BASE_URL}
          />
          <p className="text-xs text-neutral-600 mt-0.5">
            兼容 OpenAI API 的地址，如 https://api.openai.com/v1
          </p>
        </div>
        <div>
          <label className="block text-xs text-neutral-500 mb-1">
            模型名称
          </label>
          <input
            type="text"
            value={form.model}
            onChange={(e) => setForm({ ...form, model: e.target.value })}
            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500"
            placeholder={DEFAULT_MODEL}
          />
          <p className="text-xs text-neutral-600 mt-0.5">
            如 gpt-4o, deepseek-chat, qwen-plus 等
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs text-neutral-500 mb-1">API Key</label>
        <div className="flex gap-2">
          <input
            type="password"
            value={form.apiKey}
            onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
            className="flex-1 bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-sm text-white placeholder-neutral-500 focus:outline-none focus:border-blue-500 font-mono"
            placeholder="sk-..."
          />
          <button
            type="submit"
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-neutral-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:text-neutral-500"
          >
            {saving ? "保存中..." : "保存"}
          </button>
        </div>
        <p className="text-xs text-neutral-600 mt-0.5">
          API Key 仅存储在浏览器本地，发送到 AI 接口服务，不会上传到本应用服务器
        </p>
      </div>
    </form>
  );
}
