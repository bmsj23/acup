export default function ProtectedLoading() {
  return (
    <div className="w-full space-y-6 animate-breathe">
      <div className="h-24 rounded-lg border border-blue-100 bg-blue-50/70" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="h-28 rounded-lg border border-blue-100 bg-blue-50/70" />
        <div className="h-28 rounded-lg border border-blue-100 bg-blue-50/70" />
        <div className="h-28 rounded-lg border border-blue-100 bg-blue-50/70" />
        <div className="h-28 rounded-lg border border-blue-100 bg-blue-50/70" />
      </div>
      <div className="grid gap-4 xl:grid-cols-3">
        <div className="h-72 rounded-lg border border-blue-100 bg-blue-50/70 xl:col-span-2" />
        <div className="h-72 rounded-lg border border-blue-100 bg-blue-50/70" />
      </div>
    </div>
  );
}
