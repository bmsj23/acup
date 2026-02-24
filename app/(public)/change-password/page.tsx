import type { Metadata } from "next";
import ChangePasswordForm from "@/components/auth/change-password-form";

export const metadata: Metadata = {
  title: "Set Your Password",
};

export default function ChangePasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 font-serif text-2xl font-bold text-zinc-900">Set Your Password</h1>
        <p className="mb-6 text-sm text-zinc-500">
          This is your first login. Please set a new password before continuing.
        </p>
        <ChangePasswordForm />
      </div>
    </div>
  );
}