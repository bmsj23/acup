"use client";

import { useState } from "react";
import {
  ArrowLeft,
  FileText,
  Shield,
  Siren,
  TriangleAlert,
} from "lucide-react";
import DatePicker from "@/components/ui/date-picker";
import Select from "@/components/ui/select";
import TimePicker from "@/components/ui/time-picker";
import type { DepartmentItem } from "./types";
import { formatFileSize, INCIDENT_TYPE_LABELS } from "./utils";

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
  const [incidentType, setIncidentType] =
    useState<keyof typeof INCIDENT_TYPE_LABELS>("near_miss");
  const [sbarSituation, setSbarSituation] = useState("");
  const [sbarBackground, setSbarBackground] = useState("");
  const [sbarAssessment, setSbarAssessment] = useState("");
  const [sbarRecommendation, setSbarRecommendation] = useState("");
  const [attachFile, setAttachFile] = useState<File | null>(null);

  function getIncidentTypeLabel(value: keyof typeof INCIDENT_TYPE_LABELS) {
    switch (value) {
      case "patient_fall":
        return INCIDENT_TYPE_LABELS.patient_fall;
      case "equipment_malfunction":
        return INCIDENT_TYPE_LABELS.equipment_malfunction;
      case "patient_identification_error":
        return INCIDENT_TYPE_LABELS.patient_identification_error;
      case "procedure_related_incident":
        return INCIDENT_TYPE_LABELS.procedure_related_incident;
      case "near_miss":
      default:
        return INCIDENT_TYPE_LABELS.near_miss;
    }
  }

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
      !sbarSituation.trim()
      || !sbarBackground.trim()
      || !sbarAssessment.trim()
      || !sbarRecommendation.trim()
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
      payload.set("incident_type", incidentType);
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
          (data as { error?: string } | null)?.error
            ?? "Failed to create incident report.",
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

  return (
    <div className="relative w-full space-y-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[24rem] rounded-[2.5rem] bg-[linear-gradient(180deg,rgba(239,246,255,0.9),rgba(247,250,252,0.84),rgba(255,255,255,0))]" />

      <button
        type="button"
        onClick={onCancel}
        className="group inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/75 px-4 py-2 text-sm font-medium text-slate-600 shadow-[0_16px_38px_-32px_rgba(15,23,42,0.55)] backdrop-blur-sm transition-all hover:cursor-pointer hover:border-slate-200 hover:text-slate-900"
      >
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
        Back to incidents
      </button>

      <section className="overflow-hidden rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(244,248,252,0.96))] shadow-[0_32px_90px_-48px_rgba(30,64,175,0.18)]">
        <div className="grid gap-6 px-6 py-7 md:px-8 xl:grid-cols-[minmax(0,1.2fr)_23rem] xl:items-start">
          <div>
            <p className="text-[0.7rem] font-semibold uppercase tracking-[0.32em] text-slate-500">
              Clinical reporting desk
            </p>
            <h1 className="mt-3 text-4xl font-semibold leading-tight text-slate-950 [font-family:var(--font-playfair)] md:text-[3.2rem]">
              Create incident report
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-8 text-slate-600">
              Document the situation clearly, preserve the reporting timeline, and attach supporting evidence when the case needs a formal record.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(247,250,255,0.94))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.14)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Department scope
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {role === "department_head"
                    ? (userDepartmentName ?? "Your department")
                    : "Selectable"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Keep the report aligned with the responsible unit.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Incident type
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {getIncidentTypeLabel(incidentType)}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Adjust the classification before submission.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(239,246,255,0.98),rgba(255,255,255,0.92))] p-4 shadow-[0_18px_40px_-34px_rgba(30,64,175,0.12)]">
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-blue-700">
                  Attachment
                </p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {attachFile ? "Attached" : "Optional"}
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Add a PDF or image when documentation needs evidence.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-5 shadow-[0_24px_60px_-40px_rgba(30,64,175,0.16)] backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <Shield className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.26em] text-slate-500">
                  Filing guide
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950 [font-family:var(--font-playfair)]">
                  Lead with the risk
                </h2>
              </div>
            </div>

            <div className="mt-5 space-y-3 text-sm leading-7 text-slate-600">
              <p>Describe what happened first, then add the clinical background that supports the report.</p>
              <p>Use the assessment and recommendation fields to clarify urgency and follow-through.</p>
              <p>Attach supporting files only when they materially help review, audit, or escalation.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[2rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(245,249,255,0.95))] p-6 shadow-[0_28px_70px_-46px_rgba(30,64,175,0.14)]">
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_22rem] xl:items-start">
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Date of reporting
                </label>
                <DatePicker
                  value={dateOfReporting}
                  onChange={setDateOfReporting}
                  placeholder="Select reporting date"
                />
              </div>
              <div>
                <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Date of incident
                </label>
                <DatePicker
                  value={dateOfIncident}
                  onChange={setDateOfIncident}
                  placeholder="Select incident date"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Situation
              </label>
              <textarea
                rows={4}
                value={sbarSituation}
                onChange={(event) => setSbarSituation(event.target.value)}
                placeholder="Describe the current situation..."
                className="w-full resize-none rounded-[1.4rem] border border-blue-100 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Background
              </label>
              <textarea
                rows={4}
                value={sbarBackground}
                onChange={(event) => setSbarBackground(event.target.value)}
                placeholder="Provide relevant history and circumstances..."
                className="w-full resize-none rounded-[1.4rem] border border-blue-100 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Assessment
                </label>
                <textarea
                  rows={6}
                  value={sbarAssessment}
                  onChange={(event) => setSbarAssessment(event.target.value)}
                  placeholder="State your clinical assessment..."
                  className="w-full resize-none rounded-[1.4rem] border border-blue-100 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>

              <div>
                <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                  Recommendation
                </label>
                <textarea
                  rows={6}
                  value={sbarRecommendation}
                  onChange={(event) => setSbarRecommendation(event.target.value)}
                  placeholder="Recommend next steps and follow-up..."
                  className="w-full resize-none rounded-[1.4rem] border border-blue-100 bg-white px-4 py-3 text-sm leading-7 text-slate-900 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
              </div>
            </div>

            <div>
              <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Supporting attachment
              </label>
              <label className="flex cursor-pointer flex-col gap-3 rounded-[1.5rem] border border-dashed border-blue-200 bg-[linear-gradient(180deg,rgba(239,246,255,0.62),rgba(255,255,255,0.96))] p-5 transition-colors hover:border-blue-300 hover:bg-blue-50/75">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white text-blue-700 shadow-[0_12px_30px_-24px_rgba(30,64,175,0.24)]">
                    <FileText className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {attachFile ? attachFile.name : "Attach a PDF or image"}
                    </p>
                    <p className="text-sm text-slate-600">
                      PDF, JPEG, PNG, or WebP. Max 25MB.
                    </p>
                    {attachFile ? (
                      <p className="mt-1 text-xs text-slate-500">
                        {formatFileSize(attachFile.size)}
                      </p>
                    ) : null}
                  </div>
                </div>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.webp"
                  onChange={(event) =>
                    setAttachFile(event.target.files?.[0] ?? null)
                  }
                  className="sr-only"
                />
              </label>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-[1.8rem] border border-blue-100/80 bg-white/90 p-5 shadow-[0_18px_42px_-34px_rgba(30,64,175,0.12)]">
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                Reporting settings
              </p>

              <div className="mt-4 space-y-4">
                {role === "department_head" ? (
                  <div>
                    <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Department
                    </label>
                    <div className="rounded-[1.1rem] border border-blue-100 bg-blue-50/55 px-4 py-3 text-sm font-medium text-slate-700">
                      {userDepartmentName ?? "Your Department"}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                      Department
                    </label>
                    <Select
                      value={formDepartmentId}
                      onChange={setFormDepartmentId}
                      placeholder="Select department"
                      options={departments.map((department) => ({
                        value: department.id,
                        label: department.name,
                      }))}
                    />
                  </div>
                )}

                <div>
                  <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Time of incident
                  </label>
                  <TimePicker
                    value={timeOfIncident}
                    onChange={setTimeOfIncident}
                    placeholder="Select time"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Incident type
                  </label>
                  <Select
                    value={incidentType}
                    onChange={(value) =>
                      setIncidentType(value as keyof typeof INCIDENT_TYPE_LABELS)
                    }
                    options={Object.entries(INCIDENT_TYPE_LABELS).map(
                      ([value, label]) => ({
                        value,
                        label,
                      }),
                    )}
                  />
                </div>
              </div>
            </div>

            <div className="rounded-[1.8rem] border border-blue-100/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(245,249,255,0.95))] p-5 shadow-[0_18px_42px_-34px_rgba(30,64,175,0.12)]">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                  <Siren className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-[0.68rem] font-semibold uppercase tracking-[0.24em] text-slate-500">
                    Safety note
                  </p>
                  <p className="mt-1 text-sm leading-7 text-slate-600">
                    Keep the report precise and factual so unresolved cases can be triaged quickly by leadership and department heads.
                  </p>
                </div>
              </div>
            </div>
          </aside>
        </div>

        {createError ? (
          <div className="mt-6 rounded-[1.3rem] border border-red-100 bg-red-50/70 p-4 shadow-[0_16px_32px_-26px_rgba(220,38,38,0.16)]">
            <div className="flex items-start gap-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 text-red-600" />
              <p className="text-sm font-medium text-red-700">{createError}</p>
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-col gap-3 border-t border-blue-100/80 pt-5 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full border border-blue-100 bg-white px-5 py-3 text-sm font-medium text-blue-800 transition-colors hover:cursor-pointer hover:bg-blue-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={createBusy}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-blue-800 px-5 py-3 text-sm font-semibold text-white shadow-[0_22px_40px_-28px_rgba(30,64,175,0.42)] transition-colors hover:cursor-pointer hover:bg-blue-900 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {createBusy ? "Submitting..." : "Submit incident report"}
          </button>
        </div>
      </section>
    </div>
  );
}
