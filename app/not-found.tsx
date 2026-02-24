import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white">
      <h1 className="text-2xl font-bold text-zinc-900">Page Not Found</h1>
      <p className="text-sm text-zinc-500">The page you are looking for does not exist.</p>
      <Link
        href="/dashboard"
        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 hover:cursor-pointer"
      >
        Back to Dashboard
      </Link>
    </div>
  );
}