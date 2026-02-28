"use client";

import { useRef, useState } from "react";
import { Clock } from "lucide-react";

type TimePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

function padTwo(n: number): string {
  return String(n).padStart(2, "0");
}

// converts "HH:MM" (24h) to 12-hour parts
function to12Hour(val: string): { hours: string; minutes: string; period: "AM" | "PM" } {
  if (!val) return { hours: "", minutes: "", period: "AM" };
  const [h, m] = val.split(":").map(Number);
  const period: "AM" | "PM" = h >= 12 ? "PM" : "AM";
  const hour12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return { hours: padTwo(hour12), minutes: padTwo(m), period };
}

// converts 12-hour parts back to "HH:MM" (24h)
function to24Hour(hours: string, minutes: string, period: "AM" | "PM"): string {
  let h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  if (isNaN(h) || isNaN(m)) return "";
  if (period === "AM" && h === 12) h = 0;
  if (period === "PM" && h !== 12) h += 12;
  return `${padTwo(h)}:${padTwo(m)}`;
}

export default function TimePicker({
  value,
  onChange,
  disabled = false,
  className = "",
}: TimePickerProps) {
  const hoursRef = useRef<HTMLInputElement>(null);
  const minutesRef = useRef<HTMLInputElement>(null);

  const parsed = to12Hour(value);
  const [hours, setHours] = useState(parsed.hours);
  const [minutes, setMinutes] = useState(parsed.minutes);
  const [period, setPeriod] = useState<"AM" | "PM">(parsed.period);
  const [prevValue, setPrevValue] = useState(value);
  
  if (value !== prevValue) {
    setPrevValue(value);
    const p = to12Hour(value);
    setHours(p.hours);
    setMinutes(p.minutes);
    setPeriod(p.period);
  }

  function commitChange(h: string, m: string, p: "AM" | "PM") {
    if (h && m) {
      const hNum = parseInt(h, 10);
      const mNum = parseInt(m, 10);
      if (hNum >= 1 && hNum <= 12 && mNum >= 0 && mNum <= 59) {
        onChange(to24Hour(h, m, p));
      }
    }
  }

  function handleHoursChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setHours(digits);

    const num = parseInt(digits, 10);
    if (digits.length === 2 && num >= 1 && num <= 12) {
      minutesRef.current?.focus();
      minutesRef.current?.select();
      commitChange(digits, minutes, period);
    }
  }

  function handleMinutesChange(raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 2);
    setMinutes(digits);

    const num = parseInt(digits, 10);
    if (digits.length === 2 && num >= 0 && num <= 59) {
      commitChange(hours, digits, period);
    }
  }

  function handleHoursBlur() {
    if (!hours) return;
    let h = parseInt(hours, 10);
    if (isNaN(h)) { setHours(""); return; }
    if (h < 1) h = 1;
    if (h > 12) h = 12;
    const padded = padTwo(h);
    setHours(padded);
    commitChange(padded, minutes, period);
  }

  function handleMinutesBlur() {
    if (!minutes) return;
    let m = parseInt(minutes, 10);
    if (isNaN(m)) { setMinutes(""); return; }
    if (m < 0) m = 0;
    if (m > 59) m = 59;
    const padded = padTwo(m);
    setMinutes(padded);
    commitChange(hours, padded, period);
  }

  function togglePeriod() {
    const next = period === "AM" ? "PM" : "AM";
    setPeriod(next);
    commitChange(hours, minutes, next);
  }

  function handleHoursKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let h = parseInt(hours || "0", 10);
      h = h >= 12 ? 1 : h + 1;
      const padded = padTwo(h);
      setHours(padded);
      commitChange(padded, minutes, period);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let h = parseInt(hours || "0", 10);
      h = h <= 1 ? 12 : h - 1;
      const padded = padTwo(h);
      setHours(padded);
      commitChange(padded, minutes, period);
    } else if (e.key === ":") {
      e.preventDefault();
      minutesRef.current?.focus();
      minutesRef.current?.select();
    }
  }

  function handleMinutesKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowUp") {
      e.preventDefault();
      let m = parseInt(minutes || "0", 10);
      m = m >= 59 ? 0 : m + 1;
      const padded = padTwo(m);
      setMinutes(padded);
      commitChange(hours, padded, period);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      let m = parseInt(minutes || "0", 10);
      m = m <= 0 ? 59 : m - 1;
      const padded = padTwo(m);
      setMinutes(padded);
      commitChange(hours, padded, period);
    } else if (e.key === "Backspace" && !minutes) {
      hoursRef.current?.focus();
    }
  }

  return (
    <div
      className={`flex w-full items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm transition focus-within:border-blue-800 focus-within:bg-white focus-within:ring-4 focus-within:ring-blue-500/10 ${
        disabled ? "cursor-not-allowed opacity-60" : ""
      } ${className}`}
    >
      <Clock className="h-4 w-4 shrink-0 text-zinc-400" />
      <input
        ref={hoursRef}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={hours}
        onChange={(e) => handleHoursChange(e.target.value)}
        onBlur={handleHoursBlur}
        onKeyDown={handleHoursKeyDown}
        onFocus={(e) => e.target.select()}
        placeholder="HH"
        className="w-7 bg-transparent text-center text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        maxLength={2}
      />
      <span className="text-zinc-400 select-none">:</span>
      <input
        ref={minutesRef}
        type="text"
        inputMode="numeric"
        disabled={disabled}
        value={minutes}
        onChange={(e) => handleMinutesChange(e.target.value)}
        onBlur={handleMinutesBlur}
        onKeyDown={handleMinutesKeyDown}
        onFocus={(e) => e.target.select()}
        placeholder="MM"
        className="w-7 bg-transparent text-center text-sm text-zinc-900 outline-none placeholder:text-zinc-400"
        maxLength={2}
      />
      <button
        type="button"
        disabled={disabled}
        onClick={togglePeriod}
        tabIndex={-1}
        className="ml-1 rounded-md bg-zinc-200 px-2 py-0.5 text-xs font-semibold text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-300 disabled:cursor-not-allowed"
      >
        {period}
      </button>
    </div>
  );
}