"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart2,
  Bell,
  ClipboardList,
  Clock3,
  Cpu,
  LayoutDashboard,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  Wrench,
} from "lucide-react";
import OptimisticRouteLink from "@/components/navigation/optimistic-route-link";
import { useRouteTransition } from "@/components/providers/route-transition-provider";
import { useSidebar } from "@/components/providers/sidebar-provider";
import { APP_BRAND } from "@/lib/constants/brand";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/database";
import type { DepartmentCapabilities } from "@/lib/data/department-capabilities";

type SidebarProps = {
  role: UserRole;
  departmentCapabilities: DepartmentCapabilities;
};

function matchesRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar({ role, departmentCapabilities }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { collapsed, toggle } = useSidebar();
  const { activePathname, pendingPathname } = useRouteTransition();
  const [unresolvedIncidentCount, setUnresolvedIncidentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const response = await fetch("/api/incidents?is_resolved=false&limit=1", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok || cancelled) {
          return;
        }
        const payload = (await response.json()) as {
          pagination?: { total?: number };
        };
        if (!cancelled) {
          setUnresolvedIncidentCount(payload.pagination?.total ?? 0);
        }
      } catch {
        if (!cancelled) {
          setUnresolvedIncidentCount(0);
        }
      }
    }

    void fetchCount();

    if (process.env.NODE_ENV === "development") {
      return () => {
        cancelled = true;
      };
    }

    const supabase = createClient();
    const channel = supabase
      .channel("sidebar-incidents")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "incidents" },
        () => {
          void fetchCount();
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incidents" },
        () => {
          void fetchCount();
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "incidents" },
        () => {
          void fetchCount();
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const isLeadership = role === "avp" || role === "division_head";

  const navItems = useMemo(
    () => [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/announcements", label: "Announcements", icon: Bell },
      { href: "/incidents", label: "Incidents", icon: AlertTriangle },
      ...(
        isLeadership || departmentCapabilities.supportsEquipment
          ? [{ href: "/equipment", label: "Equipment", icon: Wrench }]
          : []
      ),
      { href: "/productivity", label: "Productivity", icon: Cpu },
      { href: "/training", label: "Training", icon: ShieldCheck },
      ...(
        isLeadership || departmentCapabilities.supportsTurnaroundTime
          ? [{ href: "/turnaround-time", label: "Turnaround Time", icon: Clock3 }]
          : []
      ),
      ...(role === "department_head"
        ? [{ href: "/metrics", label: "Update Metrics", icon: BarChart2 }]
        : []),
      ...(isLeadership
        ? [{ href: "/audit", label: "Audit Logs", icon: ClipboardList }]
        : []),
    ],
    [
      departmentCapabilities.supportsEquipment,
      departmentCapabilities.supportsTurnaroundTime,
      isLeadership,
      role,
    ],
  );

  const navItemsToPrefetch = useMemo(
    () => navItems.map((item) => item.href),
    [navItems],
  );

  useEffect(() => {
    navItemsToPrefetch.forEach((href) => {
      router.prefetch(href);
    });
  }, [navItemsToPrefetch, router]);

  return (
    <aside
      aria-label={`Sidebar navigation for ${role}`}
      className={`relative z-30 flex w-full flex-col border-r border-transparent bg-transparent transition-all duration-300 md:fixed md:inset-y-0 md:left-0 md:h-screen md:overflow-y-auto ${
        collapsed ? "md:w-16" : "md:w-72"
      }`}
    >
      <div className={collapsed ? "flex justify-center p-4" : "p-13 pb-4"}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <Link href="/">
            <Image
              src="/assets/logo.png"
              alt={`${APP_BRAND.shortName} logo`}
              width={collapsed ? 32 : 44}
              height={collapsed ? 32 : 44}
              className={collapsed ? "h-8 w-8 object-contain" : "h-11 w-11 object-contain"}
            />
          </Link>
          {!collapsed ? (
            <div>
              <h2 className="font-poppins text-3xl font-bold tracking-tight text-zinc-900">
                {APP_BRAND.shortName}
              </h2>
            </div>
          ) : null}
        </div>
      </div>

      <nav className="flex-1 space-y-8 px-4 py-6" aria-label="Primary navigation">
        <div className="space-y-1">
          {!collapsed ? (
            <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-zinc-600">
              Menu
            </p>
          ) : null}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isPending =
              pendingPathname !== null
              && matchesRoute(pendingPathname, item.href)
              && !matchesRoute(pathname, item.href);
            const isActive = matchesRoute(activePathname, item.href);

            return (
              <OptimisticRouteLink
                key={item.href}
                href={item.href}
                prefetch
                title={collapsed ? item.label : undefined}
                className={
                  `group relative flex items-center ${
                    collapsed ? "justify-center px-0 py-2.5" : "gap-3 px-3 py-2.5"
                  } rounded-xl text-sm font-medium transition-all duration-200 ` +
                  (isActive
                    ? "border-l-4 border-blue-800 bg-blue-50 text-blue-900"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")
                }
                aria-current={isActive ? "page" : undefined}
              >
                <Icon
                  className={`h-4.5 w-4.5 ${
                    isActive
                      ? "text-blue-800"
                      : "text-zinc-500 group-hover:text-zinc-600"
                  }`}
                />
                {!collapsed ? <span>{item.label}</span> : null}

                {!collapsed && (item.href === "/incidents" || isPending) ? (
                  <span className="ml-auto flex items-center gap-1.5">
                    {isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-700" />
                    ) : null}
                    {item.href === "/incidents" && unresolvedIncidentCount > 0 ? (
                      <>
                        <span className="relative flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                        </span>
                        <span
                          className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                            isActive ? "bg-white text-red-700" : "bg-red-100 text-red-700"
                          }`}
                        >
                          {unresolvedIncidentCount > 99 ? "99+" : unresolvedIncidentCount}
                        </span>
                      </>
                    ) : null}
                  </span>
                ) : null}

                {collapsed && (item.href === "/incidents" || isPending) ? (
                  <>
                    {item.href === "/incidents" && unresolvedIncidentCount > 0 ? (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                        {unresolvedIncidentCount > 99 ? "99+" : unresolvedIncidentCount}
                      </span>
                    ) : null}
                    {isPending ? (
                      <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white shadow-sm">
                        <Loader2 className="h-3 w-3 animate-spin text-blue-700" />
                      </span>
                    ) : null}
                  </>
                ) : null}
              </OptimisticRouteLink>
            );
          })}
        </div>
      </nav>

      <div className={`border-t border-zinc-200 ${collapsed ? "flex justify-center p-2" : "p-4"}`}>
        <button
          type="button"
          onClick={toggle}
          className="hidden items-center gap-2 rounded-lg p-2 text-zinc-500 transition-colors hover:cursor-pointer hover:bg-zinc-100 hover:text-zinc-700 md:flex"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4.5 w-4.5" />
          ) : (
            <PanelLeftClose className="h-4.5 w-4.5" />
          )}
          {!collapsed ? <span className="text-xs font-medium">Collapse</span> : null}
        </button>
      </div>
    </aside>
  );
}
