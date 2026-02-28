"use client";

import { useState } from "react";
import { ArrowLeft, Loader2, Shield } from "lucide-react";
import Select from "@/components/ui/select";
import DatePicker from "@/components/ui/date-picker";
import TimePicker from "@/components/ui/time-picker";
import type { DepartmentItem } from "./types";
import { formatFileSize } from "./utils";

type IncidentCreateFormProps = {
  role: "avp" | "division_head" | "department_head";
  userDepartmentId: string | null;
  userDepartmentName: string | null;
  departments: DepartmentItem[];
  onCreated: () => void;
  onCancel: () => void;
};

export default function IncidentCreateForm({
  role,
  userDepartmentId,
  userDepartmentName,
  departments,
  onCreated,
  onCancel,
}: IncidentCreateFormProps) {
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [formDepartmentId, setFormDepartmentId] = useState(
    role === "department_head" ? (userDepartmentId ?? "") : "",
  );
  const [dateOfReporting, setDateOfReporting] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dateOfIncident, setDateOfIncident] = useState("");
  const [timeOfIncident, setTimeOfIncident] = useState("");
  const [sbarSituation, setSbarSituation] = useState("");
  const [sbarBackground, setSbarBackground] = useState("");
  const [sbarAssessment, setSbarAssessment] = useState("");
  const [sbarRecommendation, setSbarRecommendation] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);

  async function handleSubmit() {
    setCreateError(null);

    if (!formDepartmentId) {
      setCreateError("Department is required.");
      return;
    }

    if (!dateOfIncident || !timeOfIncident) {
      setCreateError("Date and time of incident are required.");
      return;
    }

    if (
      !sbarSituation.trim() ||
      !sbarBackground.trim() ||
      !sbarAssessment.trim() ||
      !sbarRecommendation.trim()
    ) {
      setCreateError("All SBAR fields are required.");
      return;
    }

    setCreateBusy(true);

    try {
      const payload = new FormData();
      payload.set("department_id", formDepartmentId);
      payload.set("date_of_reporting", dateOfReporting);
      payload.set("date_of_incident", dateOfIncident);
      payload.set("time_of_incident", timeOfIncident);
      payload.set("sbar_situation", sbarSituation.trim());
      payload.set("sbar_background", sbarBackground.trim());
      payload.set("sbar_assessment", sbarAssessment.trim());
      payload.set("sbar_recommendation", sbarRecommendation.trim());

      if (attachFile) {
        payload.set("file", attachFile);
      }

      const response = await fetch("/api/incidents", {
        method: "POST",
        credentials: "include",
        body: payload,
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setCreateError(
          (data as { error?: string } | null)?.error ?? "Failed to create incident report.",
        );
        return;
      }

      onCreated();
    } catch {
      setCreateError("Failed to create incident report.");
    } finally {
      setCreateBusy(false);
    }
  }

  const departmentOptions = departments.map((d) => ({
    value: d.id,
    label: d.name,
  }));

  return (
    <div className="w-full space-y-6">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex items-center gap-2 text-sm font-medium text-zinc-600 transition-colors hover:cursor-pointer hover:text-zinc-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Incidents
      </button>

      <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <Shield className="h-6 w-6 text-blue-800" />
          <h2 className="text-xl font-semibold text-zinc-900">
            New Incident Report
          </h2>
        </div>

        {createError && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {createError}
          </div>
        )}

        <div className="space-y-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              Department <span className="text-red-500">*</span>
            </label>
            {role === "department_head" ? (
              <p className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
                {userDepartmentName ?? "Your Department"}
              </p>
            ) : (
              <Select
                value={formDepartmentId}
                onChange={(val) => setFormDepartmentId(val)}
                options={departmentOptions}
                placeholder="Select department"
              />
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Date of Reporting <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={dateOfReporting}
                onChange={(val) => setDateOfReporting(val)}
                placeholder="Select reporting date"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Date of Incident <span className="text-red-500">*</span>
              </label>
              <DatePicker
                value={dateOfIncident}
                onChange={(val) => setDateOfIncident(val)}
                placeholder="Select incident date"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Time of Incident <span className="text-red-500">*</span>
              </label>
              <TimePicker
                value={timeOfIncident}
                onChange={(val) => setTimeOfIncident(val)}
                placeholder="Select time"
              />
            </div>
          </div>

          <div className="space-y-4">
            <p className="text-sm font-semibold text-zinc-800">
              SBAR Report <span className="text-red-500">*</span>
            </p>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Situation
              </label>
              <p className="mb-1.5 text-xs text-zinc-500">
                What is happening right now? Describe the current situation concisely.
              </p>
              <textarea
                rows={3}
                value={sbarSituation}
                onChange={(e) => setSbarSituation(e.target.value)}
                placeholder="Describe the current situation..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Background
              </label>
              <p className="mb-1.5 text-xs text-zinc-500">
                What circumstances led to this situation? Provide relevant history.
              </p>
              <textarea
                rows={3}
                value={sbarBackground}
                onChange={(e) => setSbarBackground(e.target.value)}
                placeholder="Provide background context..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Assessment
              </label>
              <p className="mb-1.5 text-xs text-zinc-500">
                What do you think the problem is? State your clinical assessment.
              </p>
              <textarea
                rows={3}
                value={sbarAssessment}
                onChange={(e) => setSbarAssessment(e.target.value)}
                placeholder="State your assessment..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-zinc-700">
                Recommendation
              </label>
              <p className="mb-1.5 text-xs text-zinc-500">
                What actions do you recommend? Suggest next steps.
              </p>
              <textarea
                rows={3}
                value={sbarRecommendation}
                onChange={(e) => setSbarRecommendation(e.target.value)}
                placeholder="Provide recommendations..."
                className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 outline-none transition-colors focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-zinc-700">
              File Attachment (optional)
            </label>
            <p className="mb-1.5 text-xs text-zinc-500">
              PDF, JPEG, PNG, or WebP. Max 25MB.
            </p>
            <input
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.webp"
              onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
              className="w-full text-sm text-zinc-700 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:cursor-pointer hover:file:bg-blue-100"
            />
            {attachFile && (
              <p className="mt-1 text-xs text-zinc-500">
                {attachFile.name} ({formatFileSize(attachFile.size)})
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 border-t border-zinc-100 pt-5">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={createBusy}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:opacity-50"
            >
              {createBusy && <Loader2 className="h-4 w-4 animate-spin" />}
              Submit Incident Report
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}