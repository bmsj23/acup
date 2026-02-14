import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import MessagingClient from "@/components/messaging/messaging-client";

export default async function MessagingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <MessagingClient />;
}