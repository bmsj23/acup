import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const resetPasswordSchema = z.object({
  user_id: z.string().uuid(),
  new_password: z.string().min(6, "Password must be at least 6 characters"),
});

export async function POST(request: Request) {
  const adminCode = request.headers.get("x-admin-code");
  const validCode = process.env.ADMIN_SETUP_CODE;

  if (!adminCode || !validCode || adminCode !== validCode) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { user_id, new_password } = parsed.data;
  const supabase = createAdminClient();

  // verify the user exists
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, role")
    .eq("id", user_id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // reset the password via admin api
  const { error: authError } = await supabase.auth.admin.updateUserById(user_id, {
    password: new_password,
  });

  if (authError) {
    return NextResponse.json(
      { error: authError.message ?? "Failed to reset password" },
      { status: 500 },
    );
  }

  // set must_change_password so user is forced to change on next login
  await supabase
    .from("profiles")
    .update({ must_change_password: true })
    .eq("id", user_id);

  return NextResponse.json({ ok: true }, { status: 200 });
}