"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

export default function ImportPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    stats?: {
      assetsCreated: number;
      liabilitiesCreated: number;
      transactionsCreated: number;
    };
  } | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = async (file: File) => {
    if (!file) return;

    // 验证文件类型
    if (!file.name.endsWith(".json")) {
      setError("请选择 JSON 格式的导出文件");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const text = await file.text();
      const data = JSON.parse(text);

      // 基本验证
      if (!data.props || !Array.isArray(data.props)) {
        throw new Error(
          "无效的导入文件格式，缺少 props 字段。请使用 OpenBookkeeping 的 export_data.py 导出。"
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

      setResult(json);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "导入失败，请检查文件格式"
      );
    } finally {
      setLoading(false);
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

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-2">数据导入</h1>
      <p className="text-neutral-400 mb-6">
        导入从 OpenBookkeeping 导出的 JSON 数据文件。
      </p>

      {/* 说明卡片 */}
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-white mb-3">
          导入说明
        </h2>
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
            导入前请确保当前账户没有已有数据
          </li>
        </ol>
      </div>

      {/* 拖拽上传区域 */}
      {!result && (
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

          {loading ? (
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

      {/* 错误提示 */}
      {error && (
        <div className="mt-4 p-4 bg-red-900/30 border border-red-800 rounded-xl">
          <div className="flex items-start gap-2">
            <span className="text-red-400 mt-0.5">✕</span>
            <div>
              <p className="text-red-300 text-sm font-medium">导入失败</p>
              <p className="text-red-400 text-sm mt-1">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* 导入结果 */}
      {result && (
        <div className="mt-4 p-5 bg-emerald-900/30 border border-emerald-800 rounded-xl">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600/30 flex items-center justify-center flex-shrink-0">
              <span className="text-emerald-400 text-lg">✓</span>
            </div>
            <div className="flex-1">
              <p className="text-emerald-300 font-medium">
                导入成功
              </p>
              <p className="text-emerald-400/80 text-sm mt-1">
                {result.message}
              </p>

              {result.stats && (
                <div className="mt-3 grid grid-cols-3 gap-3">
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">
                      {result.stats.assetsCreated}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">资产</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-400">
                      {result.stats.liabilitiesCreated}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">负债</p>
                  </div>
                  <div className="bg-neutral-800 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-emerald-400">
                      {result.stats.transactionsCreated}
                    </p>
                    <p className="text-xs text-neutral-400 mt-1">交易记录</p>
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
                    setResult(null);
                    setError("");
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

      {/* 数据格式预览 */}
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
    </div>
  );
}
