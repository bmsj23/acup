import LoginForm from "@/components/auth/login-form";
import { Inter } from "next/font/google";
import Image from "next/image";

export const metadata = {
  title: "ACUP - Sign In",
  description: "Ancillary Communication and Updates Platform - Sign In",
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
            <h1 className="mt-6 font-poppins text-3xl font-bold text-zinc-900">
              ACUP Platform
            </h1>
          </div>

          <div className="bg-white p-8 rounded-2xl shadow-[0_2px_20px_-4px_rgba(0,0,0,0.05)] border border-zinc-100">
            <div className="text-center mb-6">
              <h2 className="font-poppins text-2xl font-semibold text-zinc-900">
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

        <Image
          src="/assets/mediatrixcenter.jpg"
          alt="Building background"
          fill
          className="object-cover object-center pointer-events-none"
          aria-hidden
          priority
        />

        <div className="absolute inset-0 bg-linear-to-b from-[#18181b]/80 via-[#27272a]/60 to-[#18181b]/80 pointer-events-none" />

        <div className="absolute top-0 right-0 -mr-20 -mt-20 h-125 w-125 rounded-full bg-blue-600/10 blur-3xl pointer-events-none" />

        <Image
          src="/assets/logo.png"
          alt="Ancillary logo"
          width={200}
          height={200}
          className="absolute top-55 left-1/2 -translate-x-1/2 h-50 w-auto z-30"
        />

        <div className="relative z-10 text-center space-y-4 pt-55">
          <h1 className={`${inter.className} text-5xl font-bold leading-tight tracking-tight text-white`}>
            Ancillary Communication & <br /> Updates Platform <br />
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
