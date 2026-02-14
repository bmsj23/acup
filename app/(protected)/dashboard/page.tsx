import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import ServerActionsPanel from "@/components/dashboard/server-actions-panel";

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

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold mb-4">ACUP Dashboard</h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Welcome, {user.email}
        </p>
        <p className="text-sm text-zinc-500 dark:text-zinc-500 mt-2">
          Role: {profile?.role ?? "unknown"}
        </p>
      </div>
      <ServerActionsPanel />
    </div>
  );
}