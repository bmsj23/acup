import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BarChart2 } from "lucide-react";
import MetricsInputForm from "@/components/metrics/metrics-input-form";
import { getProtectedPageScope } from "@/lib/data/page-scope";

export default async function MetricsPage() {
  const scope = await getProtectedPageScope();

  // only department heads may access this page
  if (scope.role !== "department_head") {
    redirect("/dashboard");
  }

  return (
    <div className="w-full">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-zinc-400 transition-colors hover:text-zinc-900 hover:cursor-pointer"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>
          <h1 className="font-poppins text-3xl font-bold text-zinc-900">Update Metrics</h1>
          <p className="mt-1 text-zinc-500">Log your department&apos;s performance data for today.</p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50">
          <BarChart2 className="h-5 w-5 text-blue-600" />
        </div>
      </div>

      <MetricsInputForm
        role="department_head"
        defaultDepartmentId={scope.defaultDepartmentId}
        availableDepartments={scope.availableDepartments}
        redirectOnSave="/dashboard"
      />
    </div>
  );
}
