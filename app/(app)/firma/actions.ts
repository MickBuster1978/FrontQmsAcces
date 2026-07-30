// app/(app)/firma/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

const STANDARDER = [
  "IFS Food 8",
  "BRC Issue 9",
  "FSSC 22000 v6",
  "ISO 22000:2018",
  "Egenkontrol (Fødevarestyrelsen)",
];

/**
 * Gem virksomhedsprofilen. Skriver gennem RLS:
 * kun admin i org'en kan opdatere – databasen afviser alle andre.
 */
export async function gemFirmaProfil(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const navn = String(formData.get("name") ?? "").trim();
  if (navn.length < 2) redirect("/firma?fejl=navn");

  const standard = String(formData.get("standard") ?? "");
  if (!STANDARDER.includes(standard)) redirect("/firma?fejl=standard");

  const antalRaw = String(formData.get("antal_ansatte") ?? "").trim();
  const antal = antalRaw === "" ? null : Number.parseInt(antalRaw, 10);
  if (antal !== null && (Number.isNaN(antal) || antal < 0)) {
    redirect("/firma?fejl=antal");
  }

  const felt = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };

  const supabase = createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      name: navn,
      cvr: felt("cvr"),
      autorisationsnr: felt("autorisationsnr"),
      adresse: felt("adresse"),
      postnr: felt("postnr"),
      bynavn: felt("bynavn"),
      telefon: felt("telefon"),
      email: felt("email"),
      kontaktperson: felt("kontaktperson"),
      aktiviteter: felt("aktiviteter"),
      antal_ansatte: antal,
      standard,
    })
    .eq("id", ctx.orgId);

  if (error) {
    // 23505 = navnet er optaget af en anden virksomhed
    redirect(error.code === "23505" ? "/firma?fejl=navn_findes" : "/firma?fejl=ukendt");
  }

  revalidatePath("/", "layout");
  redirect("/firma?gemt=1");
}
