"use client";

import { useSidebar } from "@/components/providers/sidebar-provider";

export default function SidebarContentWrapper({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();

  return (
    <div className={`flex min-h-screen w-full flex-col transition-all duration-300 ${collapsed ? "md:pl-16" : "md:pl-72"} md:pr-6`}>
      {children}
    </div>
  );
}