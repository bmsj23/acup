"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, FileText, LayoutDashboard, MessageSquare } from "lucide-react";
import type { UserRole } from "@/types/database";

type SidebarProps = {
  role: UserRole;
};

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const isElevatedRole = role === "avp" || role === "division_head";

  const navItems = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
    },
    {
      href: "/announcements",
      label: "Announcements",
      icon: Bell,
    },
    {
      href: "/documents",
      label: "Documents",
      icon: FileText,
    },
    {
      href: "/messaging",
      label: "Messaging",
      icon: MessageSquare,
    },
  ];

  return (
    <aside className="w-full border-b border-zinc-200 bg-white md:min-h-screen md:w-72 md:border-b-0 md:border-r">
      <div className="p-6">
        <h2 className="font-serif text-xl font-semibold text-zinc-900">ACUP</h2>
        <p className="mt-1 text-sm text-zinc-600">Ancillary Operations</p>
      </div>

      <nav className="px-4 pb-6" aria-label="Primary navigation">
        <ul className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={
                    isActive
                      ? "flex items-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
                      : "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-100 hover:text-zinc-900 hover:cursor-pointer"
                  }
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-6 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700">
          <p className="font-medium text-zinc-900">Role Scope</p>
          {isElevatedRole ? (
            <p className="mt-1">Management modules will be enabled in Phase 4.</p>
          ) : (
            <p className="mt-1">Department workspace modules will be enabled in Phase 4.</p>
          )}
        </div>
      </nav>
    </aside>
  );
}