"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type DatePickerProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
};

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatDateValue(value: string): string {
  if (!value) return "";
  const parts = value.split("-");
  if (parts.length !== 3) return value;
  const [year, month, day] = parts;
  return `${MONTH_NAMES[Number(month) - 1]?.slice(0, 3)} ${Number(day)}, ${year}`;
}

function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year: number, month: number): number {
  return new Date(year, month, 1).getDay();
}

function getTodayParts() {
  const now = new Date();
  return {
    year: now.getFullYear(),
    month: now.getMonth(),
    day: now.getDate(),
  };
}

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  // parse value or default to current month
  const parsed = useMemo(() => {
    if (value) {
      const [y, m, d] = value.split("-").map(Number);
      return { year: y, month: m - 1, day: d };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }, [value]);

  const [viewYear, setViewYear] = useState(parsed.year);
  const [viewMonth, setViewMonth] = useState(parsed.month);

  // track previous value to sync view when value changes externally
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value) {
      const [y, m] = value.split("-").map(Number);
      setViewYear(y);
      setViewMonth(m - 1);
    }
  }

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 8,
      left: rect.left,
      width: rect.width,
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    updatePosition();

    const handleScroll = () => updatePosition();
    const handleResize = () => updatePosition();

    window.addEventListener("scroll", handleScroll, true);
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("scroll", handleScroll, true);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, updatePosition]);

  // close on click outside
  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        calendarRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  // close on escape
  useEffect(() => {
    if (!open) return;

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  function handlePrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function handleNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  function handleSelectDay(day: number) {
    const m = String(viewMonth + 1).padStart(2, "0");
    const d = String(day).padStart(2, "0");
    onChange(`${viewYear}-${m}-${d}`);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleToday() {
    const today = getTodayParts();
    setViewYear(today.year);
    setViewMonth(today.month);
    onChange(
      `${today.year}-${String(today.month + 1).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`,
    );
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleClear() {
    onChange("");
    setOpen(false);
    triggerRef.current?.focus();
  }

  const todayStr = useMemo(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }, []);

  const calendar = open
    ? createPortal(
        <div
          ref={calendarRef}
          className="fixed z-[9999] w-[19rem] overflow-hidden rounded-[1.5rem] border border-blue-100/90 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.97))] p-4 shadow-[0_28px_70px_-40px_rgba(30,64,175,0.22)] backdrop-blur-sm"
          style={{
            top: position.top,
            left: position.left,
            width: Math.max(position.width, 304),
          }}>
          <div className="mb-4 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white/90 text-slate-500 transition-colors hover:cursor-pointer hover:border-blue-200 hover:text-blue-800">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <div className="text-center">
              <p className="text-[0.62rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
                Calendar
              </p>
              <span className="mt-1 block text-base font-semibold text-slate-950 [font-family:var(--font-playfair)]">
              {/* eslint-disable-next-line security/detect-object-injection */}
                {MONTH_NAMES[viewMonth]} {viewYear}
              </span>
            </div>
            <button
              type="button"
              onClick={handleNextMonth}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-blue-100 bg-white/90 text-slate-500 transition-colors hover:cursor-pointer hover:border-blue-200 hover:text-blue-800">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-2 grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((wd) => (
              <span
                key={wd}
                className="py-1 text-[0.64rem] font-semibold uppercase tracking-[0.14em] text-slate-400">
                {wd}
              </span>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} className="h-10" />
            ))}
            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
              const isSelected = dateStr === value;
              const isToday = dateStr === todayStr;

              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={`h-10 rounded-[0.95rem] border text-sm transition-all hover:cursor-pointer ${
                    isSelected
                      ? "border-blue-700 bg-blue-800 font-semibold text-white shadow-[0_16px_30px_-22px_rgba(30,64,175,0.45)]"
                      : isToday
                        ? "border-blue-100 bg-blue-50/85 font-semibold text-blue-800 hover:border-blue-200 hover:bg-blue-100/80"
                        : "border-transparent bg-white/70 text-slate-700 hover:border-blue-100 hover:bg-blue-50/55"
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-blue-100/80 pt-3">
            <button
              type="button"
              onClick={handleClear}
              className="rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500 transition-colors hover:cursor-pointer hover:bg-slate-100 hover:text-slate-700">
              Clear
            </button>
            <button
              type="button"
              onClick={handleToday}
              className="rounded-full border border-blue-100 bg-blue-50/75 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-blue-800 transition-colors hover:cursor-pointer hover:border-blue-200 hover:bg-blue-100/75">
              Today
            </button>
          </div>
        </div>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) setOpen((prev) => !prev);
        }}
        className={`flex min-h-12 w-full items-center justify-between rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 text-left text-sm shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-60 ${
          value ? "text-slate-900" : "text-slate-400"
        } ${className}`}>
        <span className="truncate">
          {value ? formatDateValue(value) : placeholder}
        </span>
        <CalendarDays className="ml-2 h-4 w-4 shrink-0 text-slate-400" />
      </button>
      {calendar}
    </>
  );
}
