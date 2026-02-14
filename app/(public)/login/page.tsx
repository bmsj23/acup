import LoginForm from "@/components/auth/login-form";
import { ShieldCheck, Lock, Inbox, BookOpenText, ActivitySquare } from "lucide-react";

export const metadata = {
  title: "ACUP - Sign In",
  description: "Secure Ancillary Centralization and Updates Platform - Sign In",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-2">
      <div className="hidden lg:flex lg:flex-col lg:justify-between bg-blue-600 p-12 text-white">
        <div>
          <div className="inline-flex items-center gap-3 rounded-lg border border-white/20 bg-blue-700 px-4 py-2">
            <span className="text-sm font-medium tracking-wide">ACUP</span>
          </div>
          <h1 className="mt-8 font-serif text-4xl font-semibold leading-tight">
            Ancillary Centralization and Updates Platform
          </h1>
          <p className="mt-4 max-w-xl text-sm text-blue-100">
            A centralized healthcare operations platform for secure communication,
            compliance-grade documentation, and department-wide coordination.
          </p>
        </div>

        <div className="grid gap-4">
          <div className="rounded-lg border border-white/20 bg-blue-700/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-white/10 p-2">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Security-First Access</p>
                <p className="mt-1 text-xs text-blue-100">
                  Role-scoped access control and immutable audit evidence for every critical action.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-white/20 bg-blue-700/60 p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-white/10 p-2">
                <Inbox className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold">Centralized Operations</p>
                <p className="mt-1 text-xs text-blue-100">
                  Unified updates, document workflows, and readiness signals across 14 departments.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-md rounded-xl border border-zinc-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="mb-8 lg:hidden">
            <div className="inline-flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-blue-700">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-medium tracking-wide">ACUP</span>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="font-serif text-3xl font-semibold text-zinc-900">
              Welcome Back
            </h2>
            <p className="mt-2 text-sm text-zinc-600">
              Sign in to access secure documents, announcements, and cross-department operations.
            </p>
          </div>

          <LoginForm />

          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-zinc-100 pt-5">
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <div className="flex items-center gap-2 text-zinc-700">
                <BookOpenText className="h-4 w-4" />
                <span className="text-xs font-medium">Audit Ready</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Traceable access and activity records.</p>
            </div>
            <div className="rounded-md bg-zinc-50 px-3 py-2">
              <div className="flex items-center gap-2 text-zinc-700">
                <ActivitySquare className="h-4 w-4" />
                <span className="text-xs font-medium">Operational Visibility</span>
              </div>
              <p className="mt-1 text-xs text-zinc-500">Role-aware insights for decision making.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
