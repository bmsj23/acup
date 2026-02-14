import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServerActionsPanel from "@/components/dashboard/server-actions-panel";
import { ROLES } from "@/lib/constants/roles";
import {
  Activity,
  Bell,
  ChartColumn,
  FileText,
  MessageSquare,
  ShieldCheck,
  Users,
} from "lucide-react";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  let roleSummary = null;

  if (profile?.role === "avp") {
    roleSummary = ROLES.avp;
  } else if (profile?.role === "division_head") {
    roleSummary = ROLES.division_head;
  } else if (profile?.role === "department_head") {
    roleSummary = ROLES.department_head;
  }

  const trendData = [58, 71, 63, 82, 76, 88, 93];
  const distributionData = [
    { label: "Operational Memos", value: 42 },
    { label: "Clinical Updates", value: 31 },
    { label: "Department Reports", value: 19 },
    { label: "Urgent Advisories", value: 8 },
  ];

  const messagingChannels = [
    {
      title: "Hospital-wide Broadcasts",
      description: "Executive announcements and policy directives.",
      unread: 2,
    },
    {
      title: "Department Coordination",
      description: "Cross-department operations and scheduling updates.",
      unread: 5,
    },
    {
      title: "Compliance Messaging",
      description: "Audit readiness notices and control confirmations.",
      unread: 1,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6">
      <div className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-sm text-zinc-600">Signed in as</p>
            <p className="text-base font-medium text-zinc-900">{user.email}</p>
            <p className="mt-2 text-sm text-zinc-700">
              {roleSummary?.description ?? "Role not available"}
            </p>
          </div>
          <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
            <ShieldCheck className="h-4 w-4" />
            Security monitoring active
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between text-zinc-600">
            <p className="text-sm">Active Users</p>
            <Users className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">124</p>
          <p className="mt-1 text-xs text-zinc-500">Across ancillary operations</p>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between text-zinc-600">
            <p className="text-sm">Documents Today</p>
            <FileText className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">38</p>
          <p className="mt-1 text-xs text-zinc-500">Validated and access-controlled</p>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between text-zinc-600">
            <p className="text-sm">Unread Alerts</p>
            <Bell className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">8</p>
          <p className="mt-1 text-xs text-zinc-500">Policy and workflow notifications</p>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-4">
          <div className="flex items-center justify-between text-zinc-600">
            <p className="text-sm">Completion Rate</p>
            <Activity className="h-4 w-4" />
          </div>
          <p className="mt-3 text-2xl font-semibold text-zinc-900">93%</p>
          <p className="mt-1 text-xs text-zinc-500">Weekly operational closure</p>
        </article>
      </section>

      <section className="grid gap-4 xl:grid-cols-3">
        <article className="rounded-lg border border-zinc-200 bg-white p-5 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-zinc-900">Operational Trend</h2>
            <span className="inline-flex items-center gap-1 rounded-md bg-zinc-100 px-2 py-1 text-xs text-zinc-700">
              <ChartColumn className="h-3.5 w-3.5" /> Last 7 days
            </span>
          </div>
          <div className="flex h-56 items-end gap-3 rounded-md border border-zinc-100 bg-zinc-50 p-4">
            {trendData.map((value, index) => (
              <div key={`trend-${index}`} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-sm bg-blue-600"
                  style={{ height: `${value}%` }}
                  aria-label={`day ${index + 1} value ${value}`}
                />
                <span className="text-[10px] text-zinc-500">D{index + 1}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="rounded-lg border border-zinc-200 bg-white p-5">
          <h2 className="font-serif text-xl font-semibold text-zinc-900">Document Mix</h2>
          <div className="mt-4 space-y-3">
            {distributionData.map((item) => (
              <div key={item.label}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-xs text-zinc-700">{item.label}</p>
                  <p className="text-xs font-medium text-zinc-900">{item.value}%</p>
                </div>
                <div className="h-2 rounded-full bg-zinc-100">
                  <div
                    className="h-2 rounded-full bg-blue-600"
                    style={{ width: `${item.value}%` }}
                    aria-label={`${item.label} ${item.value} percent`}
                  />
                </div>
              </div>
            ))}
          </div>
        </article>
      </section>

      <section className="rounded-lg border border-zinc-200 bg-white p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-serif text-xl font-semibold text-zinc-900">Central Messaging Hub</h2>
            <p className="mt-1 text-sm text-zinc-600">
              Unified announcements, department coordination, and compliance communication.
            </p>
          </div>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-md border border-blue-600 bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
          >
            <MessageSquare className="h-4 w-4" /> Compose message
          </button>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          {messagingChannels.map((channel) => (
            <article key={channel.title} className="rounded-md border border-zinc-200 bg-zinc-50 p-4">
              <p className="text-sm font-semibold text-zinc-900">{channel.title}</p>
              <p className="mt-1 text-xs text-zinc-600">{channel.description}</p>
              <p className="mt-3 text-xs font-medium text-blue-700">{channel.unread} unread</p>
            </article>
          ))}
        </div>
      </section>

      <ServerActionsPanel />
    </div>
  );
}