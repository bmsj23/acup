import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { isValidUuid } from "@/lib/data/auth";

type PageProps = {
  params: Promise<{ id: string }>;
};

export default async function AnnouncementDetailPage({ params }: PageProps) {
  const { id } = await params;

  if (!isValidUuid(id)) {
    notFound();
  }

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: announcement, error } = await supabase
    .from("announcements")
    .select("id, title, content, priority, is_system_wide, created_at, expires_at, memo_file_name")
    .eq("id", id)
    .single();

  if (error || !announcement) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <section className="rounded-lg border border-zinc-200 bg-white p-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs uppercase tracking-wide text-zinc-700">
            {announcement.priority}
          </span>
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
            {announcement.is_system_wide ? "System-wide" : "Department-scoped"}
          </span>
        </div>

        <h2 className="mt-3 font-serif text-3xl font-semibold text-zinc-900">{announcement.title}</h2>
        <p className="mt-2 text-xs text-zinc-500">
          Posted: {new Date(announcement.created_at).toLocaleString()}
        </p>

        {announcement.memo_file_name ? (
          <div className="mt-3 rounded-md border border-blue-200 bg-blue-50 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Memo Attachment</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <p className="text-sm text-blue-800">{announcement.memo_file_name}</p>
              <a
                href={`/api/announcements/${announcement.id}/memo`}
                className="inline-flex items-center rounded-md border border-blue-800 bg-white px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 hover:cursor-pointer"
              >
                Download Memo
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-5 rounded-md border border-zinc-200 bg-zinc-50 p-4">
          <p className="whitespace-pre-wrap text-sm text-zinc-700">{announcement.content}</p>
        </div>

        {announcement.expires_at ? (
          <p className="mt-3 text-xs text-zinc-500">
            Expires: {new Date(announcement.expires_at).toLocaleString()}
          </p>
        ) : null}
      </section>
    </div>
  );
}
