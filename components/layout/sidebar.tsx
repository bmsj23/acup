"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  BarChart2,
  Bell,
  ClipboardList,
  LayoutDashboard,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useSidebar } from "@/components/providers/sidebar-provider";
import type { UserRole } from "@/types/database";

type SidebarProps = {
  role: UserRole;
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { collapsed, toggle } = useSidebar();
  const [unresolvedIncidentCount, setUnresolvedIncidentCount] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function fetchCount() {
      try {
        const response = await fetch("/api/incidents?is_resolved=false&limit=1", {
          method: "GET",
          credentials: "include",
        });
        if (!response.ok || cancelled) return;
        const payload = (await response.json()) as {
          pagination?: { total?: number };
        };
        if (!cancelled) setUnresolvedIncidentCount(payload.pagination?.total ?? 0);
      } catch {
        if (!cancelled) setUnresolvedIncidentCount(0);
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
        { event: "INSERT", schema: "public", table: "incident_reports" },
        () => {
          setUnresolvedIncidentCount((prev) => prev + 1);
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "incident_reports" },
        (payload) => {
          const updated = payload.new as { is_resolved?: boolean };
          const old = payload.old as { is_resolved?: boolean };
          if (updated.is_resolved && !old.is_resolved) {
            setUnresolvedIncidentCount((prev) => Math.max(0, prev - 1));
          }
          void queryClient.invalidateQueries({ queryKey: ["incidents"] });
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [queryClient]);

  const navItems = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/announcements", label: "Announcements", icon: Bell },
    ...(role === "department_head"
      ? [{ href: "/metrics", label: "Update Metrics", icon: BarChart2 }]
      : []),
    { href: "/incidents", label: "Incidents", icon: AlertTriangle },
    ...(role === "avp" || role === "division_head"
      ? [{ href: "/audit", label: "Audit Logs", icon: ClipboardList }]
      : []),
  ];

  return (
    <aside
      aria-label={`Sidebar navigation for ${role}`}
      className={`relative z-30 flex w-full flex-col border-r border-transparent bg-transparent transition-all duration-300 md:fixed md:inset-y-0 md:left-0 md:h-screen md:overflow-y-auto ${collapsed ? "md:w-16" : "md:w-72"}`}>
      {/* Header */}
      <div className={collapsed ? "flex justify-center p-4" : "p-13 pb-4"}>
        <div className={`flex items-center ${collapsed ? "justify-center" : "gap-2.5"}`}>
          <Link href="/">
            <Image src="/assets/logo.png" alt="ACUP logo" width={collapsed ? 32 : 44} height={collapsed ? 32 : 44} className={collapsed ? "h-8 w-8 object-contain" : "h-11 w-11 object-contain"} />
          </Link>
          {!collapsed && (
            <div>
              <h2 className="font-poppins text-3xl font-bold text-zinc-900 tracking-tight">
                ACUP
              </h2>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        className="flex-1 px-4 py-6 space-y-8"
        aria-label="Primary navigation">
        <div className="space-y-1">
          {!collapsed && (
            <p className="px-3 text-xs font-semibold text-zinc-600 uppercase tracking-wider mb-3">
              Menu
            </p>
          )}
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.label : undefined}
                className={
                  `group relative flex items-center ${collapsed ? "justify-center" : "gap-3"} rounded-xl ${collapsed ? "px-0 py-2.5" : "px-3 py-2.5"} text-sm font-medium transition-all duration-200 ` +
                  (isActive
                    ? "bg-blue-50 text-blue-900 border-l-4 border-blue-800"
                    : "text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900")
                }>
                <Icon
                  className={`h-4.5 w-4.5 ${isActive ? "text-blue-800" : "text-zinc-500 group-hover:text-zinc-600"}`}
                />
                {!collapsed && <span>{item.label}</span>}
                {!collapsed && item.href === "/incidents" && unresolvedIncidentCount > 0 ? (
                  <span className="ml-auto flex items-center gap-1.5">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
                    </span>
                    <span
                      className={`flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${isActive ? "bg-white text-red-700" : "bg-red-100 text-red-700"}`}>
                      {unresolvedIncidentCount > 99 ? "99+" : unresolvedIncidentCount}
                    </span>
                  </span>
                ) : null}
                {collapsed && item.href === "/incidents" && unresolvedIncidentCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                    {unresolvedIncidentCount > 99 ? "99+" : unresolvedIncidentCount}
                  </span>
                )}
              </Link>
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
          {collapsed ? <PanelLeftOpen className="h-4.5 w-4.5" /> : <PanelLeftClose className="h-4.5 w-4.5" />}
          {!collapsed && <span className="text-xs font-medium">Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
