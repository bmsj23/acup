import LoginForm from "@/components/auth/login-form";
import {
  ShieldCheck,
  Lock,
  Inbox,
  BookOpenText,
  ActivitySquare,
  type LucideIcon,
} from "lucide-react";

export const metadata = {
  title: "ACUP - Sign In",
  description: "Secure Ancillary Centralization and Updates Platform - Sign In",
};

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-zinc-50 lg:grid lg:grid-cols-2">
      {/* Brand Side (Left on desktop) */}
      <div className="hidden lg:flex lg:flex-col lg:justify-between bg-[#1e293b] p-16 text-white relative overflow-hidden">
        {/* Decorative Circle */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-125 w-125 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <div className="relative z-10">
  
          <h1 className="mt-8 font-serif text-5xl font-bold leading-tight tracking-tight">
            Ancillary <br /> Centralization & <br /> Updates Platform
          </h1>
          <p className="mt-6 max-w-lg text-lg text-slate-300 leading-relaxed">
            Enterprise-grade coordination for hospital ancillary departments.
            Secure documentation, realtime updates, and verified readiness.
          </p>
        </div>
      </div>

      {/* Login Form Side (Right on desktop) */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24">
        <div className="w-full max-w-105 space-y-8">
          {/* Mobile header */}
          <div className="lg:hidden mb-8">
            <div className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-3 py-1.5 text-white shadow-sm">
              <ShieldCheck className="h-4 w-4" />
              <span className="text-xs font-bold tracking-wide">ACUP</span>
            </div>
            <h1 className="mt-6 font-serif text-3xl font-bold text-zinc-900">
              ACUP Platform
            </h1>
          </div>

          <div className="space-y-2">
            <h2 className="font-serif text-3xl font-semibold text-zinc-900">
              Welcome Back
            </h2>
            <p className="text-zinc-500">
              Please enter your credentials to access the workspace.
            </p>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-zinc-100">
            <LoginForm />
          </div>

          <div className="grid grid-cols-2 gap-4">
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureRow({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="group flex items-start gap-4 rounded-2xl border border-slate-700/50 bg-slate-800/20 p-4 transition-colors hover:bg-slate-800/40 hover:border-blue-500/30">
      <div className="rounded-xl bg-slate-700/50 p-3 text-blue-400 group-hover:text-blue-300 group-hover:bg-blue-600/20 transition-all">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="font-medium text-slate-100">{title}</p>
        <p className="mt-1 text-sm text-slate-400 leading-relaxed">{desc}</p>
      </div>
    </div>
  );
}
