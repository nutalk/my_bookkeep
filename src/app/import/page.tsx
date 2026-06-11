"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

type Tab = "import" | "export" | "clear";

export default function DataManagementPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<Tab>("import");

  // Import state
  const [importLoading, setImportLoading] = useState(false);
  const [importError, setImportError] = useState("");
  const [importResult, setImportResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      assetsCreated: number;
      liabilitiesCreated: number;
      transactionsCreated: number;
    };
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  const [exportCounts, setExportCounts] = useState<Record<
    string,
    number
  > | null>(null);
  const [exportError, setExportError] = useState("");

  // Clear state
  const [clearConfirm, setClearConfirm] = useState("");
  const [clearLoading, setClearLoading] = useState(false);
  const [clearResult, setClearResult] = useState<string | null>(null);
  const [clearError, setClearError] = useState("");

  // ===== Import logic =====

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

      if (!data.props || !Array.isArray(data.props)) {
        throw new Error(
          "无效的导入文件格式，缺少 props 字段。请使用 OpenBookkeeping 的 export_data.py 导出。",
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

  // ===== Export logic =====

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
    if (tab === "export") {
      fetchExportPreview();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  const handleExportDownload = () => {
    const a = document.createElement("a");
    a.href = "/api/export";
    a.download = `my_bookkeep_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
  };

  // ===== Clear logic =====

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

  const tabs: { key: Tab; label: string }[] = [
    { key: "import", label: "导入" },
    { key: "export", label: "导出" },
    { key: "clear", label: "清空" },
  ];

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-1">数据管理</h1>
      <p className="text-neutral-400 mb-6">导入、导出或清空数据</p>

      {/* Tab bar */}
      <div className="flex gap-1 mb-6 bg-neutral-900 border border-neutral-800 rounded-lg p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 px-4 text-sm rounded-md transition-colors ${
              tab === t.key
                ? "bg-blue-600 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Import Tab */}
      {tab === "import" && (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white mb-3">导入说明</h2>
            <ol className="text-sm text-neutral-400 space-y-2 list-decimal list-inside">
              <li>
                在 OpenBookkeeping 项目根目录执行{" "}
                <code className="bg-neutral-800 px-1.5 py-0.5 rounded text-blue-400">
                  python export_data.py
                </code>{" "}
                导出数据
              </li>
              <li>将生成的 export.json 文件拖拽到下方区域或点击选择文件</li>
              <li>系统会自动创建分类、资产、负债和交易记录</li>
              <li>
                <span className="text-yellow-400">注意：</span>
                导入前请确保当前账户没有已有数据（可使用清空功能）
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
                    仅支持从 OpenBookkeeping 导出的 .json 文件
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
                    <div className="mt-3 grid grid-cols-3 gap-3">
                      <div className="bg-neutral-800 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-blue-400">
                          {importResult.stats.assetsCreated}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">资产</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-purple-400">
                          {importResult.stats.liabilitiesCreated}
                        </p>
                        <p className="text-xs text-neutral-400 mt-1">负债</p>
                      </div>
                      <div className="bg-neutral-800 rounded-lg p-3 text-center">
                        <p className="text-2xl font-bold text-emerald-400">
                          {importResult.stats.transactionsCreated}
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

          {/* JSON format reference */}
          <div className="mt-8">
            <details className="group">
              <summary className="text-sm text-neutral-500 cursor-pointer hover:text-neutral-300 transition-colors">
                查看 JSON 格式说明
              </summary>
              <pre className="mt-3 p-4 bg-neutral-900 border border-neutral-800 rounded-xl text-xs text-neutral-400 overflow-x-auto">
                {`{
  "version": "1.0",
  "source": "OpenBookkeeping",
  "summary": { ... },
  "props": [
    {
      "name": "账户名称",
      "p_type": 0,          // 0=固定资产, 1=流动资产
                            // 2=长期负债, 3=流动负债
      "start_date": "01/06/2023",
      "term_month": 360,    // 期限(月)
      "rate": 3.8,          // 年利率 (%)
      "currency": 5000,     // 月固定现金流
      "ctype": 1,           // 0=固定, 1=等额本息, 2=先息后本
                            // 3=等额本金, 4=到期还本付息
      "activate": true,
      "details": [
        { "occur_date": "01/06/2023",
          "amount": 3000000,
          "comment": "初始金额" }
      ]
    }
  ]
}`}
              </pre>
            </details>
          </div>
        </>
      )}

      {/* Export Tab */}
      {tab === "export" && (
        <>
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
            <h2 className="text-sm font-semibold text-white mb-3">导出数据</h2>
            <p className="text-sm text-neutral-400 mb-4">
              将当前账户的所有数据导出为 JSON 文件，可用于备份。
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
        </>
      )}

      {/* Clear Tab */}
      {tab === "clear" && (
        <div className="bg-neutral-900 border border-red-900/50 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-red-400 mb-3">清空数据</h2>
          <p className="text-sm text-neutral-400 mb-4">
            此操作将永久删除当前账户的
            <span className="text-red-400 font-medium">所有数据</span>，包括：
            资产、负债、交易记录、分类、对账记录、统计快照和聊天记录。此操作不可撤销。
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
    </div>
  );
}
