import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TrainingPublicFooter from "@/components/training/training-public-footer";
import { APP_BRAND, buildBrandTitle } from "@/lib/constants/brand";

export const metadata = {
  title: buildBrandTitle("Training Privacy Policy"),
};

export default function TrainingPrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Return to {APP_BRAND.shortName}
        </Link>

        <section className="rounded-[2rem] border border-blue-100/80 bg-white/95 px-6 py-7 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Training legal
          </p>
          <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            Privacy policy
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-8 text-slate-600">
            <p>
              This public training page is provided by {APP_BRAND.legalOwner} through the {APP_BRAND.fullName}.
              It is intended only for authorized learning access via a direct shared link or QR code.
            </p>
            <p>
              The page may display training module titles, descriptions, and learning materials needed
              to complete departmental training. It is not intended to expose broader internal systems,
              user accounts, or unrelated training content.
            </p>
            <p>
              Access to training material through this page does not automatically mark compliance,
              attendance, or completion. Compliance is encoded separately by authorized department
              heads after completion has been verified offline or operationally.
            </p>
            <p>
              Users should not share links beyond authorized learners. If you believe you received
              this link in error, close the page and contact {APP_BRAND.legalOwner}.
            </p>
          </div>
        </section>

        <TrainingPublicFooter />
      </div>
    </main>
  );
}
