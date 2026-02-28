"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";

type MonthPickerProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

const MONTH_LABELS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const MONTH_FULL = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function formatMonthValue(value: string): string {
  if (!value) return "";
  const [year, month] = value.split("-");
  const idx = Number(month) - 1;
  if (idx < 0 || idx > 11) return value;
  // eslint-disable-next-line security/detect-object-injection
  return `${MONTH_FULL[idx]} ${year}`;
}

export default function MonthPicker({
  value,
  onChange,
  disabled = false,
  className = "",
}: MonthPickerProps) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const parsed = (() => {
    if (value && /^\d{4}-\d{2}$/.test(value)) {
      const [y, m] = value.split("-").map(Number);
      return { year: y, month: m - 1 };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  })();

  const [viewYear, setViewYear] = useState(parsed.year);

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

  useEffect(() => {
    if (!open) return;

    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        triggerRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleSelectMonth(monthIndex: number) {
    const monthStr = String(monthIndex + 1).padStart(2, "0");
    onChange(`${viewYear}-${monthStr}`);
    setOpen(false);
  }

  const selectedYear = parsed.year;
  const selectedMonth = parsed.month;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setViewYear(selectedYear);
            setOpen((prev) => !prev);
          }
        }}
        className={`inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 hover:cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
      >
        <CalendarDays className="h-4 w-4 text-zinc-400" />
        <span>{formatMonthValue(value) || "Select month"}</span>
      </button>

      {open &&
        typeof window !== "undefined" &&
        createPortal(
          <div
            ref={panelRef}
            style={{ top: position.top, left: position.left }}
            className="fixed z-9999 w-64 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg"
          >
            {/* year navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-zinc-800">
                {viewYear}
              </span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                className="rounded-lg p-1.5 text-zinc-500 transition-colors hover:bg-zinc-100 hover:cursor-pointer"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {/* month grid */}
            <div className="grid grid-cols-3 gap-1.5">
              {MONTH_LABELS.map((label, idx) => {
                const isSelected =
                  viewYear === selectedYear && idx === selectedMonth;

                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => handleSelectMonth(idx)}
                    className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors hover:cursor-pointer ${
                      isSelected
                        ? "bg-blue-800 text-white"
                        : "text-zinc-600 hover:bg-zinc-100"
                    }`}
                  >
                    {label}
                  </button>
                );
              })}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}