// app/(app)/dokumenter/actions.ts
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";

function tekst(formData: FormData, key: string): string | null {
  const v = String(formData.get(key) ?? "").trim();
  return v === "" ? null : v;
}

/**
 * Næste løbenummer INDEN FOR et kapittel (kategori). Tildeles én gang
 * ved oprettelse og må aldrig genberegnes for eksisterende dokumenter -
 * ellers skifter et dokuments nummer bare fordi et andet slettes.
 */
async function naesteDokumentNummer(
  supabase: ReturnType<typeof createClient>,
  kategoriId: string
): Promise<number> {
  const { data } = await supabase
    .from("dokumenter")
    .select("dokument_nummer")
    .eq("kategori_id", kategoriId)
    .order("dokument_nummer", { ascending: false })
    .limit(1)
    .maybeSingle();

  return (data?.dokument_nummer ?? 0) + 1;
}

/**
 * Opret et dokument, med valgfri fil-upload til Storage.
 * Stien bliver {org_id}/{dokument_id}/{filnavn} - det er den struktur
 * storage-adgangsreglerne fra migration 014 tjekker imod.
 */
export async function uploadDokument(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const kategoriId = String(formData.get("kategori_id") ?? "");
  const titel = String(formData.get("titel") ?? "").trim();

  if (!kategoriId) redirect("/dokumenter");
  if (titel.length < 2) {
    redirect(`/dokumenter/${kategoriId}?fejl=titel`);
  }

  const supabase = createClient();
  const dokumentId = randomUUID();

  let filSti: string | null = null;
  const file = formData.get("fil");
  if (file instanceof File && file.size > 0) {
    const path = `${ctx.orgId}/${dokumentId}/${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from("dokumenter")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      redirect(`/dokumenter/${kategoriId}?fejl=upload`);
    }
    filSti = path;
  }

  const dokumentNummer = await naesteDokumentNummer(supabase, kategoriId);

  const { error } = await supabase.from("dokumenter").insert({
    id: dokumentId,
    org_id: ctx.orgId,
    kategori_id: kategoriId,
    titel,
    version: tekst(formData, "version") ?? "1.0",
    status: tekst(formData, "status") ?? "udkast",
    ansvarlig: tekst(formData, "ansvarlig"),
    beskrivelse: tekst(formData, "beskrivelse"),
    fil_sti: filSti,
    dokument_nummer: dokumentNummer,
    oprettet_dato: tekst(formData, "oprettet_dato"),
    gennemgaaet_dato: tekst(formData, "gennemgaaet_dato"),
    udloeber_dato: tekst(formData, "udloeber_dato"),
    ccp_oprp_type: tekst(formData, "ccp_oprp_type"),
  });

  if (error) {
    redirect(`/dokumenter/${kategoriId}?fejl=gem`);
  }

  revalidatePath(`/dokumenter/${kategoriId}`);
  revalidatePath("/dokumenter");
  redirect(`/dokumenter/${kategoriId}`);
}

/**
 * Slet et dokument – fjerner filen fra Storage (hvis der er en) og rækken */
export async function sletDokument(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const dokumentId = String(formData.get("dokument_id") ?? "");
  const kategoriId = String(formData.get("kategori_id") ?? "");
  const filSti = String(formData.get("fil_sti") ?? "");
  if (!dokumentId || !kategoriId) redirect("/dokumenter");

  const supabase = createClient();

  if (filSti) {
    await supabase.storage.from("dokumenter").remove([filSti]);
  }
  await supabase.from("dokumenter").delete().eq("id", dokumentId);

  revalidatePath(`/dokumenter/${kategoriId}`);
  revalidatePath("/dokumenter");
  redirect(`/dokumenter/${kategoriId}`);
}

/**
 * Registrer (eller opdatér) et flowdiagram som dokument. Titel,
 * version og styringsdatoer kopieres direkte fra diagrammet - de er
 * allerede sat via "Gem diagram" på selve flow-siden, så de skal
 * ikke tastes ind igen. Er diagrammet allerede registreret, opdateres
 * den eksisterende række i stedet for at oprette en ny (så gentagne
 * klik ikke skaber dubletter, kun opdaterer).
 */
export async function registrerDiagramSomDokument(formData: FormData) {
  const ctx = await getOrgContext();
  if (!ctx || !ctx.orgId) redirect("/login");

  const diagramId = String(formData.get("diagram_id") ?? "");
  const kategoriId = String(formData.get("kategori_id") ?? "");
  if (!diagramId) redirect("/flow");
  if (!kategoriId) redirect(`/flow/${diagramId}?fejl=kategori`);

  const supabase = createClient();

  const { data: diagram } = await supabase
    .from("flow_diagrams")
    .select("*")
    .eq("id", diagramId)
    .maybeSingle();

  if (!diagram) redirect(`/flow/${diagramId}`);

  const { data: eksisterende } = await supabase
    .from("dokumenter")
    .select("id")
    .eq("diagram_id", diagramId)
    .maybeSingle();

  const felter = {
    org_id: ctx.orgId,
    kategori_id: kategoriId,
    titel: diagram.name,
    version: `${diagram.version ?? 1}.${diagram.version_minor ?? 0}`,
    status: "gaeldende" as const,
    diagram_id: diagramId,
    oprettet_dato: diagram.oprettet_dato,
    gennemgaaet_dato: diagram.verificeret_dato,
    udloeber_dato: diagram.fornyelse_dato,
  };

  if (eksisterende) {
    // Opdatering - dokument_nummer røres ikke, det er allerede tildelt
    await supabase.from("dokumenter").update(felter).eq("id", eksisterende.id);
  } else {
    const dokumentNummer = await naesteDokumentNummer(supabase, kategoriId);
    await supabase
      .from("dokumenter")
      .insert({ ...felter, dokument_nummer: dokumentNummer });
  }

  revalidatePath(`/flow/${diagramId}`);
  revalidatePath("/dokumenter");
  revalidatePath(`/dokumenter/${kategoriId}`);
  redirect(`/flow/${diagramId}`);
}
