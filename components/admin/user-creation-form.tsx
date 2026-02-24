"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";

type Department = { id: string; name: string; code: string };

type UserCreationFormProps = {
  setupCode: string;
  departments: Department[];
};

export default function UserCreationForm({ setupCode, departments }: UserCreationFormProps) {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState<"department_head" | "division_head" | "avp">("department_head");
  const [departmentId, setDepartmentId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (role === "department_head" && !departmentId) {
      setError("Department is required for department heads.");
      return;
    }

    setLoading(true);

    const response = await fetch("/api/admin/users", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-admin-code": setupCode,
      },
      body: JSON.stringify({
        email,
        full_name: fullName,
        role,
        department_id: departmentId || null,
      }),
    });

    const data = await response.json().catch(() => null) as { error?: string } | null;

    if (!response.ok) {
      setError(data?.error ?? "Failed to create account.");
      setLoading(false);
      return;
    }

    setSuccess(`Account created for ${email}. They will be prompted to set their own password on first login.`);
    setEmail("");
    setFullName("");
    setRole("department_head");
    setDepartmentId("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
          {success}
        </div>
      ) : null}
      {error ? (
        <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      ) : null}

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-900">Full Name</label>
        <input
          type="text"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          placeholder="e.g. Maria Santos"
          className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-900">Email Address</label>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="user@hospital.org"
          className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
        />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-900">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as typeof role)}
          className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
        >
          <option value="department_head">Department Head</option>
          <option value="division_head">Division Head</option>
          <option value="avp">AVP</option>
        </select>
      </div>

      {role === "department_head" ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-900">Department</label>
          <select
            value={departmentId}
            onChange={(e) => setDepartmentId(e.target.value)}
            required
            className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer"
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
      ) : null}

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 hover:cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
        {loading ? "Creating..." : "Create Account"}
      </button>
    </form>
  );
}