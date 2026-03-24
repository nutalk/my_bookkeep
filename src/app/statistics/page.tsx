"use client";

import { useState, useEffect } from "react";
import { formatMoney } from "@/lib/utils";

interface PredictionMonth {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  cashFlow: number;
  assetIncome: number;
  liabilityPayment: number;
}

interface PredictionData {
  months: PredictionMonth[];
  summary: {
    startNetWorth: number;
    endNetWorth: number;
    averageMonthlyCashFlow: number;
    totalAssetIncome: number;
    totalLiabilityPayment: number;
  };
}

interface MonthlyStats {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  monthlyCashFlow: number;
}

export default function StatisticsPage() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [snapshots, setSnapshots] = useState<MonthlyStats[]>([]);
  const [predictionMonths, setPredictionMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"prediction" | "history">(
    "prediction"
  );
  const [refreshKey, setRefreshKey] = useState(0);

  const fetchSnapshots = () => setRefreshKey((k) => k + 1);

  useEffect(() => {
    let mounted = true;
    if (activeTab === "prediction") {
      fetch(`/api/statistics/prediction?months=${predictionMonths}`)
        .then((r) => r.json())
        .then((data) => {
          if (mounted) {
            setPrediction(data);
            setLoading(false);
          }
        });
    } else {
      fetch("/api/statistics/monthly")
        .then((r) => r.json())
        .then((data) => {
          if (mounted) {
            setSnapshots(data);
            setLoading(false);
          }
        });
    }
    return () => {
      mounted = false;
    };
  }, [activeTab, predictionMonths, refreshKey]);

  const handleGenerateSnapshot = async () => {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    await fetch("/api/statistics/monthly", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    });
    fetchSnapshots();
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">统计分析</h2>
          <p className="text-sm text-neutral-400 mt-1">
            月度统计、现金流预测
          </p>
        </div>
        {activeTab === "history" && (
          <button
            onClick={handleGenerateSnapshot}
            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
          >
            生成本月快照
          </button>
        )}
      </div>

      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab("prediction")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "prediction"
              ? "bg-blue-600 text-white"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          现金流预测
        </button>
        <button
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-blue-600 text-white"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
          }`}
        >
          月度快照
        </button>
      </div>

      {activeTab === "prediction" && (
        <>
          <div className="flex items-center gap-3">
            <span className="text-sm text-neutral-400">预测月数:</span>
            <select
              value={predictionMonths}
              onChange={(e) => {
                setPredictionMonths(Number(e.target.value));
                setLoading(true);
              }}
              className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm"
            >
              <option value={6}>6 个月</option>
              <option value={12}>12 个月</option>
              <option value={24}>24 个月</option>
              <option value={36}>36 个月</option>
            </select>
          </div>

          {loading ? (
            <div className="text-center text-neutral-500 py-8">
              加载中...
            </div>
          ) : prediction ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-sm text-neutral-400">当前净值</p>
                  <p className="text-xl font-bold text-blue-400 mt-1">
                    {formatMoney(prediction.summary.startNetWorth)}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-sm text-neutral-400">
                    {predictionMonths}月后预测净值
                  </p>
                  <p className="text-xl font-bold text-green-400 mt-1">
                    {formatMoney(prediction.summary.endNetWorth)}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-sm text-neutral-400">月均现金流</p>
                  <p
                    className={`text-xl font-bold mt-1 ${
                      prediction.summary.averageMonthlyCashFlow >= 0
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {formatMoney(prediction.summary.averageMonthlyCashFlow)}
                  </p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                  <p className="text-sm text-neutral-400">
                    累计预测总收入
                  </p>
                  <p className="text-xl font-bold text-green-400 mt-1">
                    {formatMoney(prediction.summary.totalAssetIncome)}
                  </p>
                </div>
              </div>

              <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-neutral-800">
                      <th className="text-left text-xs text-neutral-400 px-4 py-3 font-medium">
                        月份
                      </th>
                      <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                        预测资产
                      </th>
                      <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                        预测负债
                      </th>
                      <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                        预测净值
                      </th>
                      <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                        月现金流
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {prediction.months.map((m) => (
                      <tr
                        key={m.month}
                        className="border-b border-neutral-800/50 hover:bg-neutral-800/30"
                      >
                        <td className="px-4 py-3 text-sm text-white">
                          {m.month}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-green-400">
                          {formatMoney(m.totalAssets)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-red-400">
                          {formatMoney(m.totalLiabilities)}
                        </td>
                        <td className="px-4 py-3 text-sm text-right text-blue-400">
                          {formatMoney(m.netWorth)}
                        </td>
                        <td
                          className={`px-4 py-3 text-sm text-right font-medium ${
                            m.cashFlow >= 0
                              ? "text-green-400"
                              : "text-red-400"
                          }`}
                        >
                          {formatMoney(m.cashFlow)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : null}
        </>
      )}

      {activeTab === "history" && (
        <div className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-neutral-800">
                <th className="text-left text-xs text-neutral-400 px-4 py-3 font-medium">
                  月份
                </th>
                <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                  总资产
                </th>
                <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                  总负债
                </th>
                <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                  净值
                </th>
                <th className="text-right text-xs text-neutral-400 px-4 py-3 font-medium">
                  月现金流
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-neutral-500 py-8 text-sm"
                  >
                    加载中...
                  </td>
                </tr>
              ) : snapshots.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="text-center text-neutral-500 py-8 text-sm"
                  >
                    暂无月度快照，点击上方按钮生成
                  </td>
                </tr>
              ) : (
                snapshots.map((s) => (
                  <tr
                    key={s.month}
                    className="border-b border-neutral-800/50 hover:bg-neutral-800/30"
                  >
                    <td className="px-4 py-3 text-sm text-white">
                      {s.month}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-green-400">
                      {formatMoney(s.totalAssets)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-red-400">
                      {formatMoney(s.totalLiabilities)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-blue-400">
                      {formatMoney(s.netWorth)}
                    </td>
                    <td
                      className={`px-4 py-3 text-sm text-right font-medium ${
                        s.monthlyCashFlow >= 0
                          ? "text-green-400"
                          : "text-red-400"
                      }`}
                    >
                      {formatMoney(s.monthlyCashFlow)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
