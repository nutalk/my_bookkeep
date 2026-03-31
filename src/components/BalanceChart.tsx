"use client";

interface DataPoint {
  label: string;
  value: number;
}

export function BalanceChart({
  data,
  color = "green",
}: {
  data: DataPoint[];
  color?: "green" | "red";
}) {
  if (data.length === 0) return null;

  const values = data.map((d) => d.value);
  const maxVal = Math.max(...values, 0);
  const minVal = Math.min(...values, 0);
  const range = maxVal - minVal || 1;
  const chartHeight = 160;
  const barWidth = Math.max(12, Math.min(32, (100 / data.length) * 0.7));
  const barGap = Math.max(4, (100 / data.length) * 0.3);
  const colorClass =
    color === "green"
      ? "bg-green-500/80 hover:bg-green-400"
      : "bg-red-500/80 hover:bg-red-400";
  const textColor = color === "green" ? "text-green-400" : "text-red-400";

  return (
    <div className="w-full">
      <div className="flex items-end gap-0.5" style={{ height: chartHeight }}>
        {data.map((d, i) => {
          const pct = ((d.value - minVal) / range) * 90 + 10;
          const height = Math.max(4, (pct / 100) * chartHeight);
          return (
            <div
              key={i}
              className="flex flex-col items-center justify-end flex-1 min-w-0 group relative"
            >
              <div
                className={`${colorClass} rounded-t transition-all cursor-pointer`}
                style={{ height, width: `${barWidth}%`, minWidth: 8 }}
                title={`${d.label}: ${d.value.toLocaleString("zh-CN", { style: "currency", currency: "CNY" })}`}
              />
              {/* Tooltip on hover */}
              <div className="absolute bottom-full mb-1 hidden group-hover:block z-10">
                <div className="bg-neutral-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap shadow-lg">
                  <p className={textColor}>
                    {d.value.toLocaleString("zh-CN", {
                      style: "currency",
                      currency: "CNY",
                    })}
                  </p>
                  <p className="text-neutral-400 text-center">{d.label}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex gap-0.5 mt-1">
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 min-w-0 text-center"
            style={{ minWidth: `${barWidth}%` }}
          >
            <span className="text-[9px] text-neutral-600 truncate block">
              {data.length <= 8 ? d.label : i % Math.ceil(data.length / 6) === 0 ? d.label : ""}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
