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

  const pathname = request.nextUrl.pathname;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthRoute = pathname.startsWith("/login");
  const isCallbackRoute = pathname.startsWith("/api/auth/callback");
  const isChangePasswordRoute = pathname === "/change-password";
  const isApiRoute = pathname.startsWith("/api/");
  const isTrainingLegalRoute =
    pathname === "/training/privacy-policy"
    || pathname === "/training/terms-and-conditions";
  const isPublicTrainingPageRoute =
    /^\/training\/[^/]+$/.test(pathname)
    && !pathname.startsWith("/training/modules")
    && !isTrainingLegalRoute;
  const isPublicTrainingApiRoute = /^\/api\/training\/public\/[^/]+$/.test(pathname);
  const isPublicRoute =
    isAuthRoute
    || isCallbackRoute
    || isTrainingLegalRoute
    || isPublicTrainingPageRoute
    || isPublicTrainingApiRoute;

  // redirect unauthenticated users to login
  if (!user && !isPublicRoute) {
    // return json for api routes so client-side fetch doesn't get an html redirect
    if (isApiRoute) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }
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

  if (user && !isPublicRoute) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("must_change_password, is_active")
      .eq("id", user.id)
      .single();

    if (profile && !profile.is_active) {
      await supabase.auth.signOut();
      if (isApiRoute) {
        return NextResponse.json(
          { error: "Account deactivated", code: "FORBIDDEN" },
          { status: 403 },
        );
      }

      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "account_inactive");
      return NextResponse.redirect(url);
    }

    if (!isApiRoute && !isChangePasswordRoute && profile?.must_change_password) {
      const url = request.nextUrl.clone();
      url.pathname = "/change-password";
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}
