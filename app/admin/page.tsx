import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import UserCreationForm from "@/components/admin/user-creation-form";

export const metadata: Metadata = { title: "Admin — User Setup" };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const validCode = process.env.ADMIN_SETUP_CODE;

  if (!code || !validCode || code !== validCode) {
    return <AdminCodeGate />;
  }

  const supabase = createAdminClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name, code")
    .eq("is_active", true)
    .order("name");

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <div className="mb-8">
        <h1 className="font-poppins text-2xl font-bold text-zinc-900">User Account Setup</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create platform accounts for department staff. Each account will require a password change on first login.
        </p>
      </div>
      <UserCreationForm setupCode={code} departments={departments ?? []} />
    </div>
  );
}

function AdminCodeGate() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 font-poppins text-xl font-bold text-zinc-900">Admin Access</h1>
        <p className="mb-6 text-sm text-zinc-500">Enter the administrator setup code to continue.</p>
        <form method="get" action="/admin" className="space-y-4">
          <input
            name="code"
            type="password"
            placeholder="Setup code"
            className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
            required
          />
          <button
            type="submit"
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 hover:cursor-pointer"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}