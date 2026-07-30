// app/auth/signout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Log ud server-side. Kaldes fra en almindelig <form method="post">,
 * så den virker overalt – også på sider uden client components.
 */
export async function POST(request: Request) {
  const supabase = createClient();
  await supabase.auth.signOut();

  return NextResponse.redirect(new URL("/login", request.url), {
    status: 302,
  });
}
