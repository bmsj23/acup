import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().min(1),
  role: z.enum(["department_head", "division_head", "avp"]),
  department_id: z.string().uuid().nullable().optional(),
  department_code: z.string().optional(),
});

// build a role/department-based temp password like "acupavp", "acupphar"
function buildTempPassword(role: string, departmentCode?: string): string {
  const suffix =
    role === "avp"
      ? "avp"
      : role === "division_head"
        ? "director"
        : (departmentCode ?? "dept").toLowerCase();
  return `acup${suffix}`;
}

async function waitForProfile(
  supabase: ReturnType<typeof createAdminClient>,
  userId: string,
  maxAttempts = 10,
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const { data } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (data) return true;
    await new Promise((r) => setTimeout(r, 200));
  }
  return false;
}

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

  const { email, full_name, role, department_id, department_code } = parsed.data;

  if (role === "department_head" && !department_id) {
    return NextResponse.json(
      { error: "department_id is required for department_head role" },
      { status: 400 },
    );
  }

  const supabase = createAdminClient();
  const tempPassword = buildTempPassword(role, department_code ?? undefined);

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name, role },
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create user" },
      { status: 500 },
    );
  }

  const userId = authData.user.id;

  const profileExists = await waitForProfile(supabase, userId);
  if (!profileExists) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: "Profile row was not created in time. Please try again." },
      { status: 500 },
    );
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({ role, full_name, must_change_password: true })
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

  return NextResponse.json(
    { ok: true, user_id: userId, temp_password: tempPassword },
    { status: 201 },
  );
}