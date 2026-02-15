"use client";

import { useState, useRef } from "react";
import {
  Upload,
  File as FileIcon,
  Loader2,
  AlertCircle,
} from "lucide-react";
import Modal from "@/components/ui/modal";

type DocumentUploadModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
  departmentId: string | null;
};

export default function DocumentUploadModal({
  isOpen,
  onClose,
  onUploadSuccess,
  departmentId,
}: DocumentUploadModalProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetForm = () => {
    setFile(null);
    setTitle("");
    setDescription("");
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    if (uploading) return;
    resetForm();
    onClose();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    setError(null);

    if (!selectedFile) return;

    if (selectedFile.size > 25 * 1024 * 1024) {
      setError("File size must be less than 25MB");
      return;
    }

    const allowedTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // .xlsx
    ];

    if (!allowedTypes.includes(selectedFile.type)) {
      setError("Only PDF, DOCX, and XLSX files are allowed");
      return;
    }

    setFile(selectedFile);
    if (!title) {
      const nameWithoutExt = selectedFile.name
        .split(".")
        .slice(0, -1)
        .join(".");
      setTitle(nameWithoutExt);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !departmentId) {
      setError("Missing file or department context.");
      return;
    }
    if (!title.trim()) {
      setError("Title is required.");
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title);
    formData.append("description", description);
    formData.append("department_id", departmentId);

    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      if (!response.ok) {
        const payload = await response.json();
        throw new Error(payload.error || "Upload failed");
      }

      onUploadSuccess();
      handleClose();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Upload Document">
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* File Select Area */}
        <div className="space-y-1.5">
          <label className="block text-sm font-medium text-zinc-700">
            Document File
          </label>
          <div
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`
              relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors
              ${
                file
                  ? "border-blue-200 bg-blue-50/50"
                  : "border-zinc-300 bg-zinc-50 hover:bg-zinc-100 hover:cursor-pointer"
              }
              ${uploading ? "cursor-not-allowed opacity-60" : ""}
              ${error ? "border-red-300 bg-red-50" : ""}
            `}>
            {file ? (
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-blue-100 p-2.5 text-blue-600 mb-2">
                  <FileIcon className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-zinc-900 truncate max-w-50">
                  {file.name}
                </p>
                <p className="text-xs text-zinc-500">
                  {(file.size / 1024 / 1024).toFixed(2)} MB
                </p>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  disabled={uploading}
                  className="mt-3 text-xs font-semibold text-red-600 hover:text-red-700 hover:underline hover:cursor-pointer disabled:no-underline">
                  Remove file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-zinc-100 p-2.5 text-zinc-400 mb-2">
                  <Upload className="h-6 w-6" />
                </div>
                <p className="text-sm font-medium text-zinc-900">
                  Click to select file
                </p>
                <p className="text-xs text-zinc-500 mt-1">
                  PDF, DOCX, XLSX up to 25MB
                </p>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx,.xlsx"
              onChange={handleFileChange}
              className="hidden"
              disabled={uploading}
            />
          </div>
        </div>

        {/* Title & Desc */}
        <div className="space-y-4">
          <div>
            <label
              htmlFor="title"
              className="block text-sm font-medium text-zinc-700">
              Title
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={uploading}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              placeholder="e.g. Annual Budget Report 2024"
              required
            />
          </div>

          <div>
            <label
              htmlFor="description"
              className="block text-sm font-medium text-zinc-700">
              Description{" "}
              <span className="text-zinc-400 font-normal">(Optional)</span>
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={uploading}
              rows={3}
              className="mt-1 block w-full rounded-md border border-zinc-300 px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
              placeholder="Brief summary of the document contents..."
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="rounded-md bg-red-50 p-3 flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={uploading}
            className="rounded-md border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 hover:cursor-pointer">
            Cancel
          </button>
          <button
            type="submit"
            disabled={!file || !title || uploading}
            className="inline-flex items-center gap-2 rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 hover:cursor-pointer">
            {uploading && <Loader2 className="h-4 w-4 animate-spin" />}
            {uploading ? "Uploading..." : "Upload Document"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
