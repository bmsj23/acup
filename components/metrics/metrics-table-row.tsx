"use client";

import { Edit3, Trash2 } from "lucide-react";
import type { EditValues, MetricEntry } from "./types";
import { formatCurrency } from "./types";

type MetricsTableRowProps = {
  entry: MetricEntry;
  isEditing: boolean;
  editValues: EditValues;
  editBusy: boolean;
  editError: string | null;
  deletingId: string | null;
  onStartEdit: (entry: MetricEntry) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string) => void;
  onEditValueChange: (field: keyof EditValues, value: string) => void;
};

export default function MetricsTableRow({
  entry,
  isEditing,
  editValues,
  editBusy,
  editError,
  deletingId,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
  onEditValueChange,
}: MetricsTableRowProps) {
  if (isEditing) {
    return (
      <tr className="transition-colors hover:bg-zinc-50">
        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-800">
          {entry.metric_date}
        </td>
        <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
          {entry.departments?.name ?? "-"}
          {entry.department_subdepartments?.name
            ? ` (${entry.department_subdepartments.name})`
            : ""}
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            value={editValues.revenue_total}
            onChange={(e) => onEditValueChange("revenue_total", e.target.value)}
            className="w-28 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="px-4 py-2">
          <div className="flex gap-1">
            <input
              type="number"
              value={editValues.census_total}
              onChange={(e) => onEditValueChange("census_total", e.target.value)}
              className="w-16 rounded border border-zinc-300 px-2 py-1 text-sm"
              title="Total"
            />
          </div>
        </td>
        <td className="px-4 py-2">
          <input
            type="number"
            value={editValues.equipment_utilization_pct}
            onChange={(e) => onEditValueChange("equipment_utilization_pct", e.target.value)}
            className="w-20 rounded border border-zinc-300 px-2 py-1 text-sm"
          />
        </td>
        <td className="whitespace-nowrap px-4 py-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onSaveEdit(entry.id)}
              disabled={editBusy}
              className="rounded bg-blue-800 px-2.5 py-1 text-xs font-medium text-white hover:cursor-pointer hover:bg-blue-900 disabled:opacity-50"
            >
              {editBusy ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={onCancelEdit}
              className="rounded border border-zinc-300 px-2.5 py-1 text-xs font-medium text-zinc-600 hover:cursor-pointer hover:bg-zinc-50"
            >
              Cancel
            </button>
          </div>
          {editError && (
            <p className="mt-1 text-xs text-red-600">{editError}</p>
          )}
        </td>
      </tr>
    );
  }

  return (
    <tr className="transition-colors hover:bg-zinc-50">
      <td className="whitespace-nowrap px-4 py-3 text-sm font-medium text-zinc-800">
        {entry.metric_date}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-600">
        {entry.departments?.name ?? "-"}
        {entry.department_subdepartments?.name
          ? ` (${entry.department_subdepartments.name})`
          : ""}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-800">
        {formatCurrency(entry.revenue_total)}
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-800">
        {entry.census_total.toLocaleString()}
        <span className="ml-1 text-xs text-zinc-500">
          (OPD: {entry.census_opd}, ER: {entry.census_er})
        </span>
      </td>
      <td className="whitespace-nowrap px-4 py-3 text-sm text-zinc-800">
        {entry.equipment_utilization_pct.toFixed(1)}%
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onStartEdit(entry)}
            className="inline-flex items-center gap-1 rounded bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700 transition-colors hover:cursor-pointer hover:bg-zinc-200"
          >
            <Edit3 className="h-3 w-3" />
            Edit
          </button>
          <button
            type="button"
            onClick={() => onDelete(entry.id)}
            disabled={deletingId === entry.id}
            className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-1 text-xs font-medium text-red-700 transition-colors hover:cursor-pointer hover:bg-red-100 disabled:opacity-50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}