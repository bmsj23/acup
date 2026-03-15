"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Check, ChevronDown } from "lucide-react";

export type SelectOption = {
  value: string;
  label: string;
};

type SelectProps = {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
  dropdownMinWidth?: number;
  appearance?: "default" | "ghost";
  "aria-label"?: string;
  "aria-labelledby"?: string;
};

export default function Select({
  id,
  value,
  onChange,
  options,
  placeholder = "Select...",
  disabled = false,
  className = "",
  dropdownMinWidth,
  appearance = "default",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const generatedId = useId();
  const selectId = id ?? `select-${generatedId.replace(/:/g, "")}`;
  const listboxId = `${selectId}-listbox`;

  const selectedOption = options.find((o) => o.value === value);
  const triggerBaseClassName =
    appearance === "ghost"
      ? "flex min-h-10 w-full items-center justify-between rounded-lg border-0 bg-transparent px-3 py-2 text-left text-sm shadow-none outline-none transition hover:bg-zinc-50 focus:border-0 focus:bg-zinc-50 focus:ring-0 disabled:cursor-not-allowed disabled:opacity-60"
      : "flex min-h-12 w-full items-center justify-between rounded-[1.2rem] border border-zinc-200 bg-white px-4 py-3 text-left text-sm shadow-sm outline-none transition focus:border-blue-800 focus:bg-white focus:ring-4 focus:ring-blue-500/10 disabled:cursor-not-allowed disabled:opacity-60";

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPosition({
      top: rect.bottom + 4,
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
        listRef.current?.contains(target)
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

  // scroll focused item into view
  useEffect(() => {
    if (!open || focusedIndex < 0) return;
    const items = listRef.current?.querySelectorAll("[data-select-option]");
    // eslint-disable-next-line security/detect-object-injection
    items?.[focusedIndex]?.scrollIntoView({ block: "nearest" });
  }, [focusedIndex, open]);

  function handleToggle() {
    if (disabled) return;
    if (!open) {
      const idx = options.findIndex((o) => o.value === value);
      setFocusedIndex(idx >= 0 ? idx : 0);
    }
    setOpen((prev) => !prev);
  }

  function handleSelect(optionValue: string) {
    onChange(optionValue);
    setOpen(false);
    triggerRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (disabled) return;

    if (!open) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        const idx = options.findIndex((o) => o.value === value);
        setFocusedIndex(idx >= 0 ? idx : 0);
        setOpen(true);
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setFocusedIndex((prev) => (prev < options.length - 1 ? prev + 1 : 0));
        break;
      case "ArrowUp":
        e.preventDefault();
        setFocusedIndex((prev) => (prev > 0 ? prev - 1 : options.length - 1));
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < options.length) {
          // eslint-disable-next-line security/detect-object-injection
          handleSelect(options[focusedIndex].value);
        }
        break;
      case "Home":
        e.preventDefault();
        setFocusedIndex(0);
        break;
      case "End":
        e.preventDefault();
        setFocusedIndex(options.length - 1);
        break;
    }
  }

  const dropdown = open
    ? createPortal(
        <ul
          ref={listRef}
          role="listbox"
          id={listboxId}
          className="fixed z-9999 max-h-60 overflow-auto rounded-[1.2rem] border border-blue-100/90 bg-white py-1.5 shadow-[0_24px_60px_-36px_rgba(15,23,42,0.18)]"
          style={{
            top: position.top,
            left: position.left,
            width: dropdownMinWidth ? Math.max(position.width, dropdownMinWidth) : position.width,
          }}>
          {options.map((option, index) => {
            const isSelected = option.value === value;
            const isFocused = index === focusedIndex;

            return (
              <li
                key={option.value}
                role="option"
                aria-selected={isSelected}
                data-select-option
                onMouseEnter={() => setFocusedIndex(index)}
                onClick={() => handleSelect(option.value)}
                className={`flex items-center justify-between px-3 py-2 text-sm hover:cursor-pointer transition-colors ${
                  isFocused ? "bg-blue-50 text-blue-900" : "text-zinc-700"
                } ${isSelected ? "font-medium" : ""}`}>
                <span>{option.label}</span>
                {isSelected ? (
                  <Check className="h-4 w-4 text-blue-800" />
                ) : null}
              </li>
            );
          })}
          {options.length === 0 ? (
            <li className="px-3 py-2 text-sm text-zinc-400">No options</li>
          ) : null}
        </ul>,
        document.body,
      )
    : null;

  return (
    <>
      <button
        id={selectId}
        ref={triggerRef}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={listboxId}
        aria-label={ariaLabel ?? placeholder}
        aria-labelledby={ariaLabelledBy}
        disabled={disabled}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        title={selectedOption ? selectedOption.label : placeholder}
        className={`${triggerBaseClassName} ${
          selectedOption ? "text-zinc-900" : "text-zinc-400"
        } ${className}`.trim()}>
        <span className="min-w-0 truncate whitespace-nowrap">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown
          className={`ml-2 h-4 w-4 shrink-0 text-zinc-400 transition-transform ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>
      {dropdown}
    </>
  );
}
