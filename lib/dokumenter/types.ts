// lib/dokumenter/types.ts
// Typer der spejler supabase/migrations/013_dokumentstyring.sql 1:1.

export type DocumentKategori = {
  id: string;
  org_id: string | null; // null = delt kategori
  label: string;
  beskrivelse: string | null;
  sort_order: number;
  /** Hovedkapittel-nummer (1, 2, 3...) - null indtil sat */
  kapittel_nummer: number | null;
};

export type DokumentStatus =
  | "udkast"
  | "gaeldende"
  | "under_revision"
  | "udgaaet";

export const DOKUMENT_STATUS_LABELS: Record<DokumentStatus, string> = {
  udkast: "Udkast",
  gaeldende: "Gældende",
  under_revision: "Under revision",
  udgaaet: "Udgået",
};

export type Dokument = {
  id: string;
  org_id: string;
  kategori_id: string;
  titel: string;
  version: string;
  status: DokumentStatus;
  ansvarlig: string | null;
  beskrivelse: string | null;
  /** Reference til Supabase Storage - ubrugt indtil upload er bygget */
  fil_sti: string | null;
  /** Løbenummer INDEN FOR kategoriens kapittel - tildelt én gang, ændres aldrig */
  dokument_nummer: number | null;
  oprettet_dato: string | null;
  gennemgaaet_dato: string | null;
  udloeber_dato: string | null;
  created_at: string;
  updated_at: string;
};
