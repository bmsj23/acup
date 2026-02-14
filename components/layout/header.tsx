"use client";

import Breadcrumb from "@/components/layout/breadcrumb";
import { usePathname } from "next/navigation";

type HeaderProps = {
  fullName: string;
  email: string;
  roleLabel: string;
};

export default function Header({ fullName, email, roleLabel }: HeaderProps) {
  const pathname = usePathname();

  let activeRoute = {
    title: "ACUP Workspace",
    crumb: "Workspace",
  };

  if (pathname === "/dashboard") {
    activeRoute = { title: "Operations Dashboard", crumb: "Dashboard" };
  } else if (pathname === "/announcements") {
    activeRoute = { title: "Announcements Center", crumb: "Announcements" };
  } else if (pathname === "/documents") {
    activeRoute = { title: "Document Workspace", crumb: "Documents" };
  } else if (pathname === "/messaging") {
    activeRoute = { title: "Central Messaging", crumb: "Messaging" };
  }

  return (
    <header className="border-b border-zinc-200 bg-white px-6 py-4 lg:px-8">
      <div className="flex flex-col gap-3">
        <Breadcrumb items={[{ label: "Protected" }, { label: activeRoute.crumb }]} />
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="font-serif text-2xl font-semibold text-zinc-900">
              {activeRoute.title}
            </h1>
            <p className="text-sm text-zinc-600">Role: {roleLabel}</p>
          </div>
          <div className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-700">
            <p className="font-medium text-zinc-900">{fullName}</p>
            <p>{email}</p>
          </div>
        </div>
      </div>
    </header>
  );
}