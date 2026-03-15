import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import TrainingPublicFooter from "@/components/training/training-public-footer";
import { APP_BRAND, buildBrandTitle } from "@/lib/constants/brand";
import { getSafeTrainingReturnPath } from "@/lib/utils/training-public";

export const metadata = {
  title: buildBrandTitle("Training Terms and Conditions"),
};

type PageProps = {
  searchParams: Promise<{ return_to?: string | string[] }>;
};

export default async function TrainingTermsPage({ searchParams }: PageProps) {
  const { return_to: returnToParam } = await searchParams;
  const returnTo = getSafeTrainingReturnPath(returnToParam);

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#eff6ff_0%,#f8fafc_42%,#ffffff_100%)] px-4 py-8 text-slate-900">
      <div className="mx-auto max-w-4xl space-y-6">
        {returnTo ? (
          <Link
            href={returnTo}
            className="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/80 px-4 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:text-slate-900"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to training material
          </Link>
        ) : null}

        <section className="rounded-[2rem] border border-blue-100/80 bg-white/95 px-6 py-7 shadow-[0_32px_90px_-48px_rgba(30,64,175,0.16)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-slate-500">
            Training legal
          </p>
          <h1 className="mt-3 text-[clamp(2rem,4.5vw,3rem)] font-semibold text-slate-950 [font-family:var(--font-playfair)]">
            Terms and conditions
          </h1>
          <div className="mt-5 space-y-4 text-sm leading-8 text-slate-600">
            <p>
              Training materials accessed through this public route remain the property of {APP_BRAND.legalOwner}.
              The link is provided only for authorized learning access associated with a published
              training module.
            </p>
            <p>
              You may view or download the material solely for internal learning, orientation, and
              operational readiness purposes authorized by {APP_BRAND.legalOwner}. Redistribution,
              public reposting, or reuse outside authorized hospital learning workflows is not allowed.
            </p>
            <p>
              This page does not provide access to additional modules, administrative tools, or
              protected workspaces. Attempts to use the link for unauthorized access are prohibited.
            </p>
            <p>
              {APP_BRAND.legalOwner} may remove or rotate access at any time, especially when a module
              is unpublished, replaced, or no longer intended for active use.
            </p>
          </div>
        </section>

        <TrainingPublicFooter returnTo={returnTo} />
      </div>
    </main>
  );
}
