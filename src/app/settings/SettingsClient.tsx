"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AIConfig,
  DEFAULT_BASE_URL,
  DEFAULT_MODEL,
  loadConfig,
  saveConfig,
} from "@/lib/ai-config";
import { applyTheme, getTheme, type Theme } from "@/lib/theme";

type Section = "data" | "ai" | "theme";
type DataTab = "import" | "export" | "clear";

const THEME_OPTIONS: {
  key: Theme;
  label: string;
  desc: string;
  bg: string;
  card: string;
  text: string;
}[] = [
  {
    key: "light",
    label: "亮色",
    desc: "明亮白底",
    bg: "#f8fafc",
    card: "#ffffff",
    text: "#111827",
  },
  {
    key: "lightgray",
    label: "浅灰色",
    desc: "浅灰底色",
    bg: "#f4f5f7",
    card: "#fbfcfd",
    text: "#181a1e",
  },
  {
    key: "gray",
    label: "灰色",
    desc: "柔和灰调",
    bg: "#17171a",
    card: "#232328",
    text: "#ececee",
  },
  {
    key: "dark",
    label: "暗色",
    desc: "深色默认",
    bg: "#0a0a0a",
    card: "#171717",
    text: "#ffffff",
  },
];

export default function SettingsClient({ section }: { section: Section }) {
  const router = useRouter();

  // ===== AI 配置状态 =====
  const [config, setConfig] = useState<AIConfig>({
    baseUrl: DEFAULT_BASE_URL,
    apiKey: "",
    model: DEFAULT_MODEL,
  });

  useEffect(() => {
    setConfig(loadConfig());
  }, []);

  // ===== 主题状态 =====
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    setTheme(getTheme());
  }, []);

  // ===== 数据管理状态 =====
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dataTab, setDataTab] = useState<DataTab>("import");
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: Record<string, number>;
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [exportCounts, setExportCounts] = useState<Record<
    string,
    number
  > | null>(null);
  const [exportError, setExportError] = useState("");
  const [clearConfirm, setClearConfirm] = useState("");
  const [clearLoading, setClearLoading] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [clearError, setClearError] = useState("");

  // ===== AI 设置逻辑 =====

  const handleAiChange = (patch: Partial<AIConfig>) => {
    const next = { ...config, ...patch };
    setConfig(next);
    saveConfig(next);
  };

  // ===== 主题逻辑 =====

  const handleThemeChange = (t: Theme) => {
    applyTheme(t);
    setTheme(t);
  };

  // ===== 导入逻辑 =====

  const handleFile = async (file: File) => {
    if (!file) return;

    if (!file.name.endsWith(".json")) {
      setImportError("请选择 JSON 格式的导出文件");
      return;
    }

    setImportLoading(true);
    setImportError("");
    setImportResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      if (!data.data || typeof data.data !== "object") {
        throw new Error(
          "无效的备份文件，缺少 data 字段。请使用本应用「账号设置 → 数据管理 → 导出」生成的 JSON 文件。",
        );
      }

      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "导入失败");
      }

      setImportResult(json);
    } catch (e) {
      setImportError(
        e instanceof Error ? e.message : "导入失败，请检查文件格式",
      );
    } finally {
      setImportLoading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  // ===== 导出逻辑 =====

  const fetchExportPreview = async () => {
    setExportLoading(true);
    setExportError("");
    setExportCounts(null);
    try {
      const res = await fetch("/api/export");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "获取数据失败");
      setExportCounts(json.counts);
    } catch (e) {
      setExportError(e instanceof Error ? e.message : "获取数据失败");
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (section === "data" && dataTab === "export") {
      fetchExportPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, dataTab]);

  const handleExportDownload = () => {
    const a = document.createElement("a");
    a.href = "/api/export";
    a.download = `my_bookkeep_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // ===== 清空逻辑 =====

  const handleClear = async () => {
    if (clearConfirm !== "确认清空所有数据") return;

    setClearLoading(true);
    setClearError("");
    setClearResult(null);

    try {
      const res = await fetch("/api/data/clear", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: clearConfirm }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error || "清空失败");
      }

      setClearResult(json.message);
      setClearConfirm("");
    } catch (e) {
      setClearError(e instanceof Error ? e.message : "清空失败");
    } finally {
      setClearLoading(false);
    }
  };

  // ===== UI =====

  const dataTabs: { key: DataTab; label: string }[] = [
    { key: "import", label: "导入" },
    { key: "export", label: "导出" },
    { key: "clear", label: "清空" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">账号设置</h1>

      {/* ===== 数据管理 ===== */}
      {section === "data" && (
        <>
          <div className="flex gap-1 mb-6 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
            {dataTabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setDataTab(t.key)}
                className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
                  dataTab === t.key
                    ? "bg-blue-600 text-white"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* 导入 */}
          {dataTab === "import" && (
            <>
              <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
                <h2 className="text-sm font-semibold text-white mb-3">
                  导入说明
                </h2>
                <ol className="text-sm text-neutral-400 space-y-2 list-decimal list-inside">
                  <li>在本页「导出」功能下载 JSON 备份文件</li>
                  <li>将备份文件拖拽到下方区域或点击选择文件</li>
                  <li>
                    系统将完整恢复：分类、资产、负债、交易记录、对账记录、统计快照和聊天记录
                  </li>
                  <li>
                    <span className="text-yellow-400">注意：</span>
                    导入前请先到「清空」功能清空当前账户数据
                  </li>
                </ol>
              </div>

              {!importResult && (
                <div
                  onDrop={handleDrop}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragOver(true);
                  }}
                  onDragLeave={() => setDragOver(false)}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors ${
                    dragOver
                      ? "border-blue-500 bg-blue-500/10"
                      : "border-neutral-700 hover:border-neutral-500 bg-neutral-900"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  {importLoading ? (
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                      <p className="text-neutral-400">正在导入数据...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <svg
                        className="w-10 h-10 text-neutral-500"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                        />
                      </svg>
                      <p className="text-neutral-400">
                        拖拽 JSON 文件到此处，或点击选择文件
                      </p>
                      <p className="text-xs text-neutral-600">
                        仅支持本应用导出的 .json 备份文件
                      </p>
                    </div>
                  )}
                </div>
              )}

              {importError && (
                <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-xl">
                  <div className="flex items-start gap-2">
                    <span className="text-red-400 mt-0.5">{"\u2715"}</span>
                    <div>
                      <p className="text-red-300 text-sm font-medium">导入失败</p>
                      <p className="text-red-400 text-sm mt-1">{importError}</p>
                    </div>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="mt-4 p-5 bg-emerald-900/30 border border-emerald-800 rounded-xl">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center flex-shrink-0">
                      <span className="text-emerald-400 text-lg">{"\u2713"}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-emerald-300 font-medium">导入成功</p>
                      <p className="text-emerald-400/80 text-sm mt-1">
                        {importResult.message}
                      </p>
                      {importResult.stats && (
                        <div className="mt-3 grid grid-cols-4 gap-3">
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-amber-400">
                              {importResult.stats.categories ?? 0}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">分类</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-blue-400">
                              {importResult.stats.assets ?? 0}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">资产</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-purple-400">
                              {importResult.stats.liabilities ?? 0}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">负债</p>
                          </div>
                          <div className="bg-neutral-800 rounded-lg p-3 text-center">
                            <p className="text-2xl font-bold text-emerald-400">
                              {importResult.stats.transactions ?? 0}
                            </p>
                            <p className="text-xs text-neutral-400 mt-1">
                              交易记录
                            </p>
                          </div>
                        </div>
                      )}
                      <div className="mt-4 flex gap-3">
                        <button
                          onClick={() => router.push("/")}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                        >
                          前往总览
                        </button>
                        <button
                          onClick={() => {
                            setImportResult(null);
                            setImportError("");
                          }}
                          className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-sm rounded-lg transition-colors"
                        >
                          继续导入
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* 导出 */}
          {dataTab === "export" && (
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
              <h2 className="text-sm font-semibold text-white mb-3">导出数据</h2>
              <p className="text-sm text-neutral-400 mb-4">
                将当前账户的所有数据导出为 JSON 文件，可用于备份，也可在「导入」功能完整恢复。
              </p>

              {exportLoading && (
                <div className="flex items-center gap-3 py-4">
                  <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                  <p className="text-neutral-400 text-sm">正在获取数据统计...</p>
                </div>
              )}

              {exportCounts && (
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-blue-400">
                      {exportCounts.assets}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">资产</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-purple-400">
                      {exportCounts.liabilities}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">负债</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-emerald-400">
                      {exportCounts.transactions}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">交易记录</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-xl font-bold text-amber-400">
                      {exportCounts.categories}
                    </p>
                    <p className="text-xs text-neutral-500 mt-1">分类</p>
                  </div>
                </div>
              )}

              {exportError && (
                <div className="p-4 bg-red-900/30 border border-red-800 rounded-xl mb-4">
                  <p className="text-red-400 text-sm">{exportError}</p>
                </div>
              )}

              <button
                onClick={handleExportDownload}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded-lg transition-colors"
              >
                下载 JSON 文件
              </button>
            </div>
          )}

          {/* 清空 */}
          {dataTab === "clear" && (
            <div className="bg-neutral-900 border border-red-900/50 rounded-xl p-5">
              <h2 className="text-sm font-semibold text-red-400 mb-3">清空数据</h2>
              <p className="text-sm text-neutral-400 mb-4">
                此操作将永久删除当前账户的
                <span className="text-red-400 font-medium">所有数据</span>，
                包括：资产、负债、交易记录、分类、对账记录、统计快照和聊天记录。此操作不可撤销。
              </p>

              {clearResult ? (
                <div className="p-4 bg-emerald-900/30 border border-emerald-800 rounded-xl">
                  <div className="flex items-start gap-2">
                    <span className="text-emerald-400 mt-0.5">{"\u2713"}</span>
                    <div>
                      <p className="text-emerald-300 text-sm font-medium">
                        清空成功
                      </p>
                      <p className="text-emerald-400/80 text-sm mt-1">
                        {clearResult}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => router.push("/login")}
                    className="mt-3 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
                  >
                    返回登录页
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-neutral-400 mb-1">
                      请输入「确认清空所有数据」以确认
                    </label>
                    <input
                      type="text"
                      value={clearConfirm}
                      onChange={(e) => setClearConfirm(e.target.value)}
                      placeholder="确认清空所有数据"
                      className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-red-500"
                    />
                  </div>

                  {clearError && (
                    <div className="p-3 bg-red-900/30 border border-red-800 rounded-lg">
                      <p className="text-red-400 text-sm">{clearError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleClear}
                    disabled={clearConfirm !== "确认清空所有数据" || clearLoading}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-neutral-700 disabled:text-neutral-500 text-white text-sm rounded-lg transition-colors"
                  >
                    {clearLoading ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        清空中...
                      </span>
                    ) : (
                      "确认清空所有数据"
                    )}
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* ===== AI 设置 ===== */}
      {section === "ai" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 space-y-4">
          <div>
            <h2 className="text-sm font-semibold text-white">AI 接口设置</h2>
            <p className="text-xs text-neutral-400 mt-1">
              配置后 AI 助手将使用该接口进行对话，保存后立即生效。
            </p>
          </div>

          <div>
            <label className="block text-sm text-neutral-400 mb-1">API Key</label>
            <input
              type="password"
              value={config.apiKey}
              onChange={(e) => handleAiChange({ apiKey: e.target.value })}
              placeholder="sk-..."
              className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm font-mono focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-neutral-400 mb-1">
                Base URL
              </label>
              <input
                type="text"
                value={config.baseUrl}
                onChange={(e) => handleAiChange({ baseUrl: e.target.value })}
                placeholder={DEFAULT_BASE_URL}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-neutral-400 mb-1">模型</label>
              <input
                type="text"
                value={config.model}
                onChange={(e) => handleAiChange({ model: e.target.value })}
                placeholder={DEFAULT_MODEL}
                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <p className="text-xs text-neutral-500">
            修改后自动保存。AI 助手面板每次打开时会读取最新配置。
          </p>
        </div>
      )}

      {/* ===== 颜色主题 ===== */}
      {section === "theme" && (
        <div className="space-y-3">
          <p className="text-sm text-neutral-400">
            选择页面主题，选择后立即生效并记住你的偏好。
          </p>
          {THEME_OPTIONS.map((opt) => {
            const active = theme === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => handleThemeChange(opt.key)}
                className={`w-full flex items-center gap-3 p-4 rounded-xl border text-left transition-colors ${
                  active
                    ? "border-blue-500 bg-blue-500/10"
                    : "border-neutral-800 bg-neutral-900 hover:border-neutral-600"
                }`}
              >
                <div
                  className="w-11 h-11 rounded-lg border border-neutral-700 overflow-hidden shrink-0"
                  style={{ background: opt.bg }}
                >
                  <div className="h-4" style={{ background: opt.card }} />
                  <div
                    className="h-2 w-6 mx-auto mt-1 rounded-sm"
                    style={{ background: opt.text }}
                  />
                  <div
                    className="h-2 w-4 mx-auto mt-1 rounded-sm opacity-60"
                    style={{ background: opt.text }}
                  />
                </div>
                <div>
                  <p className="text-sm text-white font-medium">{opt.label}</p>
                  <p className="text-xs text-neutral-400 mt-0.5">{opt.desc}</p>
                </div>
                {active && (
                  <span className="ml-auto text-blue-400 text-lg">
                    {"\u2713"}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
