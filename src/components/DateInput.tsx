"use client";

import { useRef, useState, useEffect } from "react";

interface DateInputProps {
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  readOnly?: boolean;
  className?: string;
}

function parseValue(v: string) {
  if (v) {
    const [y, m, d] = v.split("-");
    return { year: y || "", month: m || "", day: d || "" };
  }
  return { year: "", month: "", day: "" };
}

export function DateInput({
  value,
  onChange,
  required,
  readOnly,
  className = "",
}: DateInputProps) {
  const [parts, setParts] = useState(() => parseValue(value));
  const yearRef = useRef<HTMLInputElement>(null);
  const monthRef = useRef<HTMLInputElement>(null);
  const dayRef = useRef<HTMLInputElement>(null);
  const emittingRef = useRef(false);
  const prevValueRef = useRef(value);

  // Sync when external value changes (form reset, auto-calculated end date, etc.)
  useEffect(() => {
    if (emittingRef.current) {
      emittingRef.current = false;
      prevValueRef.current = value;
      return;
    }
    if (value !== prevValueRef.current) {
      prevValueRef.current = value;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional sync from external prop
      setParts(parseValue(value));
    }
  }, [value]);

  const emitChange = (p: { year: string; month: string; day: string }) => {
    if (p.year && p.month && p.day) {
      const next = `${p.year}-${p.month.padStart(2, "0")}-${p.day.padStart(2, "0")}`;
      emittingRef.current = true;
      prevValueRef.current = next;
      onChange(next);
    }
  };

  const handleYear = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    setParts((p) => {
      const next = { ...p, year: digits };
      emitChange(next);
      return next;
    });
    if (digits.length === 4) {
      monthRef.current?.focus();
      monthRef.current?.select();
    }
  };

  const handleMonth = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    const num = Number(digits);
    const clamped =
      digits === ""
        ? ""
        : num > 12
          ? "12"
          : num < 1 && digits.length === 2
            ? "01"
            : digits;
    setParts((p) => {
      const next = { ...p, month: clamped };
      emitChange(next);
      return next;
    });
    if (clamped.length === 2) {
      dayRef.current?.focus();
      dayRef.current?.select();
    }
  };

  const handleDay = (v: string) => {
    const digits = v.replace(/\D/g, "").slice(0, 2);
    const num = Number(digits);
    const clamped =
      digits === ""
        ? ""
        : num > 31
          ? "31"
          : num < 1 && digits.length === 2
            ? "01"
            : digits;
    setParts((p) => {
      const next = { ...p, day: clamped };
      emitChange(next);
      return next;
    });
  };

  const handleKeyDown = (
    e: React.KeyboardEvent,
    field: "year" | "month" | "day"
  ) => {
    if (e.key === "Backspace" && !(e.target as HTMLInputElement).value) {
      if (field === "day") monthRef.current?.focus();
      if (field === "month") yearRef.current?.focus();
    }
    if (e.key === "-" || e.key === "/") {
      e.preventDefault();
      if (field === "year") monthRef.current?.focus();
      if (field === "month") dayRef.current?.focus();
    }
  };

  const inputClass = `bg-neutral-800 border border-neutral-700 rounded-lg px-2 py-2 text-white text-sm text-center focus:outline-none focus:border-blue-500 ${
    readOnly ? "opacity-60 cursor-not-allowed" : ""
  }`;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      <input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="年"
        value={parts.year}
        onChange={(e) => handleYear(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "year")}
        readOnly={readOnly}
        required={required}
        className={`${inputClass} w-16`}
      />
      <span className="text-neutral-500 text-sm">-</span>
      <input
        ref={monthRef}
        type="text"
        inputMode="numeric"
        placeholder="月"
        value={parts.month}
        onChange={(e) => handleMonth(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "month")}
        readOnly={readOnly}
        required={required}
        className={`${inputClass} w-10`}
      />
      <span className="text-neutral-500 text-sm">-</span>
      <input
        ref={dayRef}
        type="text"
        inputMode="numeric"
        placeholder="日"
        value={parts.day}
        onChange={(e) => handleDay(e.target.value)}
        onKeyDown={(e) => handleKeyDown(e, "day")}
        readOnly={readOnly}
        required={required}
        className={`${inputClass} w-10`}
      />
    </div>
  );
}
