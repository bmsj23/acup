"use client";

import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastVariant = "success" | "error" | "warning" | "info";

type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
};

const TOAST_DURATION = 5000;

const variantStyles: Record<ToastVariant, { container: string; icon: React.ReactNode }> = {
  success: {
    container: "border-emerald-200 bg-emerald-50 text-emerald-800",
    icon: <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />,
  },
  error: {
    container: "border-red-200 bg-red-50 text-red-800",
    icon: <XCircle className="h-4 w-4 shrink-0 text-red-600" />,
  },
  warning: {
    container: "border-amber-200 bg-amber-50 text-amber-800",
    icon: <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />,
  },
  info: {
    container: "border-blue-200 bg-blue-50 text-blue-800",
    icon: <Info className="h-4 w-4 shrink-0 text-blue-600" />,
  },
};

let addToastGlobal: ((message: string, variant?: ToastVariant) => void) | null = null;

export function toast(message: string, variant: ToastVariant = "info") {
  if (addToastGlobal) {
    addToastGlobal(message, variant);
  }
}

export default function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "info") => {
    const id = crypto.randomUUID();
    setToasts((previous) => [...previous, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((previous) => previous.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    addToastGlobal = addToast;
    return () => {
      addToastGlobal = null;
    };
  }, [addToast]);

  useEffect(() => {
    if (toasts.length === 0) return;

    const oldest = toasts[0];
    const timer = setTimeout(() => {
      removeToast(oldest.id);
    }, TOAST_DURATION);

    return () => clearTimeout(timer);
  }, [toasts, removeToast]);

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
        {toasts.map((item) => {
          const style = variantStyles[item.variant];
          return (
            <div
              key={item.id}
              className={`flex items-start gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg animate-in slide-in-from-right ${style.container}`}
              role="alert"
            >
              {style.icon}
              <p className="flex-1">{item.message}</p>
              <button
                type="button"
                onClick={() => removeToast(item.id)}
                className="shrink-0 text-current opacity-60 hover:opacity-100 hover:cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          );
        })}
      </div>
    </>
  );
}