import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["department_head", "division_head", "avp"]),
  department_id: z.string().uuid().nullable().optional(),
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

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { email, full_name, role, department_id } = parsed.data;

  if (role === "department_head" && !department_id) {
    return NextResponse.json(
      { error: "department_id is required for department_head role" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();

  // create auth user — must_change_password defaults to true via migration 018
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: "Acup@2026!",
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create user" },
      { status: 500 },
    );
  }

  const userId = authData.user.id;

  // update profile with role and full name (handle_new_user trigger creates the row)
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role, full_name })
    .eq("id", userId);

  if (profileError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json({ error: "Failed to set user role" }, { status: 500 });
  }

  // assign department membership for department_head
  if (role === "department_head" && department_id) {
    const { error: membershipError } = await supabase
      .from("department_memberships")
      .insert({ user_id: userId, department_id });

    if (membershipError) {
      await supabase.auth.admin.deleteUser(userId);
      return NextResponse.json({ error: "Failed to assign department" }, { status: 500 });
    }
  }

  return NextResponse.json({ ok: true, user_id: userId }, { status: 201 });
}