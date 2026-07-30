// app/velkommen/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Førstegangs-opsætning. Fejl sendes tilbage til /velkommen?fejl=...
 * hvor de VISES – ingen tavse afvisninger.
 */
export async function foersteOpsaetning(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgName = String(formData.get("org_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (orgName.length < 2) redirect("/velkommen?fejl=firma");
  if (fullName.length < 2) redirect("/velkommen?fejl=navn");

  const admin = createAdminClient();

  const { data: existing } = await admin
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  const { data: nameTaken } = await admin
    .from("organizations")
    .select("id")
    .eq("name", orgName)
    .maybeSingle();

  if (nameTaken) redirect("/velkommen?fejl=firma_findes");

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !org) redirect("/velkommen?fejl=ukendt");

  const { error: memberError } = await admin.from("memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
    full_name: fullName,
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    redirect("/velkommen?fejl=ukendt");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
