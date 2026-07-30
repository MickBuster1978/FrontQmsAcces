// app/login/opret/actions.ts
"use server";

import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Opret konto + virksomhed i ét hug:
 * 1. Bruger oprettes bekræftet (ingen email-verifikation i MVP)
 * 2. Organisation oprettes
 * 3. Medlemskab som admin
 * Fejler trin 2 eller 3, ryddes der op, så intet halvt efterlades.
 */
export async function createAccount(formData: FormData) {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const orgName = String(formData.get("org_name") ?? "").trim();
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (fullName.length < 2) redirect("/login/opret?fejl=navn");
  if (orgName.length < 2) redirect("/login/opret?fejl=firma");
  if (!email.includes("@")) redirect("/login/opret?fejl=email");
  if (password.length < 8) redirect("/login/opret?fejl=kode");

  const admin = createAdminClient();

  // Findes organisationen allerede?
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("name", orgName)
    .maybeSingle();

  if (existingOrg) redirect("/login/opret?fejl=firma_findes");

  // 1. Bruger
  const { data: created, error: userError } =
    await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

  if (userError || !created?.user) {
    const findes =
      userError?.message?.toLowerCase().includes("already") ?? false;
    redirect(findes ? "/login/opret?fejl=email_findes" : "/login/opret?fejl=ukendt");
  }

  const userId = created.user.id;

  // 2. Organisation
  const { data: org, error: orgError } = await admin
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !org) {
    await admin.auth.admin.deleteUser(userId);
    redirect("/login/opret?fejl=ukendt");
  }

  // 3. Medlemskab
  const { error: memberError } = await admin.from("memberships").insert({
    org_id: org.id,
    user_id: userId,
    role: "admin",
    full_name: fullName,
  });

  if (memberError) {
    await admin.from("organizations").delete().eq("id", org.id);
    await admin.auth.admin.deleteUser(userId);
    redirect("/login/opret?fejl=ukendt");
  }

  redirect("/login?oprettet=1");
}
