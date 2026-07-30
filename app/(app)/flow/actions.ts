// app/(app)/flow/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

/**
 * Opret nyt flowdiagram og hop direkte ind i det.
 * Skriver gennem RLS – org_id skal matche brugerens medlemskab,
 * ellers afviser databasen selv.
 */
export async function createDiagram(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    redirect("/flow?fejl=navn");
  }

  const supabase = createClient();
  const { data, error } = await supabase
    .from("flow_diagrams")
    .insert({ org_id: ctx.orgId, name })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique violation -> navnet findes allerede i org'en
    redirect(error.code === "23505" ? "/flow?fejl=findes" : "/flow?fejl=ukendt");
  }

  revalidatePath("/flow");
  redirect(`/flow/${data.id}`);
}

/**
 * Slet et diagram (og via cascade: alle trin, kanter og attributter).
 */
export async function deleteDiagram(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/flow");

  const supabase = createClient();
  await supabase.from("flow_diagrams").delete().eq("id", id);

  revalidatePath("/flow");
  redirect("/flow");
}
