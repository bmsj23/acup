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

export default function DatePicker({
  value,
  onChange,
  placeholder = "Select date",
  disabled = false,
  className = "",
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
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
      top: rect.bottom + 4,
      left: rect.left,
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
          className="fixed z-9999 w-72 rounded-lg border border-zinc-200 bg-white p-3 shadow-lg"
          style={{ top: position.top, left: position.left }}>
          {/* header */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={handlePrevMonth}
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 hover:cursor-pointer">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-semibold text-zinc-900">
              {/* eslint-disable-next-line security/detect-object-injection */}
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={handleNextMonth}
              className="rounded-md p-1 text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-700 hover:cursor-pointer">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          {/* weekday headers */}
          <div className="grid grid-cols-7 gap-0.5 text-center">
            {WEEKDAYS.map((wd) => (
              <span
                key={wd}
                className="py-1 text-[11px] font-medium text-zinc-400">
                {wd}
              </span>
            ))}
          </div>

          {/* day grid */}
          <div className="grid grid-cols-7 gap-0.5">
            {/* empty cells for offset */}
            {Array.from({ length: firstDay }).map((_, i) => (
              <span key={`empty-${i}`} />
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
                  className={`rounded-md py-1.5 text-sm transition-colors hover:cursor-pointer ${
                    isSelected
                      ? "bg-blue-800 font-semibold text-white"
                      : isToday
                        ? "bg-blue-50 font-medium text-blue-800 hover:bg-blue-100"
                        : "text-zinc-700 hover:bg-zinc-100"
                  }`}>
                  {day}
                </button>
              );
            })}
          </div>

          {/* today shortcut */}
          <div className="mt-2 border-t border-zinc-100 pt-2">
            <button
              type="button"
              onClick={() => handleSelectDay(new Date().getDate())}
              className="w-full rounded-md py-1.5 text-xs font-medium text-blue-800 transition-colors hover:bg-blue-50 hover:cursor-pointer">
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
        className={`flex w-full items-center justify-between rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-left text-sm outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${
          value ? "text-zinc-900" : "text-zinc-400"
        } ${className}`}>
        <span className="truncate">
          {value ? formatDateValue(value) : placeholder}
        </span>
        <CalendarDays className="ml-2 h-4 w-4 shrink-0 text-zinc-400" />
      </button>
      {calendar}
    </>
  );
}