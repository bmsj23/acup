"use client";

import { useState } from "react";
import { Loader2, UserPlus } from "lucide-react";
import Select from "@/components/ui/select";

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
        department_code: departments.find((d) => d.id === departmentId)?.code ?? undefined,
      }),
    });

    const data = await response.json().catch(() => null) as { error?: string; temp_password?: string } | null;

    if (!response.ok) {
      setError(data?.error ?? "Failed to create account.");
      setLoading(false);
      return;
    }

    const pw = data?.temp_password ?? "(not returned)";
    setSuccess(
      `Account created for ${email}.\nTemporary password: ${pw}\nPlease share this password securely. They will be required to change it on first login.`,
    );
    setEmail("");
    setFullName("");
    setRole("department_head");
    setDepartmentId("");
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
      {success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 whitespace-pre-line">
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
        <Select
          value={role}
          onChange={(val) => setRole(val as typeof role)}
          options={[
            { value: "department_head", label: "Department Head" },
            { value: "division_head", label: "Division Head" },
            { value: "avp", label: "AVP" },
          ]}
        />
      </div>

      {role === "department_head" ? (
        <div>
          <label className="mb-1.5 block text-sm font-medium text-zinc-900">Department</label>
          <Select
            value={departmentId}
            onChange={setDepartmentId}
            required
            placeholder="Select department"
            options={departments.map((d) => ({ value: d.id, label: d.name }))}
          />
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