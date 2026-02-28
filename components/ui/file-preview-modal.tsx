"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Loader2, X } from "lucide-react";

type FilePreviewModalProps = {
  isOpen: boolean;
  onClose: () => void;
  fileUrl: string;
  downloadUrl?: string;
  title: string;
  mimeType?: string;
};

export default function FilePreviewModal({
  isOpen,
  onClose,
  fileUrl,
  downloadUrl,
  title,
  mimeType,
}: FilePreviewModalProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);

  const isPdf =
    mimeType === "application/pdf" || fileUrl.toLowerCase().endsWith(".pdf");
  const isImage =
    mimeType?.startsWith("image/") ||
    /\.(jpe?g|png|gif|webp|svg)(\?|$)/i.test(fileUrl);

  // fetch file as blob to bypass browser content blocking
  const fetchBlob = useCallback(async () => {
    if (!fileUrl) return;
    setIsLoading(true);
    setLoadError(false);
    setBlobUrl(null);

    try {
      const res = await fetch(fileUrl, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch file");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    } catch {
      setLoadError(true);
    } finally {
      setIsLoading(false);
    }
  }, [fileUrl]);

  useEffect(() => {
    if (isOpen && fileUrl) {
      void fetchBlob();
    }

    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fileUrl, fetchBlob]);

  if (!isOpen || !fileUrl) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative flex h-[85vh] w-full max-w-5xl flex-col overflow-hidden rounded-lg bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-4 py-3">
          <div className="flex flex-col">
            <h3 className="font-poppins text-lg font-semibold text-zinc-900">
              {title}
            </h3>
            <p className="text-xs text-zinc-500">Secure Internal Preview</p>
          </div>

          <div className="flex items-center gap-2">
            {(downloadUrl || fileUrl) && (
              <a
                href={downloadUrl ?? fileUrl}
                download
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:cursor-pointer hover:bg-zinc-50"
              >
                <Download className="h-4 w-4" />
                Download
              </a>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1.5 text-zinc-400 transition-colors hover:cursor-pointer hover:bg-zinc-200 hover:text-zinc-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* content */}
        <div className="relative flex-1 bg-zinc-100">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm font-medium text-zinc-500">
                  Loading preview...
                </p>
              </div>
            </div>
          )}

          {!isLoading && loadError && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <p className="text-sm text-zinc-600">
                Unable to load preview.
              </p>
              {(downloadUrl || fileUrl) && (
                <a
                  href={downloadUrl ?? fileUrl}
                  download
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-blue-900"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              )}
            </div>
          )}

          {!isLoading && !loadError && blobUrl && isPdf && (
            <iframe
              src={blobUrl}
              className="h-full w-full"
              title={title}
            />
          )}

          {!isLoading && !loadError && blobUrl && isImage && (
            <div className="flex h-full items-center justify-center overflow-auto p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={blobUrl}
                alt={title}
                className="max-h-full max-w-full rounded object-contain"
              />
            </div>
          )}

          {!isLoading && !loadError && blobUrl && !isPdf && !isImage && (
            <div className="flex h-full flex-col items-center justify-center gap-3">
              <p className="text-sm text-zinc-600">
                Preview is not available for this file type.
              </p>
              {(downloadUrl || fileUrl) && (
                <a
                  href={downloadUrl ?? fileUrl}
                  download
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:cursor-pointer hover:bg-blue-900"
                >
                  <Download className="h-4 w-4" />
                  Download File
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}