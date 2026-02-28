import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env } from "@/lib/env";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    env.supabaseUrl,
    env.supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = request.nextUrl.pathname.startsWith("/login");
  const isCallbackRoute = request.nextUrl.pathname.startsWith("/api/auth/callback");
  const isChangePasswordRoute = request.nextUrl.pathname === "/change-password";
  const isApiRoute = request.nextUrl.pathname.startsWith("/api/");
  const isPublicRoute = isAuthRoute || isCallbackRoute;

  // redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // redirect authenticated users away from login
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  // enforce first-login password change on html navigation routes only
  if (user && !isPublicRoute && !isApiRoute && !isChangePasswordRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password, is_active")
      .eq("id", user.id)
      .single();

    // sign out deactivated users
    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "account_inactive");
      return NextResponse.redirect(url);
    }

    if (profile?.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  // enforce is_active for api routes as well
  if (user && isApiRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_active")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      return NextResponse.json(
        { error: "Account deactivated", code: "FORBIDDEN" },
        { status: 403 },
      );
    }
  }

  return supabaseResponse;
}