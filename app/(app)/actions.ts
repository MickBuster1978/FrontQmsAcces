// app/(app)/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Førstegangs-opsætning.
 * Porten er brugeroprettelsen: kun brugere DU har oprettet i Supabase
 * kan logge ind – og kun brugere UDEN medlemskab kan køre denne.
 * Kunden udfylder selv sin virksomhed; resten kommer i Firma-modulet.
 */
export async function foersteOpsaetning(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgName = String(formData.get("org_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (orgName.length < 2) redirect("/dashboard?fejl=firma");
  if (fullName.length < 2) redirect("/dashboard?fejl=navn");

  const admin = createAdminClient();

  // Allerede medlem af en virksomhed? Så ingen ny.
  const { data: existing } = await admin
    .from("memberships")
    .select("org_id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) redirect("/dashboard");

  // Navnekollision på tværs af kunder
  const { data: nameTaken } = await admin
    .from("organizations")
    .select("id")
    .eq("name", orgName)
    .maybeSingle();

  if (nameTaken) redirect("/dashboard?fejl=firma_findes");

  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !org) redirect("/dashboard?fejl=ukendt");

  const { error: memberError } = await admin.from("memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
    full_name: fullName,
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    redirect("/dashboard?fejl=ukendt");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
