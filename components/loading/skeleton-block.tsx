"use client";

import type { CSSProperties } from "react";

type SkeletonBlockProps = {
  className?: string;
  delayMs?: number;
};

export default function SkeletonBlock({
  className,
  delayMs = 0,
}: SkeletonBlockProps) {
  const style = delayMs
    ? ({ animationDelay: `${delayMs}ms` } satisfies CSSProperties)
    : undefined;

  return (
    <div
      aria-hidden
      className={`skeleton-block ${className ?? ""}`.trim()}
      style={style}
    />
  );
}
