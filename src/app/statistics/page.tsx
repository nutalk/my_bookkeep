"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  series: seriesConfig,
  height = 300,
  onPointClick,
  selectedIndex,
}: {
  data: { label: string; values: number[] }[];
  series: { color: string; name: string }[];
  height?: number;
  onPointClick?: (index: number) => void;
  selectedIndex?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hiddenSeries, setHiddenSeries] = useState<Set<number>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const toggleSeries = useCallback((si: number) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(si)) next.delete(si);
      else next.add(si);
      return next;
    });
  }, []);

  const padding = { top: 24, right: 24, bottom: 44, left: 64 };
  const w = width;
  const h = height;
  const pw = w - padding.left - padding.right;
  const ph = h - padding.top - padding.bottom;

  // Only consider visible series for Y range
  const visibleValues = data.flatMap((d) =>
    d.values.filter((_, si) => !hiddenSeries.has(si))
  );
  const maxVal = visibleValues.length > 0 ? Math.max(...visibleValues, 0) : 1;
  const minVal = visibleValues.length > 0 ? Math.min(...visibleValues, 0) : 0;
  const range = maxVal - minVal || 1;

  const toX = (i: number) =>
    padding.left + (data.length > 1 ? (i / (data.length - 1)) * pw : pw / 2);
  const toY = (v: number) => padding.top + ((maxVal - v) / range) * ph;

  // Label skip for dense data
  const maxLabels = Math.floor(pw / 48);
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  if (data.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full">
      {/* Legend */}
      <div className="flex gap-4 mb-3 px-2">
        {seriesConfig.map((s, si) => (
          <button
            key={si}
            onClick={() => toggleSeries(si)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              hiddenSeries.has(si) ? "opacity-30" : "opacity-100"
            }`}
          >
            <span
              className="w-3 h-0.5 rounded-full inline-block"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-neutral-400">{s.name}</span>
          </button>
        ))}
      </div>

      <svg width={w} height={h} className="w-full">
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

        {/* X labels */}
        {data.map((d, i) =>
          i % labelStep === 0 ? (
            <text
              key={i}
              x={toX(i)}
              y={h - 12}
              textAnchor="middle"
              fontSize={10}
              fill="#737373"
            >
              {d.label}
            </text>
          ) : null
        )}

        {/* Selected highlight */}
        {selectedIndex != null && selectedIndex >= 0 && selectedIndex < data.length && (
          <rect
            x={toX(selectedIndex) - 16}
            y={padding.top}
            width={32}
            height={ph}
            fill="#2563eb"
            fillOpacity={0.08}
            rx={4}
          />
        )}

        {/* Hover vertical line */}
        {hoverIdx != null && hoverIdx >= 0 && hoverIdx < data.length && (
          <line
            x1={toX(hoverIdx)}
            y1={padding.top}
            x2={toX(hoverIdx)}
            y2={padding.top + ph}
            stroke="#525252"
            strokeWidth={1}
            strokeDasharray="4 2"
          />
        )}

        {/* Lines */}
        {seriesConfig.map((s, si) => {
          if (hiddenSeries.has(si)) return null;
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
                  r={hoverIdx === i || selectedIndex === i ? 5 : 3}
                  fill={s.color}
                  className="cursor-pointer"
                  onClick={() => onPointClick?.(i)}
                  onMouseEnter={() => setHoverIdx(i)}
                />
              ))}
            </g>
          );
        })}

        {/* Invisible hover zones */}
        {data.map((d, i) => (
          <rect
            key={i}
            x={toX(i) - pw / data.length / 2}
            y={padding.top}
            width={pw / data.length}
            height={ph}
            fill="transparent"
            className="cursor-pointer"
            onMouseEnter={() => setHoverIdx(i)}
            onClick={() => onPointClick?.(i)}
          />
        ))}

        {/* Tooltip */}
        {hoverIdx != null && hoverIdx >= 0 && hoverIdx < data.length && (
          <g>
            {/* Background */}
            <rect
              x={toX(hoverIdx) + 12 > w - 180 ? toX(hoverIdx) - 192 : toX(hoverIdx) + 12}
              y={padding.top + 4}
              width={180}
              height={12 + seriesConfig.filter((_, si) => !hiddenSeries.has(si)).length * 20}
              rx={6}
              fill="#171717"
              stroke="#404040"
              strokeWidth={1}
            />
            {/* Label */}
            <text
              x={
                (toX(hoverIdx) + 12 > w - 180
                  ? toX(hoverIdx) - 192
                  : toX(hoverIdx) + 12) + 10
              }
              y={padding.top + 20}
              fontSize={11}
              fill="#a3a3a3"
              fontWeight={600}
            >
              {data[hoverIdx].label}
            </text>
            {/* Values */}
            {seriesConfig
              .map((s, si) => ({ s, si }))
              .filter(({ si }) => !hiddenSeries.has(si))
              .map(({ s, si }, vi) => (
                <text
                  key={si}
                  x={
                    (toX(hoverIdx) + 12 > w - 180
                      ? toX(hoverIdx) - 192
                      : toX(hoverIdx) + 12) + 10
                  }
                  y={padding.top + 38 + vi * 20}
                  fontSize={11}
                  fill={s.color}
                  fontWeight={500}
                >
                  {s.name}: {formatMoney(data[hoverIdx].values[si])}
                </text>
              ))}
          </g>
        )}
      </svg>
    </div>
  );
}

// --- SVG Bar Chart ---
function BarChart({
  data,
  height = 260,
  onBarClick,
  selectedIndex,
}: {
  data: { label: string; income: number; payment: number }[];
  height?: number;
  onBarClick?: (index: number) => void;
  selectedIndex?: number | null;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);
  const [hiddenSeries, setHiddenSeries] = useState<Set<number>>(new Set());
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setWidth(entry.contentRect.width);
      }
    });
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const toggleSeries = useCallback((si: number) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(si)) next.delete(si);
      else next.add(si);
      return next;
    });
  }, []);

  const showIncome = !hiddenSeries.has(0);
  const showPayment = !hiddenSeries.has(1);

  const padding = { top: 24, right: 24, bottom: 44, left: 64 };
  const w = width;
  const h = height;
  const pw = w - padding.left - padding.right;
  const ph = h - padding.top - padding.bottom;

  const allVals = data.flatMap((d) => {
    const vals: number[] = [];
    if (showIncome) vals.push(d.income);
    if (showPayment) vals.push(d.payment);
    return vals;
  });
  const maxVal = allVals.length > 0 ? Math.max(...allVals, 0) : 1;
  const minVal = Math.min(
    0,
    ...data.map((d) => (showIncome ? d.income : 0) - (showPayment ? d.payment : 0))
  );
  const range = maxVal - minVal || 1;
  const zeroY = padding.top + (maxVal / range) * ph;

  const barGap = Math.max(2, (pw / data.length) * 0.1);
  const groupWidth = pw / data.length;
  const barsToShow = (showIncome ? 1 : 0) + (showPayment ? 1 : 0);
  const barW = barsToShow > 0 ? Math.max(3, (groupWidth - barGap * 2) / barsToShow) : 0;

  // Label skip
  const maxLabels = Math.floor(pw / 48);
  const labelStep = Math.max(1, Math.ceil(data.length / maxLabels));

  if (data.length === 0) return null;

  return (
    <div ref={containerRef} className="w-full">
      {/* Legend */}
      <div className="flex gap-4 mb-3 px-2">
        {[
          { color: "#4ade80", name: "收入", si: 0 },
          { color: "#f87171", name: "支出", si: 1 },
        ].map((s) => (
          <button
            key={s.si}
            onClick={() => toggleSeries(s.si)}
            className={`flex items-center gap-1.5 text-xs transition-opacity ${
              hiddenSeries.has(s.si) ? "opacity-30" : "opacity-100"
            }`}
          >
            <span
              className="w-3 h-2 rounded-sm inline-block"
              style={{ backgroundColor: s.color }}
            />
            <span className="text-neutral-400">{s.name}</span>
          </button>
        ))}
      </div>

      <svg width={w} height={h} className="w-full">
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
          const centerX = x + groupWidth / 2;
          const incomeH = showIncome ? (d.income / range) * ph : 0;
          const paymentH = showPayment ? (d.payment / range) * ph : 0;

          let barX = centerX - (barsToShow * barW + (barsToShow - 1) * barGap) / 2;

          return (
            <g
              key={i}
              className="cursor-pointer"
              onClick={() => onBarClick?.(i)}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              {selectedIndex === i && (
                <rect
                  x={x + 1}
                  y={padding.top}
                  width={groupWidth - 2}
                  height={ph}
                  fill="#2563eb"
                  fillOpacity={0.08}
                  rx={3}
                />
              )}
              {hoverIdx === i && (
                <rect
                  x={x + 1}
                  y={padding.top}
                  width={groupWidth - 2}
                  height={ph}
                  fill="#ffffff"
                  fillOpacity={0.03}
                  rx={3}
                />
              )}
              {showIncome && (
                <rect
                  x={barX}
                  y={zeroY - incomeH}
                  width={barW}
                  height={Math.max(1, incomeH)}
                  fill="#4ade80"
                  rx={2}
                  opacity={hoverIdx === i ? 1 : 0.8}
                />
              )}
              {showPayment && (
                <rect
                  x={barX + (showIncome ? barW + barGap : 0)}
                  y={zeroY - paymentH}
                  width={barW}
                  height={Math.max(1, paymentH)}
                  fill="#f87171"
                  rx={2}
                  opacity={hoverIdx === i ? 1 : 0.8}
                />
              )}
              {/* Label */}
              {i % labelStep === 0 && (
                <text
                  x={centerX}
                  y={h - 12}
                  textAnchor="middle"
                  fontSize={10}
                  fill="#737373"
                >
                  {d.label}
                </text>
              )}
            </g>
          );
        })}

        {/* Tooltip */}
        {hoverIdx != null && hoverIdx >= 0 && hoverIdx < data.length && (
          <g>
            <rect
              x={toXBar(hoverIdx, data.length, padding.left, pw) + 12 > w - 160
                ? toXBar(hoverIdx, data.length, padding.left, pw) - 172
                : toXBar(hoverIdx, data.length, padding.left, pw) + 12}
              y={padding.top + 4}
              width={160}
              height={barsToShow * 20 + 18}
              rx={6}
              fill="#171717"
              stroke="#404040"
              strokeWidth={1}
            />
            <text
              x={
                (toXBar(hoverIdx, data.length, padding.left, pw) + 12 > w - 160
                  ? toXBar(hoverIdx, data.length, padding.left, pw) - 172
                  : toXBar(hoverIdx, data.length, padding.left, pw) + 12) + 10
              }
              y={padding.top + 20}
              fontSize={11}
              fill="#a3a3a3"
              fontWeight={600}
            >
              {data[hoverIdx].label}
            </text>
            {showIncome && (
              <text
                x={
                  (toXBar(hoverIdx, data.length, padding.left, pw) + 12 > w - 160
                    ? toXBar(hoverIdx, data.length, padding.left, pw) - 172
                    : toXBar(hoverIdx, data.length, padding.left, pw) + 12) + 10
                }
                y={padding.top + 38}
                fontSize={11}
                fill="#4ade80"
                fontWeight={500}
              >
                收入: +{formatMoney(data[hoverIdx].income)}
              </text>
            )}
            {showPayment && (
              <text
                x={
                  (toXBar(hoverIdx, data.length, padding.left, pw) + 12 > w - 160
                    ? toXBar(hoverIdx, data.length, padding.left, pw) - 172
                    : toXBar(hoverIdx, data.length, padding.left, pw) + 12) + 10
                }
                y={padding.top + 38 + (showIncome ? 20 : 0)}
                fontSize={11}
                fill="#f87171"
                fontWeight={500}
              >
                支出: -{formatMoney(data[hoverIdx].payment)}
              </text>
            )}
          </g>
        )}
      </svg>
    </div>
  );
}

function toXBar(i: number, total: number, left: number, pw: number) {
  return left + (i / total) * pw + pw / total / 2;
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
