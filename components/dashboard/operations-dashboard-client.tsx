"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import DashboardPrintHeader from "@/components/dashboard/dashboard-print-header";
import DashboardStatusNotices from "@/components/dashboard/dashboard-status-notices";
import InlineErrorBanner from "@/components/ui/inline-error-banner";
import { createClient } from "@/lib/supabase/client";
import type {
  DashboardNonRevenueResponse,
  DashboardOverviewResponse,
} from "@/types/monitoring";
import DashboardIncidentBanner from "./dashboard-incident-banner";
import DashboardRevenueView from "./dashboard-revenue-view";
import DashboardSummaryGrid from "./dashboard-summary-grid";
import DashboardToolbar from "./dashboard-toolbar";
import DomainSummaryStrip from "./domain-summary-strip";
import NonRevenueSection from "./non-revenue-section";
import {
  buildDashboardScopeQueryString,
  fetchDashboardNonRevenue,
  fetchDashboardOverview,
  getDashboardNonRevenueQueryKey,
  getDashboardOverviewQueryKey,
} from "./queries";
import { formatMonthLabel, normalizeMonth } from "./utils";

type OperationsDashboardClientProps = {
  role: "avp" | "division_head" | "department_head";
  defaultDepartmentId: string | null;
  month: string;
  defaultDashboardView: "revenue" | "non-revenue";
};

export default function OperationsDashboardClient({
  role,
  defaultDepartmentId,
  month,
  defaultDashboardView,
}: OperationsDashboardClientProps) {
  const isLeadershipRole = role === "avp" || role === "division_head";
  const [selectedMonth, setSelectedMonth] = useState(() => normalizeMonth(month));
  const [selectedDepartmentId, setSelectedDepartmentId] = useState(
    defaultDepartmentId ?? "",
  );
  const [dashboardView, setDashboardView] =
    useState<OperationsDashboardClientProps["defaultDashboardView"]>(
      defaultDashboardView,
    );
  const [incidentBannerDismissed, setIncidentBannerDismissed] = useState(false);
  const [newDataAvailable, setNewDataAvailable] = useState(false);
  const [isPrintMode, setIsPrintMode] = useState(false);
  const captureRefs = useRef<Array<(() => Promise<void>) | undefined>>([]);

  function handleCaptureRefChange(index: number, capture: () => Promise<void>) {
    switch (index) {
      case 0:
        captureRefs.current[0] = capture;
        break;
      case 1:
        captureRefs.current[1] = capture;
        break;
      case 2:
        captureRefs.current[2] = capture;
        break;
      default:
        break;
    }
  }

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      return;
    }

    const supabase = createClient();
    const channel = supabase
      .channel("dashboard-metrics")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "department_metrics_daily" },
        () => {
          setNewDataAvailable(true);
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    function handleBeforePrint() {
      setIsPrintMode(true);
    }

    function handleAfterPrint() {
      setIsPrintMode(false);
    }

    window.addEventListener("beforeprint", handleBeforePrint);
    window.addEventListener("afterprint", handleAfterPrint);

    return () => {
      window.removeEventListener("beforeprint", handleBeforePrint);
      window.removeEventListener("afterprint", handleAfterPrint);
    };
  }, []);

  const queryString = useMemo(
    () => buildDashboardScopeQueryString(selectedMonth, selectedDepartmentId),
    [selectedDepartmentId, selectedMonth],
  );

  const now = new Date();
  const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const isPastMonth = selectedMonth < currentMonth;

  const {
    data: overview = null,
    isLoading: isLoadingOverview,
    isFetching: isFetchingOverview,
    error: overviewError,
    dataUpdatedAt,
    refetch: refetchOverview,
  } = useQuery<DashboardOverviewResponse | null>({
    queryKey: getDashboardOverviewQueryKey(selectedMonth, selectedDepartmentId),
    queryFn: async () => fetchDashboardOverview(queryString),
    staleTime: isPastMonth ? Infinity : 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const {
    data: nonRevenueSummary = null,
    isLoading: isLoadingNonRevenue,
    isFetching: isFetchingNonRevenue,
    error: nonRevenueError,
    refetch: refetchNonRevenue,
  } = useQuery<DashboardNonRevenueResponse | null>({
    queryKey: getDashboardNonRevenueQueryKey(selectedMonth, selectedDepartmentId),
    queryFn: async () => fetchDashboardNonRevenue(queryString),
    enabled: isLeadershipRole || dashboardView === "non-revenue",
    staleTime: isPastMonth ? Infinity : 30_000,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const dataAsOf = useMemo(
    () =>
      dataUpdatedAt
        ? new Date(dataUpdatedAt).toLocaleString([], {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : null,
    [dataUpdatedAt],
  );

  const selectedDepartmentLabel = useMemo(() => {
    if (!selectedDepartmentId) {
      return "All Departments";
    }

    return (
      overview?.filters.available_departments.find(
        (department) => department.id === selectedDepartmentId,
      )?.name ?? "Selected Department"
    );
  }, [overview?.filters.available_departments, selectedDepartmentId]);

  async function handlePrint() {
    setIsPrintMode(true);
    await new Promise((resolve) => window.setTimeout(resolve, 450));
    await Promise.all(
      captureRefs.current.map((capture) => capture?.()).filter(Boolean),
    );
    await new Promise((resolve) => window.setTimeout(resolve, 180));
    window.print();
  }

  function handleRefresh() {
    setNewDataAvailable(false);
    void Promise.all([
      refetchOverview(),
      isLeadershipRole || dashboardView === "non-revenue"
        ? refetchNonRevenue()
        : Promise.resolve(null),
    ]);
  }

  const activeError =
    overviewError?.message
    ?? (dashboardView === "non-revenue" ? nonRevenueError?.message : null)
    ?? null;

  return (
    <div className="w-full space-y-8">
      <DashboardToolbar
        role={role}
        selectedMonth={selectedMonth}
        onMonthChange={(value) => setSelectedMonth(normalizeMonth(value))}
        selectedDepartmentId={selectedDepartmentId}
        onDepartmentChange={setSelectedDepartmentId}
        dashboardView={dashboardView}
        onDashboardViewChange={setDashboardView}
        overview={overview}
        isLeadershipRole={isLeadershipRole}
        isRefreshingOverview={isFetchingOverview}
        isRefreshingNonRevenue={isFetchingNonRevenue}
        dataAsOf={dataAsOf}
        onRefresh={handleRefresh}
        onPrint={() => void handlePrint()}
        isRefreshDisabled={
          isLoadingOverview || isFetchingOverview || isFetchingNonRevenue
        }
      />

      <DashboardPrintHeader
        monthLabel={formatMonthLabel(selectedMonth)}
        departmentLabel={selectedDepartmentLabel}
        dataAsOf={dataAsOf}
      />

      {activeError ? (
        <InlineErrorBanner message={activeError} onRetry={handleRefresh} />
      ) : null}

      <DashboardStatusNotices
        newDataAvailable={newDataAvailable}
        onRefresh={handleRefresh}
        onDismissNewData={() => setNewDataAvailable(false)}
      />

      <DashboardIncidentBanner
        overview={overview}
        dismissed={incidentBannerDismissed}
        onDismiss={() => setIncidentBannerDismissed(true)}
      />

      {isLoadingOverview && !overview ? (
        <div className="flex flex-col items-center justify-center gap-3 py-20">
          <Loader2 className="h-8 w-8 animate-spin text-blue-800" />
          <p className="text-sm text-zinc-500">Loading dashboard data...</p>
        </div>
        ) : (
          <>
            {dashboardView === "revenue" ? (
              <DashboardSummaryGrid overview={overview} />
            ) : null}

            <DomainSummaryStrip />

          {dashboardView === "non-revenue" ? (
            <NonRevenueSection
              selectedMonth={selectedMonth}
              summary={nonRevenueSummary}
              loading={isLoadingNonRevenue}
              isFetching={isFetchingNonRevenue}
            />
          ) : (
            <DashboardRevenueView
              role={role}
              selectedMonth={selectedMonth}
              selectedDepartmentId={selectedDepartmentId}
              overview={overview}
              isPrintMode={isPrintMode}
              onCaptureRefChange={handleCaptureRefChange}
            />
          )}
        </>
      )}
    </div>
  );
}
