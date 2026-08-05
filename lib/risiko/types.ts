// lib/risiko/types.ts
// Typer der spejler supabase/migrations/007_risikoanalyse.sql + 018.

export type FareKategori = "biologisk" | "kemisk" | "fysisk" | "allergener";

export const FARE_KATEGORI_LABELS: Record<FareKategori, string> = {
  biologisk: "Biologisk",
  kemisk: "Kemisk",
  fysisk: "Fysisk",
  allergener: "Allergener",
};

export type HazardDefinition = {
  id: string;
  category: FareKategori;
  label: string;
  description: string | null;
  applies_to_step_types: string[]; // tomt array = gælder alle typer
  requires_product_open: boolean | null;
  requires_person_contact: boolean | null;
  default_sandsynlighed: number;
  default_konsekvens: number;
  standard_ref: string | null;
  sort_order: number;
};

export type HazardStatus = "forslag" | "bekraeftet" | "afvist";

export const HAZARD_STATUS_LABELS: Record<HazardStatus, string> = {
  forslag: "Forslag",
  bekraeftet: "Bekræftet",
  afvist: "Afvist",
};

export type StepHazard = {
  id: string;
  step_id: string;
  org_id: string;
  hazard_def_id: string | null;
  category: FareKategori;
  label: string;
  description: string | null;
  sandsynlighed: number;
  konsekvens: number;
  risikoscore: number; // generated: sandsynlighed × konsekvens
  er_ccp: boolean;
  er_oprp: boolean;
  /** Den konkrete kontrol der styrer faren (fx "Metaldetektor ved pakkelinje") */
  kontrolforanstaltning: string | null;
  status: HazardStatus;
  created_at: string;
  updated_at: string;
};

/**
 * Regler der er relevante for et givent trin, ud fra type + fakta.
 * En regel matcher hvis trin-typen passer (eller reglen gælder alle typer)
 * OG de eventuelle betingelser på åbent produkt/personkontakt er opfyldt.
 */
export function definitionsForStep(
  defs: HazardDefinition[],
  stepType: string,
  productOpen: boolean,
  personContact: boolean
): HazardDefinition[] {
  return defs
    .filter((d) => {
      const typeMatch =
        d.applies_to_step_types.length === 0 ||
        d.applies_to_step_types.includes(stepType);
      if (!typeMatch) return false;

      if (
        d.requires_product_open !== null &&
        d.requires_product_open !== productOpen
      ) {
        return false;
      }
      if (
        d.requires_person_contact !== null &&
        d.requires_person_contact !== personContact
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Tone til risikoscore (sandsynlighed × konsekvens, 1-3 skala hver = 1-9) */
export function risikoTone(score: number): "ok" | "warn" | "bad" {
  if (score >= 6) return "bad";
  if (score >= 3) return "warn";
  return "ok";
}
