// app/(app)/flow/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import type { FlowDiagram } from "@/lib/flow/types";
import { createDiagram } from "./actions";

const STATUS_LABELS: Record<FlowDiagram["status"], string> = {
  kladde: "Kladde",
  aktiv: "Aktiv",
  arkiveret: "Arkiveret",
};

const STATUS_TONE: Record<FlowDiagram["status"], string> = {
  kladde: "text-state-warn border-state-warn/30 bg-state-warn/5",
  aktiv: "text-state-ok border-state-ok/30 bg-state-ok/5",
  arkiveret: "text-ink-faint border-raw-edge bg-raw-deep",
};

const FEJL_TEKST: Record<string, string> = {
  navn: "Navnet skal være mindst 2 tegn.",
  findes: "Der findes allerede et diagram med det navn.",
  ukendt: "Noget gik galt. Prøv igen.",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function FlowListPage({
  searchParams,
}: {
  searchParams: { fejl?: string };
}) {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data: diagrams } = await supabase
    .from("flow_diagrams")
    .select("*")
    .order("updated_at", { ascending: false });

  const list = (diagrams ?? []) as FlowDiagram[];
  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Flowdiagram</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">
              Processer
            </h1>
          </div>
          <p className="text-[14px] text-ink-faint">
            {ctx?.orgName} · {list.length}{" "}
            {list.length === 1 ? "diagram" : "diagrammer"}
          </p>
        </div>
      </header>

      {/* Opret nyt */}
      <section className="mt-8 border border-raw-edge bg-raw-deep p-6">
        <p className="label">Nyt flowdiagram</p>
        <form action={createDiagram} className="mt-3 flex flex-wrap gap-3">
          <input
            name="name"
            type="text"
            required
            minLength={2}
            placeholder="Fx Opskæring & pakning, kølet"
            className="w-full max-w-md rounded-sm border border-raw-edge bg-raw
                       px-3 py-2 text-[16px] outline-none transition-colors
                       focus:border-brand"
          />
          <button type="submit" className="btn">
            Opret diagram
          </button>
        </form>
        {fejl ? (
          <p className="mt-3 text-[14px] text-state-bad">{fejl}</p>
        ) : null}
        <p className="mt-3 text-[13px] text-ink-faint">
          Diagrammet oprettes som kladde. Trin bygges bagefter – guidet, fra
          skabelon eller frit.
        </p>
      </section>

      {/* Liste */}
      <section className="mt-10">
        <div className="rule-double pb-3">
          <h2 className="label">Eksisterende diagrammer</h2>
        </div>

        {list.length === 0 ? (
          <p className="mt-6 text-[15px] text-ink-faint">
            Ingen diagrammer endnu. Opret det første ovenfor – fx jeres
            hovedproces fra modtagelse til forsendelse.
          </p>
        ) : (
          <ul className="mt-6 divide-y divide-ink/10">
            {list.map((d) => (
              <li key={d.id}>
                <Link
                  href={`/flow/${d.id}`}
                  className="group flex flex-wrap items-baseline justify-between
                             gap-3 py-4 transition-colors hover:bg-raw-deep"
                >
                  <span className="flex items-baseline gap-3 px-2">
                    <span className="text-[18px] font-semibold group-hover:text-brand">
                      {d.name}
                    </span>
                    <span
                      className={`rounded-sm border px-1.5 py-0.5 text-[12px] ${
                        STATUS_TONE[d.status]
                      }`}
                    >
                      {STATUS_LABELS[d.status]}
                    </span>
                  </span>
                  <span className="tabular px-2 text-[13px] text-ink-faint">
                    v{d.version} · opdateret {formatDate(d.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
