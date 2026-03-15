import Link from "next/link";
import { APP_BRAND } from "@/lib/constants/brand";

export default function TrainingPublicFooter() {
  return (
    <footer className="rounded-[1.5rem] border border-blue-100/80 bg-white/90 px-5 py-4 text-sm text-slate-600 shadow-[0_20px_44px_-34px_rgba(30,64,175,0.16)]">
      <p className="leading-7">
        Training content on this page is owned by {APP_BRAND.legalOwner} and is provided only for
        authorized learning access via shared or QR-generated links. Viewing this page does not
        record compliance completion.
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm font-medium text-blue-800">
        <Link href="/training/privacy-policy" className="hover:underline">
          Privacy policy
        </Link>
        <span className="text-slate-300">/</span>
        <Link href="/training/terms-and-conditions" className="hover:underline">
          Terms and conditions
        </Link>
      </div>
    </footer>
  );
}
