import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AnnouncementsClient from "@/components/announcements/announcements-client";

export default async function AnnouncementsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <AnnouncementsClient />;
}