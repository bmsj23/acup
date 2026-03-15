"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import type {
  DepartmentItem,
  IncidentItem,
  IncidentsResponse,
  Pagination,
  ViewState,
} from "./types";
import IncidentCreateForm from "./incident-create-form";
import IncidentDetail from "./incident-detail";
import IncidentList from "./incident-list";
import {
  buildIncidentListQueryString,
  fetchIncidentDepartments,
  fetchIncidentList,
  getIncidentDepartmentsQueryKey,
  getIncidentListQueryKey,
} from "./queries";
import {
  WORKSPACE_QUERY_GC_TIME,
  WORKSPACE_QUERY_STALE_TIME,
} from "@/lib/navigation/protected-route-prefetch";

type IncidentsClientProps = {
  role: "avp" | "division_head" | "department_head";
  userDepartmentId: string | null;
  userDepartmentName: string | null;
};

function currentMonthKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function IncidentsClient({
  role,
  userDepartmentId,
  userDepartmentName,
}: IncidentsClientProps) {
  const queryClient = useQueryClient();
  const currentMonth = currentMonthKey();
  const [view, setView] = useState<ViewState>("list");
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState("");
  const [resolutionFilter, setResolutionFilter] =
    useState<"open" | "resolved" | "all">("open");
  const [incidentTypeFilter, setIncidentTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [monthFilterActive, setMonthFilterActive] = useState(false);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const queryString = useMemo(
    () =>
      buildIncidentListQueryString({
        page,
        limit,
        search,
        resolutionFilter,
        incidentTypeFilter,
        departmentFilter,
        selectedMonth,
        monthFilterActive,
      }),
    [
      page,
      limit,
      search,
      resolutionFilter,
      incidentTypeFilter,
      departmentFilter,
      selectedMonth,
      monthFilterActive,
    ],
  );

  const {
    data: incidentsData,
    isLoading: loading,
    error: queryError,
  } = useQuery<IncidentsResponse>({
    queryKey: getIncidentListQueryKey(queryString),
    queryFn: async () => fetchIncidentList(queryString),
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
    placeholderData: (previous) => previous,
  });

  const { data: departments = [] } = useQuery<DepartmentItem[]>({
    queryKey: getIncidentDepartmentsQueryKey(),
    queryFn: fetchIncidentDepartments,
    staleTime: WORKSPACE_QUERY_STALE_TIME,
    gcTime: WORKSPACE_QUERY_GC_TIME,
    refetchOnWindowFocus: false,
  });

  const incidents = incidentsData?.data ?? [];
  const pagination: Pagination =
    incidentsData?.pagination ?? { page: 1, limit: 10, total: 0, total_pages: 1 };
  const error = queryError?.message ?? null;

  const resolveMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_resolved: true }),
      });
      if (!response.ok) {
        throw new Error("Failed to resolve incident.");
      }
      return id;
    },
    onMutate: (id) => {
      setActionBusyId(id);
    },
    onSuccess: (id) => {
      toast.success("Incident resolved.");
      if (selectedIncident?.id === id) {
        setSelectedIncident({ ...selectedIncident, is_resolved: true });
      }
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
    onSettled: () => {
      setActionBusyId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error(
          "Delete failed. You may not have access for this action.",
        );
      }
      return id;
    },
    onMutate: (id) => {
      setActionBusyId(id);
    },
    onSuccess: () => {
      toast.success("Incident deleted.");
      setView("list");
      setSelectedIncident(null);
      void queryClient.invalidateQueries({ queryKey: ["incidents"] });
    },
    onError: (mutationError) => {
      toast.error(mutationError.message);
    },
    onSettled: () => {
      setActionBusyId(null);
    },
  });

  async function handleOpenIncident(id: string) {
    setLoadingDetail(true);
    setView("detail");

    try {
      const response = await fetch(`/api/incidents/${id}`, {
        method: "GET",
        credentials: "include",
      });

      if (!response.ok) {
        toast.error("Failed to load incident details.");
        setView("list");
        return;
      }

      const payload = (await response.json()) as { data?: IncidentItem };
      setSelectedIncident(payload.data ?? null);
    } catch {
      toast.error("Failed to load incident details.");
      setView("list");
    } finally {
      setLoadingDetail(false);
    }
  }

  function handleBackToList() {
    setView("list");
    setSelectedIncident(null);
  }

  if (view === "detail") {
    return (
      <IncidentDetail
        incident={selectedIncident}
        loading={loadingDetail}
        actionBusyId={actionBusyId}
        onResolve={(id) => resolveMutation.mutate(id)}
        onDelete={(id) => {
          if (
            window.confirm("Delete this incident report? This action cannot be undone.")
          ) {
            deleteMutation.mutate(id);
          }
        }}
        onBack={handleBackToList}
      />
    );
  }

  if (view === "create") {
    return (
      <IncidentCreateForm
        role={role}
        userDepartmentId={userDepartmentId}
        userDepartmentName={userDepartmentName}
        departments={departments}
        onCreated={() => {
          setView("list");
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
        }}
        onCancel={handleBackToList}
      />
    );
  }

  return (
    <IncidentList
      role={role}
      incidents={incidents}
      pagination={pagination}
      search={search}
      resolutionFilter={resolutionFilter}
      incidentTypeFilter={incidentTypeFilter}
      departmentFilter={departmentFilter}
      selectedMonth={selectedMonth}
      monthFilterActive={monthFilterActive}
      loading={loading}
      error={error}
      departments={departments}
      currentMonth={currentMonth}
      onMonthChange={(value) => {
        setSelectedMonth(value);
        setMonthFilterActive(true);
        setPage(1);
      }}
      onClearMonthFilter={() => {
        setMonthFilterActive(false);
        setPage(1);
      }}
      onSearchChange={(value) => {
        setSearch(value);
        setPage(1);
      }}
      onResolutionFilterChange={(value) => {
        setResolutionFilter(value);
        setPage(1);
      }}
      onIncidentTypeFilterChange={(value) => {
        setIncidentTypeFilter(value);
        setPage(1);
      }}
      onDepartmentFilterChange={(value) => {
        setDepartmentFilter(value);
        setPage(1);
      }}
      onApplyQuickFilter={(value) => {
        if (value === "open") {
          setResolutionFilter("open");
          setMonthFilterActive(false);
        } else if (value === "current_month") {
          setResolutionFilter("all");
          setSelectedMonth(currentMonth);
          setMonthFilterActive(true);
        } else {
          setResolutionFilter("all");
          setMonthFilterActive(false);
        }
        setPage(1);
      }}
      onPageChange={setPage}
      onOpenIncident={(id) => void handleOpenIncident(id)}
      onCreateNew={() => setView("create")}
    />
  );
}
