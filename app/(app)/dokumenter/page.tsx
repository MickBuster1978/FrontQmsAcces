// app/(app)/dokumenter/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { DocumentKategori, Dokument } from "@/lib/dokumenter/types";

// CCP/oPRP genbruger farvesproget fra flow-modulet for genkendelighed.
// Resten cykler gennem en blød palet - kategorien behøver ikke selv
// bære betydning i farven.
const KORT_FARVE_OVERSTYRING: Record<string, string> = {
  ccp_oprp: "#F4E2CE",
};
const PALET = ["#DCE6F0", "#DCEEE3", "#F3EEE3", "#EAE0F0", "#F0DCE6"];

export default async function DokumenterOversigtPage() {
  const supabase = createClient();

  const [{ data: kategorier }, { data: dokumenter }] = await Promise.all([
    supabase.from("document_kategorier").select("*").order("sort_order"),
    supabase.from("dokumenter").select("id, kategori_id, status"),
  ]);

  const kategoriList = (kategorier ?? []) as DocumentKategori[];
  const dokumentList = (dokumenter ?? []) as Pick<
    Dokument,
    "id" | "kategori_id" | "status"
  >[];

  const countByKategori = new Map<string, { total: number; gaeldende: number }>();
  for (const d of dokumentList) {
    const c = countByKategori.get(d.kategori_id) ?? { total: 0, gaeldende: 0 };
    c.total += 1;
    if (d.status === "gaeldende") c.gaeldende += 1;
    countByKategori.set(d.kategori_id, c);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">Dokumentstyring</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Alle dokumenter
        </h1>
      </header>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {kategoriList.map((k, i) => {
          const counts = countByKategori.get(k.id);
          const farve = KORT_FARVE_OVERSTYRING[k.id] ?? PALET[i % PALET.length];

          return (
            <Link
              key={k.id}
              href={`/dokumenter/${k.id}`}
              className="group border border-raw-edge bg-raw-deep p-5 transition-colors hover:border-brand"
            >
              <div className="h-1.5 w-10" style={{ backgroundColor: farve }} />
              <p className="mt-4 text-[18px] font-semibold group-hover:text-brand">
                {k.label}
              </p>
              {k.beskrivelse ? (
                <p className="mt-1 text-[13px] text-ink-faint">
                  {k.beskrivelse}
                </p>
              ) : null}
              <p className="mt-4 text-[13px] text-ink-soft">
                {counts?.total
                  ? `${counts.total} dokument${counts.total === 1 ? "" : "er"}${
                      counts.gaeldende ? ` · ${counts.gaeldende} gældende` : ""
                    }`
                  : "Ingen dokumenter endnu"}
              </p>
            </Link>
          );
        })}
      </div>

      {kategoriList.length === 0 ? (
        <p className="mt-8 text-[14px] text-ink-faint">
          Ingen kategorier fundet – tjek at migration 013 er kørt.
        </p>
      ) : null}
    </main>
  );
}
