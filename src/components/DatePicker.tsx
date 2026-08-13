"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

function parseISO(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

function toISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** 将输入内容整理为 YYYY-MM-DD（仅保留数字并自动补连字符） */
function maskDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, "").slice(0, 8);
  let out = "";
  for (let i = 0; i < digits.length; i++) {
    if (i === 4 || i === 6) out += "-";
    out += digits[i];
  }
  return out;
}

export default function DatePicker({
  value,
  onChange,
  placeholder,
  disabled = false,
  required = false,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const [viewDate, setViewDate] = useState<Date>(
    () => parseISO(value) ?? new Date(),
  );
  const containerRef = useRef<HTMLDivElement>(null);

  // 点击弹层外部时关闭
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const masked = maskDateInput(e.target.value);
    setDraft(masked);
    if (masked === "") {
      onChange("");
    } else if (parseISO(masked)) {
      onChange(masked);
    }
  };

  const handleFocus = () => {
    if (disabled) return;
    setDraft(value);
    setFocused(true);
    setViewDate(parseISO(value) ?? new Date());
    setOpen(true);
  };

  const handleBlur = () => {
    setFocused(false);
    setDraft(value);
  };

  const handleClear = () => {
    setDraft("");
    onChange("");
    setOpen(false);
  };

  const pick = (day: number) => {
    const iso = toISO(
      new Date(viewDate.getFullYear(), viewDate.getMonth(), day),
    );
    setDraft(iso);
    onChange(iso);
    setOpen(false);
  };

  const pickToday = () => {
    const iso = toISO(new Date());
    setDraft(iso);
    onChange(iso);
    setOpen(false);
  };

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const todayISO = toISO(new Date());

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={focused ? draft : value}
          onChange={handleTextChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
          }}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          autoComplete="off"
          inputMode="numeric"
          className={`w-full bg-neutral-800 border border-neutral-700 rounded-lg px-3 text-white text-sm focus:outline-none focus:border-blue-500 disabled:opacity-60 ${className}`}
        />
        {value && !disabled && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={handleClear}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-base leading-none"
            aria-label="清除日期"
            tabIndex={-1}
          >
            {"\u00d7"}
          </button>
        )}
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 w-64 rounded-xl bg-neutral-800 border border-neutral-700 p-3 shadow-xl">
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() =>
                setViewDate(new Date(year, month - 1, 1))
              }
              className="w-7 h-7 rounded-md text-lg text-neutral-400 hover:text-white hover:bg-neutral-700 leading-none"
              aria-label="上个月"
            >
              {"\u2039"}
            </button>
            <span className="text-sm text-white font-medium">
              {year}年{month + 1}月
            </span>
            <button
              type="button"
              onClick={() =>
                setViewDate(new Date(year, month + 1, 1))
              }
              className="w-7 h-7 rounded-md text-lg text-neutral-400 hover:text-white hover:bg-neutral-700 leading-none"
              aria-label="下个月"
            >
              {"\u203a"}
            </button>
          </div>

          <div className="grid grid-cols-7 mb-1 text-center text-xs text-neutral-500">
            {WEEKDAYS.map((w) => (
              <span key={w} className="py-1">
                {w}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={`blank-${i}`} />;
              const iso = toISO(new Date(year, month, day));
              const isSelected = iso === value;
              const isToday = iso === todayISO;
              return (
                <button
                  key={iso}
                  type="button"
                  onClick={() => pick(day)}
                  className={`h-8 rounded-md text-sm transition-colors ${
                    isSelected
                      ? "bg-blue-600 text-white font-medium"
                      : isToday
                        ? "text-blue-400 hover:bg-neutral-700"
                        : "text-neutral-300 hover:bg-neutral-700"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex justify-end">
            <button
              type="button"
              onClick={pickToday}
              className="text-xs text-blue-400 hover:text-blue-300"
            >
              今天
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
