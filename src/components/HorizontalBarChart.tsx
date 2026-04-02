"use client";

import { useState } from "react";

interface BarItem {
  label: string;
  principal: number;
  interest: number;
  color: string;
}

export function HorizontalBarChart({
  data,
  title,
  showBreakdown = false,
}: {
  data: BarItem[];
  title: string;
  showBreakdown?: boolean;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const maxVal = Math.max(...data.map((d) => d.principal + d.interest), 0);

  if (data.length === 0 || maxVal === 0) {
    return (
      <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
        <h4 className="text-sm font-medium text-white mb-3">{title}</h4>
        <p className="text-center text-neutral-600 text-xs py-8">暂无数据</p>
      </div>
    );
  }

  return (
    <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-5">
      <h4 className="text-sm font-medium text-white mb-4">{title}</h4>
      <div className="space-y-3">
        {data.map((d, i) => {
          const total = d.principal + d.interest;
          const totalPct = (total / maxVal) * 100;
          const principalPct = maxVal > 0 ? (d.principal / maxVal) * 100 : 0;
          const interestPct = maxVal > 0 ? (d.interest / maxVal) * 100 : 0;

          return (
            <div
              key={i}
              className="cursor-pointer group"
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs truncate max-w-[50%] ${hoverIdx === i ? "text-white" : "text-neutral-400"}`}>
                  {d.label}
                </span>
                <span className={`text-xs font-medium ${hoverIdx === i ? "text-white" : "text-neutral-400"}`}>
                  {total >= 10000 ? `${(total / 10000).toFixed(2)}万` : total.toFixed(0)}
                </span>
              </div>
              <div className="w-full bg-neutral-800 rounded-full h-5 overflow-hidden flex">
                <div
                  className="h-full rounded-l-full transition-all duration-300"
                  style={{
                    width: `${principalPct}%`,
                    backgroundColor: d.color,
                    opacity: hoverIdx === i ? 1 : 0.7,
                  }}
                />
                {showBreakdown && d.interest > 0 && (
                  <div
                    className="h-full transition-all duration-300"
                    style={{
                      width: `${interestPct}%`,
                      backgroundColor: d.color,
                      opacity: 0.4,
                    }}
                  />
                )}
              </div>
              {showBreakdown && hoverIdx === i && (
                <div className="flex gap-4 mt-1 text-xs">
                  <span style={{ color: d.color }}>
                    本金 {d.principal >= 10000 ? `${(d.principal / 10000).toFixed(2)}万` : d.principal.toFixed(0)}
                  </span>
                  <span style={{ color: d.color }} className="opacity-60">
                    利息 {d.interest >= 10000 ? `${(d.interest / 10000).toFixed(2)}万` : d.interest.toFixed(0)}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
      {showBreakdown && (
        <div className="flex gap-4 mt-4 text-xs text-neutral-500">
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-red-500 opacity-70 inline-block" />
            本金
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-2 rounded-sm bg-red-500 opacity-40 inline-block" />
            利息
          </div>
        </div>
      )}
    </div>
  );
}
