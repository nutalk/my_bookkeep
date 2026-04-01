"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMoney } from "@/lib/utils";

// --- Types ---

interface AssetDetail {
  name: string;
  value: number;
  income: number;
}

interface LiabilityDetail {
  name: string;
  remainingPrincipal: number;
  payment: number;
  interest: number;
  principal: number;
  repaymentMethod: string;
}

interface PredictionMonth {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  cashFlow: number;
  assetIncome: number;
  liabilityPayment: number;
  assetDetails: AssetDetail[];
  liabilityDetails: LiabilityDetail[];
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

interface HistoryAssetDetail {
  id: number;
  name: string;
  value: number;
}

interface HistoryLiabilityDetail {
  id: number;
  name: string;
  value: number;
}

interface HistoryMonth {
  month: string;
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  assetDetails: HistoryAssetDetail[];
  liabilityDetails: HistoryLiabilityDetail[];
}

interface HistoryData {
  months: HistoryMonth[];
  current: { totalAssets: number; totalLiabilities: number };
}

// --- SVG Line Chart ---
function LineChart({
  data,
  series,
  height = 240,
  onPointClick,
  selectedIndex,
}: {
  data: { label: string; values: number[] }[];
  series: { color: string; name: string }[];
  height?: number;
  onPointClick?: (index: number) => void;
  selectedIndex?: number | null;
}) {
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const w = 800;
  const h = height;
  const pw = w - padding.left - padding.right;
  const ph = h - padding.top - padding.bottom;

  const allValues = data.flatMap((d) => d.values);
  const maxVal = Math.max(...allValues, 0);
  const minVal = Math.min(...allValues, 0);
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    padding.left + (data.length > 1 ? (i / (data.length - 1)) * pw : pw / 2);
  const toY = (v: number) => padding.top + ((maxVal - v) / range) * ph;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const val = maxVal - pct * range;
        const y = padding.top + pct * ph;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#262626" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#737373">
              {(val / 10000).toFixed(0)}万
            </text>
          </g>
        );
      })}

      {data.map((d, i) => (
        <text key={i} x={toX(i)} y={h - 8} textAnchor="middle" fontSize={10} fill="#737373">
          {d.label}
        </text>
      ))}

      {selectedIndex != null && selectedIndex >= 0 && selectedIndex < data.length && (
        <rect x={toX(selectedIndex) - 14} y={padding.top} width={28} height={ph} fill="#2563eb" fillOpacity={0.1} rx={4} />
      )}

      {series.map((s, si) => {
        const points = data.map((d, i) => `${toX(i)},${toY(d.values[si])}`).join(" ");
        return (
          <g key={si}>
            <polyline points={points} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
            {data.map((d, i) => (
              <circle
                key={i}
                cx={toX(i)}
                cy={toY(d.values[si])}
                r={selectedIndex === i ? 5 : 3}
                fill={s.color}
                className="cursor-pointer"
                onClick={() => onPointClick?.(i)}
              />
            ))}
          </g>
        );
      })}

      {series.map((s, i) => (
        <g key={i} transform={`translate(${padding.left + i * 100}, ${padding.top - 8})`}>
          <rect width={12} height={3} rx={1} fill={s.color} y={2} />
          <text x={16} fontSize={10} fill="#a3a3a3" alignmentBaseline="middle">{s.name}</text>
        </g>
      ))}
    </svg>
  );
}

// --- SVG Bar Chart ---
function BarChart({
  data,
  height = 200,
  onBarClick,
  selectedIndex,
}: {
  data: { label: string; income: number; payment: number }[];
  height?: number;
  onBarClick?: (index: number) => void;
  selectedIndex?: number | null;
}) {
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const w = 800;
  const h = height;
  const pw = w - padding.left - padding.right;
  const ph = h - padding.top - padding.bottom;
  const barW = Math.max(4, (pw / data.length) * 0.35);
  const gap = (pw / data.length) * 0.05;

  const allVals = data.flatMap((d) => [d.income, d.payment]);
  const maxVal = Math.max(...allVals, 0);
  const minVal = Math.min(0, ...data.map((d) => d.income - d.payment));
  const range = maxVal - minVal || 1;
  const zeroY = padding.top + (maxVal / range) * ph;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: height }}>
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const val = maxVal - pct * range;
        const y = padding.top + pct * ph;
        return (
          <g key={pct}>
            <line x1={padding.left} y1={y} x2={w - padding.right} y2={y} stroke="#262626" strokeWidth={1} />
            <text x={padding.left - 8} y={y + 4} textAnchor="end" fontSize={10} fill="#737373">
              {(val / 10000).toFixed(0)}万
            </text>
          </g>
        );
      })}

      <line x1={padding.left} y1={zeroY} x2={w - padding.right} y2={zeroY} stroke="#525252" strokeWidth={1} />

      {data.map((d, i) => {
        const x = padding.left + (i / data.length) * pw;
        const groupW = pw / data.length;
        const centerX = x + groupW / 2;
        const incomeH = (d.income / range) * ph;
        const paymentH = (d.payment / range) * ph;

        return (
          <g key={i} className="cursor-pointer" onClick={() => onBarClick?.(i)}>
            {selectedIndex === i && (
              <rect x={x} y={padding.top} width={groupW} height={ph} fill="#2563eb" fillOpacity={0.1} rx={3} />
            )}
            <rect x={centerX - barW - gap / 2} y={zeroY - incomeH} width={barW} height={Math.max(1, incomeH)} fill="#4ade80" rx={2} opacity={selectedIndex === i ? 1 : 0.8} />
            <rect x={centerX + gap / 2} y={zeroY - paymentH} width={barW} height={Math.max(1, paymentH)} fill="#f87171" rx={2} opacity={selectedIndex === i ? 1 : 0.8} />
            <text x={centerX} y={h - 8} textAnchor="middle" fontSize={10} fill="#737373">{d.label}</text>
          </g>
        );
      })}

      <g transform={`translate(${padding.left}, ${padding.top - 8})`}>
        <rect width={12} height={8} rx={2} fill="#4ade80" />
        <text x={16} fontSize={10} fill="#a3a3a3" alignmentBaseline="middle">收入</text>
        <rect width={12} height={8} rx={2} fill="#f87171" x={60} />
        <text x={76} fontSize={10} fill="#a3a3a3" alignmentBaseline="middle">支出</text>
      </g>
    </svg>
  );
}

// --- History Tab ---
function HistoryTab() {
  const [data, setData] = useState<HistoryData | null>(null);
  const [months, setMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/statistics/history?months=${months}`)
      .then((r) => r.json())
      .then((d) => {
        if (mounted) {
          setData(d);
          setLoading(false);
          setSelectedMonth(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, [months]);

  const lineData = useMemo(() => {
    if (!data) return [];
    return data.months.map((m) => {
      const [y, mo] = m.month.split("-");
      return {
        label: `${y.slice(2)}/${mo}`,
        values: [m.totalAssets, m.totalLiabilities, m.netWorth],
      };
    });
  }, [data]);

  const selected = selectedMonth != null && data ? data.months[selectedMonth] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">历史趋势</h3>
          <p className="text-sm text-neutral-400 mt-0.5">
            基于所有交易记录计算的月度余额
          </p>
        </div>
        <select
          value={months}
          onChange={(e) => {
            setMonths(Number(e.target.value));
            setSelectedMonth(null);
          }}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm"
        >
          <option value={12}>过去 12 个月</option>
          <option value={24}>过去 24 个月</option>
          <option value={36}>过去 36 个月</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-neutral-500 py-16">加载中...</div>
      ) : data && lineData.length > 0 ? (
        <>
          {/* Current summary */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">当前资产</p>
              <p className="text-lg font-bold text-green-400 mt-1">
                {formatMoney(data.current.totalAssets)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">当前负债</p>
              <p className="text-lg font-bold text-red-400 mt-1">
                {formatMoney(data.current.totalLiabilities)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">当前净值</p>
              <p className="text-lg font-bold text-blue-400 mt-1">
                {formatMoney(data.current.totalAssets - data.current.totalLiabilities)}
              </p>
            </div>
          </div>

          {/* Line chart */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-white mb-3">资产 / 负债 / 净值趋势</h4>
            <LineChart
              data={lineData}
              series={[
                { color: "#4ade80", name: "资产" },
                { color: "#f87171", name: "负债" },
                { color: "#60a5fa", name: "净值" },
              ]}
              onPointClick={(i) => setSelectedMonth(selectedMonth === i ? null : i)}
              selectedIndex={selectedMonth}
            />
          </div>

          {/* Selected month detail table */}
          {selected && (
            <div className="bg-neutral-900 border border-blue-800/50 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-bold text-white">{selected.month} 余额明细</h4>
                <button onClick={() => setSelectedMonth(null)} className="text-neutral-400 hover:text-white text-sm">
                  关闭
                </button>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">资产总额</p>
                  <p className="text-sm font-bold text-green-400 mt-0.5">{formatMoney(selected.totalAssets)}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">负债总额</p>
                  <p className="text-sm font-bold text-red-400 mt-0.5">{formatMoney(selected.totalLiabilities)}</p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">净值</p>
                  <p className="text-sm font-bold text-blue-400 mt-0.5">{formatMoney(selected.netWorth)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Asset breakdown */}
                <div>
                  <h5 className="text-sm font-medium text-neutral-300 mb-2">资产明细</h5>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left text-xs text-neutral-500 pb-1">名称</th>
                        <th className="text-right text-xs text-neutral-500 pb-1">余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.assetDetails.length === 0 ? (
                        <tr><td colSpan={2} className="py-2 text-xs text-neutral-600 text-center">暂无</td></tr>
                      ) : (
                        selected.assetDetails.map((a) => (
                          <tr key={a.id} className="border-b border-neutral-800/50">
                            <td className="py-1.5 text-xs text-white">{a.name}</td>
                            <td className="py-1.5 text-xs text-right text-green-400">{formatMoney(a.value)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Liability breakdown */}
                <div>
                  <h5 className="text-sm font-medium text-neutral-300 mb-2">负债明细</h5>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left text-xs text-neutral-500 pb-1">名称</th>
                        <th className="text-right text-xs text-neutral-500 pb-1">余额</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.liabilityDetails.length === 0 ? (
                        <tr><td colSpan={2} className="py-2 text-xs text-neutral-600 text-center">暂无</td></tr>
                      ) : (
                        selected.liabilityDetails.map((l) => (
                          <tr key={l.id} className="border-b border-neutral-800/50">
                            <td className="py-1.5 text-xs text-white">{l.name}</td>
                            <td className="py-1.5 text-xs text-right text-red-400">{formatMoney(l.value)}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center text-neutral-500 py-16 text-sm">暂无历史数据，开始记账后这里会显示趋势</div>
      )}
    </div>
  );
}

// --- Prediction Tab ---
function PredictionTab() {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [predictionMonths, setPredictionMonths] = useState(12);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);

  useEffect(() => {
    let mounted = true;
    fetch(`/api/statistics/prediction?months=${predictionMonths}`)
      .then((r) => r.json())
      .then((data) => {
        if (mounted) {
          setPrediction(data);
          setLoading(false);
          setSelectedMonth(null);
        }
      });
    return () => {
      mounted = false;
    };
  }, [predictionMonths]);

  const lineData = useMemo(() => {
    if (!prediction) return [];
    return prediction.months.map((m) => {
      const [y, mo] = m.month.split("-");
      return { label: `${y.slice(2)}/${mo}`, values: [m.totalAssets, m.totalLiabilities, m.netWorth] };
    });
  }, [prediction]);

  const barData = useMemo(() => {
    if (!prediction) return [];
    return prediction.months.map((m) => {
      const [y, mo] = m.month.split("-");
      return { label: `${y.slice(2)}/${mo}`, income: m.assetIncome, payment: m.liabilityPayment };
    });
  }, [prediction]);

  const selected = selectedMonth != null && prediction ? prediction.months[selectedMonth] : null;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-bold text-white">现金流预测</h3>
          <p className="text-sm text-neutral-400 mt-0.5">基于资产收益率和负债还款计划的未来预测</p>
        </div>
        <select
          value={predictionMonths}
          onChange={(e) => { setPredictionMonths(Number(e.target.value)); setLoading(true); }}
          className="bg-neutral-800 border border-neutral-700 rounded-lg px-3 py-1.5 text-white text-sm"
        >
          <option value={6}>6 个月</option>
          <option value={12}>12 个月</option>
          <option value={24}>24 个月</option>
          <option value={36}>36 个月</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-neutral-500 py-16">加载中...</div>
      ) : prediction ? (
        <>
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">当前净值</p>
              <p className="text-lg font-bold text-blue-400 mt-1">{formatMoney(prediction.summary.startNetWorth)}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">{predictionMonths}月后净值</p>
              <p className="text-lg font-bold text-green-400 mt-1">{formatMoney(prediction.summary.endNetWorth)}</p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">月均现金流</p>
              <p className={`text-lg font-bold mt-1 ${prediction.summary.averageMonthlyCashFlow >= 0 ? "text-green-400" : "text-red-400"}`}>
                {formatMoney(prediction.summary.averageMonthlyCashFlow)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">累计总收入</p>
              <p className="text-lg font-bold text-green-400 mt-1">{formatMoney(prediction.summary.totalAssetIncome)}</p>
            </div>
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-white mb-3">资产 / 负债 / 净值趋势</h4>
            <LineChart
              data={lineData}
              series={[
                { color: "#4ade80", name: "资产" },
                { color: "#f87171", name: "负债" },
                { color: "#60a5fa", name: "净值" },
              ]}
              onPointClick={(i) => setSelectedMonth(selectedMonth === i ? null : i)}
              selectedIndex={selectedMonth}
            />
          </div>

          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h4 className="text-sm font-medium text-white mb-3">月度现金流</h4>
            <BarChart
              data={barData}
              onBarClick={(i) => setSelectedMonth(selectedMonth === i ? null : i)}
              selectedIndex={selectedMonth}
            />
          </div>

          {selected && (
            <div className="bg-neutral-900 border border-blue-800/50 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-base font-bold text-white">{selected.month} 预测详情</h4>
                <button onClick={() => setSelectedMonth(null)} className="text-neutral-400 hover:text-white text-sm">关闭</button>
              </div>
              <div className="grid grid-cols-5 gap-3">
                <div className="bg-neutral-800 rounded-lg p-3"><p className="text-xs text-neutral-400">资产总额</p><p className="text-sm font-bold text-green-400 mt-0.5">{formatMoney(selected.totalAssets)}</p></div>
                <div className="bg-neutral-800 rounded-lg p-3"><p className="text-xs text-neutral-400">负债总额</p><p className="text-sm font-bold text-red-400 mt-0.5">{formatMoney(selected.totalLiabilities)}</p></div>
                <div className="bg-neutral-800 rounded-lg p-3"><p className="text-xs text-neutral-400">净值</p><p className="text-sm font-bold text-blue-400 mt-0.5">{formatMoney(selected.netWorth)}</p></div>
                <div className="bg-neutral-800 rounded-lg p-3"><p className="text-xs text-neutral-400">月收入</p><p className="text-sm font-bold text-green-400 mt-0.5">{formatMoney(selected.assetIncome)}</p></div>
                <div className="bg-neutral-800 rounded-lg p-3"><p className="text-xs text-neutral-400">月支出</p><p className="text-sm font-bold text-red-400 mt-0.5">{formatMoney(selected.liabilityPayment)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-medium text-neutral-300 mb-2">资产明细</h5>
                  <table className="w-full">
                    <thead><tr className="border-b border-neutral-800"><th className="text-left text-xs text-neutral-500 pb-1">名称</th><th className="text-right text-xs text-neutral-500 pb-1">余额</th><th className="text-right text-xs text-neutral-500 pb-1">月收入</th></tr></thead>
                    <tbody>{selected.assetDetails.map((a, i) => (<tr key={i} className="border-b border-neutral-800/50"><td className="py-1.5 text-xs text-white">{a.name}</td><td className="py-1.5 text-xs text-right text-green-400">{formatMoney(a.value)}</td><td className="py-1.5 text-xs text-right text-neutral-400">{formatMoney(a.income)}</td></tr>))}</tbody>
                  </table>
                </div>
                <div>
                  <h5 className="text-sm font-medium text-neutral-300 mb-2">负债明细</h5>
                  <table className="w-full">
                    <thead><tr className="border-b border-neutral-800"><th className="text-left text-xs text-neutral-500 pb-1">名称</th><th className="text-right text-xs text-neutral-500 pb-1">余额</th><th className="text-right text-xs text-neutral-500 pb-1">月还款</th></tr></thead>
                    <tbody>{selected.liabilityDetails.map((l, i) => (<tr key={i} className="border-b border-neutral-800/50"><td className="py-1.5 text-xs text-white">{l.name}</td><td className="py-1.5 text-xs text-right text-red-400">{formatMoney(l.remainingPrincipal)}</td><td className="py-1.5 text-xs text-right text-neutral-400">{formatMoney(l.payment)}</td></tr>))}</tbody>
                  </table>
                </div>
              </div>
              <div className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-neutral-400">月净现金流</span>
                <span className={`text-sm font-bold ${selected.cashFlow >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {selected.cashFlow >= 0 ? "+" : ""}{formatMoney(selected.cashFlow)}
                </span>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}

// --- Main Page ---
export default function StatisticsPage() {
  const [tab, setTab] = useState<"history" | "prediction">("history");

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-white">统计分析</h2>
        <div className="flex gap-1 bg-neutral-800 rounded-lg p-1">
          <button
            onClick={() => setTab("history")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "history" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            历史
          </button>
          <button
            onClick={() => setTab("prediction")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              tab === "prediction" ? "bg-blue-600 text-white" : "text-neutral-400 hover:text-white"
            }`}
          >
            预测
          </button>
        </div>
      </div>

      {tab === "history" ? <HistoryTab /> : <PredictionTab />}
    </div>
  );
}
