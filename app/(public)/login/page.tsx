import LoginForm from "@/components/auth/login-form";
import {
  ShieldCheck,
  Lock,
  Inbox,
  BookOpenText,
  ActivitySquare,
  type LucideIcon,
} from "lucide-react";
import { Inter } from "next/font/google";

export const metadata = {
  title: "ACUP - Sign In",
  description: "Secure Ancillary Centralization and Updates Platform - Sign In",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});

export default function LoginPage() {
  return (
    <div className="h-screen bg-zinc-50 lg:grid lg:grid-cols-2 overflow-hidden overscroll-none">
      {/* Login Form Side (Left on desktop) */}
      <div className="flex items-center justify-center p-6 sm:p-12 lg:p-24 h-full">
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

          <div className="bg-white p-8 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-zinc-100">
            <div className="text-center mb-6">
              <h2 className="font-serif text-2xl font-semibold text-zinc-900">
                Welcome Back
              </h2>
              <p className="text-sm text-zinc-500">
                Please enter your credentials to access the workspace.
              </p>
            </div>
            <LoginForm />
          </div>

          <div className="grid grid-cols-2 gap-4">
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:flex-col lg:justify-start lg:items-center bg-[#1e293b] p-6 sm:p-12 lg:p-24 lg:pt-55 text-white relative overflow-hidden h-full">
        
        <img
          src="/assets/mediatrixcenter.jpg"
          alt="Building background"
          className="absolute inset-0 h-full w-full object-cover object-center pointer-events-none"
          aria-hidden
        />

        <div className="absolute inset-0 bg-gradient-to-b from-[#18181b]/80 via-[#27272a]/60 to-[#18181b]/80 pointer-events-none" />

        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-125 w-125 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <img
          src="/assets/logo.png"
          alt="Ancillary logo"
          className="absolute top-55 left-1/2 -translate-x-1/2 h-50 w-auto z-30"
        />

        <div className="relative z-10 text-center space-y-4 pt-55">
          <h1 className={`${inter.className} text-5xl font-bold leading-tight tracking-tight text-white`}>
            Ancillary Centralization & <br /> Updates Platform <br />
          </h1>
          <p className="max-w-md text-base leading-relaxed text-white/90 text-center mx-auto mt-4">
            Enterprise-grade coordination for hospital ancillary departments.
            Secure documentation, realtime updates, and verified readiness.
          </p>
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
