// app/velkommen/actions.ts
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Førstegangs-opsætning – helt gennem RLS.
 *
 * VIGTIGT mønster: vi genererer org-id'et SELV og indsætter uden
 * .select(). At læse rækken tilbage ville kræve select-policy
 * (medlemskab) som først findes EFTER næste skridt – hønen og ægget.
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

  const orgId = randomUUID();

  // 1. Organisation – ingen tilbagelæsning
  const { error: orgError } = await supabase
    .from("organizations")
    .insert({ id: orgId, name: orgName });

  if (orgError) {
    if (orgError.code === "23505") redirect("/velkommen?fejl=firma_findes");
    if (orgError.code === "42501") redirect("/velkommen?fejl=rettighed");
    redirect("/velkommen?fejl=ukendt");
  }

  // 2. Medlemskab som admin
  const { error: memberError } = await supabase.from("memberships").insert({
    org_id: orgId,
    user_id: user.id,
    role: "admin",
    full_name: fullName,
  });

  if (memberError) {
    redirect("/velkommen?fejl=ukendt");
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
