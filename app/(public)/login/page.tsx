import LoginForm from "@/components/auth/login-form";
import { Shield, Lock, Inbox, BookOpenText } from "lucide-react";

export const metadata = {
  title: "ACUP - Sign In",
  description: "Secure Ancillary Centralization and Updates Platform - Sign In",
};

export default function LoginPage() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden lg:flex lg:w-1/2 bg-zinc-900 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur-sm mb-6">
              {/* <Shield className="w-8 h-8 text-white" strokeWidth={1.5} /> */}
            </div>
            <h1 className="text-3xl font-bold text-white mb-3">ACUP</h1>
            <p className="text-zinc-400 text-lg leading-relaxed">
              Ancillary Centralization and Updates Platform
            </p>
          </div>
          <div className="space-y-4 text-left">
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mt-0.5">
                <Lock className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  Enterprise Security
                </p>
                <p className="text-zinc-500 text-sm">
                  Zero-trust architecture with end-to-end encryption
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mt-0.5">
                <Inbox className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  Centralized Documents
                </p>
                <p className="text-zinc-500 text-sm">
                  Secure document sharing across Ancillary Departments
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="shrink-0 w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center mt-0.5">
                <BookOpenText className="w-4 h-4 text-zinc-400" />
              </div>
              <div>
                <p className="text-white text-sm font-medium">
                  Complete Audit Trail
                </p>
                <p className="text-zinc-500 text-sm">
                  Every action logged and traceable for compliance
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex w-full lg:w-1/2 items-center justify-center p-8">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8 text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-zinc-900 mb-4">
              <Shield className="w-6 h-6 text-white" strokeWidth={1.5} />
            </div>
            <h1 className="text-xl font-bold text-zinc-900 dark:text-white">
              ACUP
            </h1>
          </div>

          <div className="mb-8">
            <h2 className="text-2xl font-bold text-zinc-900 dark:text-white">
              Sign in
            </h2>
            <p className="text-zinc-500 dark:text-zinc-400 mt-2">
              Enter your credentials to access the platform
            </p>
          </div>

          <LoginForm />
        </div>
      </div>
    </div>
  );
}
