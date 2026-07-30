// app/velkommen/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Førstegangs-opsætning – kører HELT gennem RLS, ingen service role.
 * Databasen håndhæver selv reglerne (migration 004):
 * - kun brugere uden medlemskab kan oprette en organisation
 * - man kan kun indmelde sig selv, kun som admin, kun første gang
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

  // 1. Organisation. Unikt navn håndhæves af databasen (23505),
  //    førstegangs-retten af RLS (fejlkode 42501).
  const { data: org, error: orgError } = await supabase
    .from("organizations")
    .insert({ name: orgName })
    .select("id")
    .single();

  if (orgError || !org) {
    if (orgError?.code === "23505") redirect("/velkommen?fejl=firma_findes");
    if (orgError?.code === "42501") redirect("/dashboard"); // har allerede medlemskab
    redirect("/velkommen?fejl=ukendt");
  }

  // 2. Medlemskab som admin
  const { error: memberError } = await supabase.from("memberships").insert({
    org_id: org.id,
    user_id: user.id,
    role: "admin",
    full_name: fullName,
  });

  if (memberError) {
    // Ryd op så org'en ikke står forældreløs (insert-policy uden medlemskab
    // tillader ikke sletning – men brugeren ejer den heller ikke endnu, så
    // vi lader unikke navne + support håndtere det sjældne tilfælde)
    redirect("/velkommen?fejl=ukendt");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
