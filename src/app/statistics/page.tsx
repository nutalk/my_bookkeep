"use client";

import { useState, useEffect, useMemo } from "react";
import { formatMoney } from "@/lib/utils";

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

// --- SVG Line Chart ---
function LineChart({
  data,
  series,
  labels,
  height = 240,
  onPointClick,
  selectedIndex,
}: {
  data: { label: string; values: number[] }[];
  series: { color: string; name: string }[];
  labels: string[];
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
  const toY = (v: number) =>
    padding.top + ((maxVal - v) / range) * ph;

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ maxHeight: height }}>
      {/* Grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const val = maxVal - pct * range;
        const y = padding.top + pct * ph;
        return (
          <g key={pct}>
            <line
              x1={padding.left}
              y1={y}
              x2={w - padding.right}
              y2={y}
              stroke="#262626"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#737373"
            >
              {(val / 10000).toFixed(0)}万
            </text>
          </g>
        );
      })}

      {/* X axis labels */}
      {data.map((d, i) => (
        <text
          key={i}
          x={toX(i)}
          y={h - 8}
          textAnchor="middle"
          fontSize={10}
          fill="#737373"
        >
          {d.label}
        </text>
      ))}

      {/* Selected column highlight */}
      {selectedIndex != null && selectedIndex >= 0 && selectedIndex < data.length && (
        <rect
          x={toX(selectedIndex) - 14}
          y={padding.top}
          width={28}
          height={ph}
          fill="#2563eb"
          fillOpacity={0.1}
          rx={4}
        />
      )}

      {/* Lines */}
      {series.map((s, si) => {
        const points = data
          .map((d, i) => `${toX(i)},${toY(d.values[si])}`)
          .join(" ");
        return (
          <g key={si}>
            <polyline
              points={points}
              fill="none"
              stroke={s.color}
              strokeWidth={2}
              strokeLinejoin="round"
            />
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

      {/* Legend */}
      {series.map((s, i) => (
        <g
          key={i}
          transform={`translate(${padding.left + i * 100}, ${padding.top - 8})`}
        >
          <rect width={12} height={3} rx={1} fill={s.color} y={2} />
          <text x={16} fontSize={10} fill="#a3a3a3" alignmentBaseline="middle">
            {s.name}
          </text>
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
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map((pct) => {
        const val = maxVal - pct * range;
        const y = padding.top + pct * ph;
        return (
          <g key={pct}>
            <line
              x1={padding.left}
              y1={y}
              x2={w - padding.right}
              y2={y}
              stroke="#262626"
              strokeWidth={1}
            />
            <text
              x={padding.left - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill="#737373"
            >
              {(val / 10000).toFixed(0)}万
            </text>
          </g>
        );
      })}

      {/* Zero line */}
      <line
        x1={padding.left}
        y1={zeroY}
        x2={w - padding.right}
        y2={zeroY}
        stroke="#525252"
        strokeWidth={1}
      />

      {/* Bars */}
      {data.map((d, i) => {
        const x = padding.left + (i / data.length) * pw;
        const groupW = pw / data.length;
        const centerX = x + groupW / 2;

        const incomeH = (d.income / range) * ph;
        const paymentH = (d.payment / range) * ph;

        return (
          <g
            key={i}
            className="cursor-pointer"
            onClick={() => onBarClick?.(i)}
          >
            {selectedIndex === i && (
              <rect
                x={x}
                y={padding.top}
                width={groupW}
                height={ph}
                fill="#2563eb"
                fillOpacity={0.1}
                rx={3}
              />
            )}
            {/* Income bar */}
            <rect
              x={centerX - barW - gap / 2}
              y={zeroY - incomeH}
              width={barW}
              height={Math.max(1, incomeH)}
              fill="#4ade80"
              rx={2}
              opacity={selectedIndex === i ? 1 : 0.8}
            />
            {/* Payment bar */}
            <rect
              x={centerX + gap / 2}
              y={zeroY - paymentH}
              width={barW}
              height={Math.max(1, paymentH)}
              fill="#f87171"
              rx={2}
              opacity={selectedIndex === i ? 1 : 0.8}
            />
            {/* Label */}
            <text
              x={centerX}
              y={h - 8}
              textAnchor="middle"
              fontSize={10}
              fill="#737373"
            >
              {d.label}
            </text>
          </g>
        );
      })}

      {/* Legend */}
      <g transform={`translate(${padding.left}, ${padding.top - 8})`}>
        <rect width={12} height={8} rx={2} fill="#4ade80" />
        <text x={16} fontSize={10} fill="#a3a3a3" alignmentBaseline="middle">
          收入
        </text>
        <rect width={12} height={8} rx={2} fill="#f87171" x={60} />
        <text x={76} fontSize={10} fill="#a3a3a3" alignmentBaseline="middle">
          支出
        </text>
      </g>
    </svg>
  );
}

export default function StatisticsPage() {
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
      return {
        label: `${y.slice(2)}/${mo}`,
        values: [m.totalAssets, m.totalLiabilities, m.netWorth],
      };
    });
  }, [prediction]);

  const barData = useMemo(() => {
    if (!prediction) return [];
    return prediction.months.map((m) => {
      const [y, mo] = m.month.split("-");
      return {
        label: `${y.slice(2)}/${mo}`,
        income: m.assetIncome,
        payment: m.liabilityPayment,
      };
    });
  }, [prediction]);

  const selected =
    selectedMonth != null && prediction
      ? prediction.months[selectedMonth]
      : null;

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">现金流预测</h2>
          <p className="text-sm text-neutral-400 mt-1">
            资产负债趋势 & 现金流分析
          </p>
        </div>
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
        <div className="text-center text-neutral-500 py-16">加载中...</div>
      ) : prediction ? (
        <>
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">当前净值</p>
              <p className="text-lg font-bold text-blue-400 mt-1">
                {formatMoney(prediction.summary.startNetWorth)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">
                {predictionMonths}月后净值
              </p>
              <p className="text-lg font-bold text-green-400 mt-1">
                {formatMoney(prediction.summary.endNetWorth)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">月均现金流</p>
              <p
                className={`text-lg font-bold mt-1 ${
                  prediction.summary.averageMonthlyCashFlow >= 0
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {formatMoney(prediction.summary.averageMonthlyCashFlow)}
              </p>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-4">
              <p className="text-xs text-neutral-400">累计总收入</p>
              <p className="text-lg font-bold text-green-400 mt-1">
                {formatMoney(prediction.summary.totalAssetIncome)}
              </p>
            </div>
          </div>

          {/* Line chart: assets, liabilities, net worth */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-white mb-3">
              资产 / 负债 / 净值趋势
            </h3>
            <LineChart
              data={lineData}
              series={[
                { color: "#4ade80", name: "资产" },
                { color: "#f87171", name: "负债" },
                { color: "#60a5fa", name: "净值" },
              ]}
              labels={lineData.map((d) => d.label)}
              onPointClick={(i) =>
                setSelectedMonth(selectedMonth === i ? null : i)
              }
              selectedIndex={selectedMonth}
            />
          </div>

          {/* Bar chart: monthly income vs payment */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
            <h3 className="text-sm font-medium text-white mb-3">
              月度现金流
            </h3>
            <BarChart
              data={barData}
              onBarClick={(i) =>
                setSelectedMonth(selectedMonth === i ? null : i)
              }
              selectedIndex={selectedMonth}
            />
          </div>

          {/* Selected month detail */}
          {selected && (
            <div className="bg-neutral-900 border border-blue-800/50 rounded-xl p-5 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-base font-bold text-white">
                  {selected.month} 预测详情
                </h3>
                <button
                  onClick={() => setSelectedMonth(null)}
                  className="text-neutral-400 hover:text-white text-sm"
                >
                  关闭
                </button>
              </div>

              <div className="grid grid-cols-5 gap-3">
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">资产总额</p>
                  <p className="text-sm font-bold text-green-400 mt-0.5">
                    {formatMoney(selected.totalAssets)}
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">负债总额</p>
                  <p className="text-sm font-bold text-red-400 mt-0.5">
                    {formatMoney(selected.totalLiabilities)}
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">净值</p>
                  <p className="text-sm font-bold text-blue-400 mt-0.5">
                    {formatMoney(selected.netWorth)}
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">月收入</p>
                  <p className="text-sm font-bold text-green-400 mt-0.5">
                    {formatMoney(selected.assetIncome)}
                  </p>
                </div>
                <div className="bg-neutral-800 rounded-lg p-3">
                  <p className="text-xs text-neutral-400">月支出</p>
                  <p className="text-sm font-bold text-red-400 mt-0.5">
                    {formatMoney(selected.liabilityPayment)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Asset breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-neutral-300 mb-2">
                    资产明细
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left text-xs text-neutral-500 pb-1">
                          名称
                        </th>
                        <th className="text-right text-xs text-neutral-500 pb-1">
                          余额
                        </th>
                        <th className="text-right text-xs text-neutral-500 pb-1">
                          月收入
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.assetDetails.map((a, i) => (
                        <tr key={i} className="border-b border-neutral-800/50">
                          <td className="py-1.5 text-xs text-white">
                            {a.name}
                          </td>
                          <td className="py-1.5 text-xs text-right text-green-400">
                            {formatMoney(a.value)}
                          </td>
                          <td className="py-1.5 text-xs text-right text-neutral-400">
                            {formatMoney(a.income)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Liability breakdown */}
                <div>
                  <h4 className="text-sm font-medium text-neutral-300 mb-2">
                    负债明细
                  </h4>
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-neutral-800">
                        <th className="text-left text-xs text-neutral-500 pb-1">
                          名称
                        </th>
                        <th className="text-right text-xs text-neutral-500 pb-1">
                          余额
                        </th>
                        <th className="text-right text-xs text-neutral-500 pb-1">
                          月还款
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.liabilityDetails.map((l, i) => (
                        <tr key={i} className="border-b border-neutral-800/50">
                          <td className="py-1.5 text-xs text-white">
                            {l.name}
                          </td>
                          <td className="py-1.5 text-xs text-right text-red-400">
                            {formatMoney(l.remainingPrincipal)}
                          </td>
                          <td className="py-1.5 text-xs text-right text-neutral-400">
                            {formatMoney(l.payment)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Cash flow summary */}
              <div className="bg-neutral-800 rounded-lg p-3 flex items-center justify-between">
                <span className="text-sm text-neutral-400">月净现金流</span>
                <span
                  className={`text-sm font-bold ${
                    selected.cashFlow >= 0 ? "text-green-400" : "text-red-400"
                  }`}
                >
                  {selected.cashFlow >= 0 ? "+" : ""}
                  {formatMoney(selected.cashFlow)}
                </span>
              </div>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
