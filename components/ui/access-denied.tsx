import Link from "next/link";
import { ShieldX } from "lucide-react";

type AccessDeniedProps = {
  message?: string;
  backHref?: string;
  backLabel?: string;
};

export default function AccessDenied({
  message = "You do not have permission to access this page.",
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
}: AccessDeniedProps) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
        <ShieldX className="h-7 w-7 text-red-600" />
      </div>
      <h2 className="text-lg font-semibold text-zinc-900">Access Denied</h2>
      <p className="max-w-sm text-center text-sm text-zinc-500">{message}</p>
      <Link
        href={backHref}
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
      >
        {backLabel}
      </Link>
    </div>
  );
}