// app/(app)/risiko/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

/**
 * Gem en fares vurdering. At redigere og gemme ER handlingen der
 * bekræfter den – status sættes altid til 'bekraeftet'.
 * Klassifikation er ét valg (ingen/ccp/oprp), ikke to uafhængige
 * afkrydsningsfelter - en fare er enten det ene eller det andet,
 * aldrig begge på samme tid.
 */
export async function updateHazard(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const hazardId = String(formData.get("hazard_id") ?? "");
  const diagramId = String(formData.get("diagram_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  if (!hazardId || !diagramId || !stepId) redirect("/risiko");

  const sandsynlighed = Math.min(
    3,
    Math.max(1, Number(formData.get("sandsynlighed") ?? 1))
  );
  const konsekvens = Math.min(
    3,
    Math.max(1, Number(formData.get("konsekvens") ?? 1))
  );
  const klassifikation = String(formData.get("klassifikation") ?? "prp");
  const erCcp = klassifikation === "ccp";
  const erOprp = klassifikation === "oprp";
  const kontrolforanstaltning =
    String(formData.get("kontrolforanstaltning") ?? "").trim() || null;

  const supabase = createClient();
  await supabase
    .from("step_hazards")
    .update({
      sandsynlighed,
      konsekvens,
      er_ccp: erCcp,
      er_oprp: erOprp,
      kontrolforanstaltning,
      status: "bekraeftet",
      updated_at: new Date().toISOString(),
    })
    .eq("id", hazardId);

  revalidatePath(`/risiko/${diagramId}/${stepId}`);
  revalidatePath(`/risiko/${diagramId}`);
  redirect(`/risiko/${diagramId}/${stepId}`);
}

/** Afvis et forslag som ikke er relevant for dette trin */
export async function afvisHazard(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const hazardId = String(formData.get("hazard_id") ?? "");
  const diagramId = String(formData.get("diagram_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  if (!hazardId) redirect("/risiko");

  const supabase = createClient();
  await supabase
    .from("step_hazards")
    .update({ status: "afvist", updated_at: new Date().toISOString() })
    .eq("id", hazardId);

  revalidatePath(`/risiko/${diagramId}/${stepId}`);
  revalidatePath(`/risiko/${diagramId}`);
  redirect(`/risiko/${diagramId}/${stepId}`);
}

/**
 * Tilføj en fare der ikke kommer fra en regel. Klassifikation vælges
 * med det samme ved oprettelsen - ingen grund til at oprette først
 * og redigere bagefter, hvis man allerede ved om det er en CCP
 * eller oPRP.
 */
export async function tilfoejHazard(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const diagramId = String(formData.get("diagram_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  const category = String(formData.get("category") ?? "biologisk");
  const label = String(formData.get("label") ?? "").trim();
  const klassifikation = String(formData.get("klassifikation") ?? "prp");

  if (!stepId) redirect("/risiko");
  if (label.length < 2) {
    redirect(`/risiko/${diagramId}/${stepId}?fejl=navn`);
  }

  const supabase = createClient();
  await supabase.from("step_hazards").insert({
    step_id: stepId,
    org_id: ctx.orgId,
    hazard_def_id: null,
    category,
    label,
    sandsynlighed: 1,
    konsekvens: 1,
    er_ccp: klassifikation === "ccp",
    er_oprp: klassifikation === "oprp",
    status: "forslag",
  });

  revalidatePath(`/risiko/${diagramId}/${stepId}`);
  revalidatePath(`/risiko/${diagramId}`);
  redirect(`/risiko/${diagramId}/${stepId}`);
}

/** Slet en fare helt (fx en fejlagtigt tilføjet manuel fare) */
export async function sletHazard(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const hazardId = String(formData.get("hazard_id") ?? "");
  const diagramId = String(formData.get("diagram_id") ?? "");
  const stepId = String(formData.get("step_id") ?? "");
  if (!hazardId) redirect("/risiko");

  const supabase = createClient();
  await supabase.from("step_hazards").delete().eq("id", hazardId);

  revalidatePath(`/risiko/${diagramId}/${stepId}`);
  revalidatePath(`/risiko/${diagramId}`);
  redirect(`/risiko/${diagramId}/${stepId}`);
}
