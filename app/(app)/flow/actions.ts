// app/(app)/flow/actions.ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { STEP_TYPES, type NodeShape, type StepType } from "@/lib/flow/types";

/**
 * Opret nyt flowdiagram og hop direkte ind i det.
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

/**
 * Opret et procestrin MED den fulde formular (bruges af den ældre
 * /nyt-trin-guide). Beholdt uændret.
 */
export async function createStep(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const diagramId = String(formData.get("diagram_id") ?? "");
  const stepType = String(formData.get("step_type") ?? "") as StepType;
  const name = String(formData.get("name") ?? "").trim();

  if (!diagramId) redirect("/flow");
  if (!STEP_TYPES.includes(stepType)) {
    redirect(`/flow/${diagramId}/nyt-trin?fejl=type`);
  }
  if (name.length < 2) {
    redirect(`/flow/${diagramId}/nyt-trin?type=${stepType}&fejl=navn`);
  }

  const tal = (key: string): number | null => {
    const v = String(formData.get(key) ?? "").trim().replace(",", ".");
    if (v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const tekst = (key: string): string | null => {
    const v = String(formData.get(key) ?? "").trim();
    return v === "" ? null : v;
  };

  const supabase = createClient();

  const { data: last } = await supabase
    .from("process_steps")
    .select("id, step_no")
    .eq("diagram_id", diagramId)
    .order("step_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stepNo = (last?.step_no ?? 0) + 1;

  const { data: step, error: stepError } = await supabase
    .from("process_steps")
    .insert({
      diagram_id: diagramId,
      org_id: ctx.orgId,
      step_no: stepNo,
      name,
      step_type: stepType,
      node_shape: "rektangel",
      location_zone: tekst("location_zone"),
      product_open: formData.get("product_open") === "on",
      person_contact: formData.get("person_contact") === "on",
      temp_target_c: tal("temp_target_c"),
      temp_tolerance_c: tal("temp_tolerance_c"),
      max_dwell_min: tal("max_dwell_min"),
      equipment: tekst("equipment"),
      responsible_role: tekst("responsible_role"),
      input_desc: tekst("input_desc"),
      output_desc: tekst("output_desc"),
      pos_x: 120,
      pos_y: 80 + stepNo * 140,
    })
    .select("id")
    .single();

  if (stepError || !step) {
    redirect(`/flow/${diagramId}/nyt-trin?type=${stepType}&fejl=ukendt`);
  }

  const { data: defs } = await supabase
    .from("attribute_definitions")
    .select("id, value_type")
    .contains("applies_to", [stepType]);

  const rows: {
    step_id: string;
    org_id: string;
    attr_id: string;
    value_text: string | null;
    value_num: number | null;
    value_bool: boolean | null;
  }[] = [];

  for (const def of defs ?? []) {
    const raw = formData.get(`attr_${def.id}`);
    if (raw === null) {
      if (def.value_type === "boolean") {
        rows.push({
          step_id: step.id,
          org_id: ctx.orgId,
          attr_id: def.id,
          value_text: null,
          value_num: null,
          value_bool: false,
        });
      }
      continue;
    }
    const v = String(raw).trim();
    if (def.value_type === "boolean") {
      rows.push({
        step_id: step.id,
        org_id: ctx.orgId,
        attr_id: def.id,
        value_text: null,
        value_num: null,
        value_bool: v === "on",
      });
    } else if (def.value_type === "number") {
      if (v === "") continue;
      const n = Number(v.replace(",", "."));
      if (Number.isNaN(n)) continue;
      rows.push({
        step_id: step.id,
        org_id: ctx.orgId,
        attr_id: def.id,
        value_text: null,
        value_num: n,
        value_bool: null,
      });
    } else {
      if (v === "") continue;
      rows.push({
        step_id: step.id,
        org_id: ctx.orgId,
        attr_id: def.id,
        value_text: v,
        value_num: null,
        value_bool: null,
      });
    }
  }

  if (rows.length > 0) {
    await supabase.from("step_attributes").insert(rows);
  }

  if (last?.id) {
    await supabase.from("process_edges").insert({
      diagram_id: diagramId,
      org_id: ctx.orgId,
      from_step: last.id,
      to_step: step.id,
    });
  }

  await supabase
    .from("flow_diagrams")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", diagramId);

  revalidatePath(`/flow/${diagramId}`);
  redirect(`/flow/${diagramId}`);
}

/**
 * Slet et trin. Kanter til/fra trinnet ryger via cascade.
 */
export async function deleteStep(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const stepId = String(formData.get("step_id") ?? "");
  const diagramId = String(formData.get("diagram_id") ?? "");
  if (!stepId || !diagramId) redirect("/flow");

  const supabase = createClient();
  await supabase.from("process_steps").delete().eq("id", stepId);

  await supabase
    .from("flow_diagrams")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", diagramId);

  revalidatePath(`/flow/${diagramId}`);
  redirect(`/flow/${diagramId}`);
}

// ============================================================
// CANVAS-ACTIONS – kaldes direkte fra klienten, ingen redirects
// ============================================================

/** Gem et trins position når det slippes efter træk */
export async function saveStepPosition(
  stepId: string,
  posX: number,
  posY: number
) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("process_steps")
    .update({ pos_x: posX, pos_y: posY })
    .eq("id", stepId);

  return { ok: !error };
}

/**
 * Opret et BART trin ved at slippe en formfigur fra paletten på et
 * tomt sted på canvas. Standardnavn afhænger af formen.
 */
export async function createStepQuick(
  diagramId: string,
  nodeShape: NodeShape,
  posX: number,
  posY: number
) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false as const };

  const supabase = createClient();

  const { data: last } = await supabase
    .from("process_steps")
    .select("step_no")
    .eq("diagram_id", diagramId)
    .order("step_no", { ascending: false })
    .limit(1)
    .maybeSingle();

  const stepNo = (last?.step_no ?? 0) + 1;

  const NAVNE: Record<NodeShape, string> = {
    cirkel: "Start",
    rektangel: "Nyt trin",
    kvadrat: "Input",
    rombe: "Output",
    trekant_oprp: "oPRP",
    trekant_ccp: "CCP",
  };

  const { data, error } = await supabase
    .from("process_steps")
    .insert({
      diagram_id: diagramId,
      org_id: ctx.orgId,
      step_no: stepNo,
      name: NAVNE[nodeShape],
      step_type: null,
      node_shape: nodeShape,
      pos_x: posX,
      pos_y: posY,
    })
    .select("id")
    .single();

  if (error || !data) return { ok: false as const };

  await supabase
    .from("flow_diagrams")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", diagramId);

  revalidatePath(`/flow/${diagramId}`);
  return { ok: true as const, stepId: data.id };
}

/** Omdøb et trin (kaldes ved blur på navnefeltet i boksen) */
export async function renameStep(
  stepId: string,
  diagramId: string,
  newName: string
) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false };

  const trimmed = newName.trim();
  if (trimmed.length === 0) return { ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("process_steps")
    .update({ name: trimmed })
    .eq("id", stepId);

  revalidatePath(`/flow/${diagramId}`);
  return { ok: !error };
}

/**
 * Kobl (eller frakobl) en CCP/oPRP-trekant til en bekræftet fare fra
 * risikomodulet. hazardId = null fjerner koblingen.
 */
export async function linkHazard(
  stepId: string,
  diagramId: string,
  hazardId: string | null
) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("process_steps")
    .update({ linked_hazard_id: hazardId })
    .eq("id", stepId);

  revalidatePath(`/flow/${diagramId}`);
  return { ok: !error };
}

/** Opret en kant ved at forbinde to trin på canvas */
export async function createEdge(
  diagramId: string,
  fromStep: string,
  toStep: string
) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false };
  if (fromStep === toStep) return { ok: false };

  const supabase = createClient();
  const { error } = await supabase.from("process_edges").insert({
    diagram_id: diagramId,
    org_id: ctx.orgId,
    from_step: fromStep,
    to_step: toStep,
  });

  await supabase
    .from("flow_diagrams")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", diagramId);

  revalidatePath(`/flow/${diagramId}`);
  return { ok: !error || error.code === "23505" };
}

/** Slet en kant (× på selve pilen, eller markér + Backspace) */
export async function deleteEdge(diagramId: string, edgeId: string) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) return { ok: false };

  const supabase = createClient();
  const { error } = await supabase
    .from("process_edges")
    .delete()
    .eq("id", edgeId);

  await supabase
    .from("flow_diagrams")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", diagramId);

  revalidatePath(`/flow/${diagramId}`);
  return { ok: !error };
}
