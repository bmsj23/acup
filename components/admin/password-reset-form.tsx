"use client";

import { useState } from "react";
import { KeyRound, Loader2 } from "lucide-react";

type UserListItem = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
};

type PasswordResetFormProps = {
  setupCode: string;
  users: UserListItem[];
};

export default function PasswordResetForm({ setupCode, users }: PasswordResetFormProps) {
  const [selectedUserId, setSelectedUserId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const selectedUser = users.find((u) => u.id === selectedUserId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedUserId) {
      setError("Please select a user.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-admin-code": setupCode,
        },
        body: JSON.stringify({
          user_id: selectedUserId,
          new_password: newPassword,
        }),
      });

      const data = await response.json().catch(() => null) as { error?: string } | null;

      if (!response.ok) {
        setError(data?.error ?? "Failed to reset password.");
        setLoading(false);
        return;
      }

      setSuccess(
        `Password reset for ${selectedUser?.email ?? "user"}.\nThey will be required to change it on next login.`,
      );
      setNewPassword("");
      setSelectedUserId("");
    } catch {
      setError("Failed to reset password.");
    } finally {
      setLoading(false);
    }
  }

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
        <label className="mb-1.5 block text-sm font-medium text-zinc-900">User</label>
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10 hover:cursor-pointer">
          <option value="">Select a user</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email} {u.full_name ? `(${u.full_name})` : ""} — {u.role}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-medium text-zinc-900">New Password</label>
        <input
          type="text"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          placeholder="Enter new temporary password"
          className="block w-full rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3 text-sm text-zinc-900 outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-500/10"
          required
          minLength={6}
        />
        <p className="mt-1 text-xs text-zinc-400">Minimum 6 characters. User will be forced to change on next login.</p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full inline-flex justify-center items-center gap-2 rounded-lg bg-amber-600 px-4 py-3 text-sm font-semibold text-white hover:bg-amber-700 hover:cursor-pointer disabled:opacity-70 disabled:cursor-not-allowed">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
        {loading ? "Resetting..." : "Reset Password"}
      </button>
    </form>
  );
}