"use client";

import { useCallback, useRef, useState } from "react";

export function usePrintableChart() {
  const ref = useRef<HTMLDivElement>(null);
  const [printImageSrc, setPrintImageSrc] = useState<string | null>(null);

  const captureForPrint = useCallback(async () => {
    if (!ref.current) return;
    const { default: html2canvas } = await import("html2canvas-pro");
    const canvas = await html2canvas(ref.current, {
      backgroundColor: "#ffffff",
      scale: 2,
      logging: false,
      useCORS: true,
    });
    setPrintImageSrc(canvas.toDataURL("image/png"));
  }, []);

  const clearPrintImage = useCallback(() => setPrintImageSrc(null), []);

  return { ref, printImageSrc, captureForPrint, clearPrintImage };
}