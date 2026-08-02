// app/(app)/flow/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FlowCanvas, {
  type ConfirmedHazardOption,
} from "@/components/flow/FlowCanvas";
import { deleteDiagram, saveDiagramMeta } from "../actions";
import type { FlowDiagram, ProcessEdge, ProcessStep } from "@/lib/flow/types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const dateInputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw px-3 py-2 " +
  "text-[15px] outline-none transition-colors focus:border-brand";

export default async function DiagramPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: diagram } = await supabase
    .from("flow_diagrams")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();

  if (!diagram) notFound();
  const d = diagram as FlowDiagram;

  const [{ data: steps }, { data: edges }] = await Promise.all([
    supabase
      .from("process_steps")
      .select("*")
      .eq("diagram_id", d.id)
      .order("step_no"),
    supabase.from("process_edges").select("*").eq("diagram_id", d.id),
  ]);

  const stepList = (steps ?? []) as ProcessStep[];
  const edgeList = (edges ?? []) as ProcessEdge[];
  const stepIds = stepList.map((s) => s.id);

  // linked_hazard_id pr. trin (separat, smal forespørgsel)
  const { data: linkRows } =
    stepIds.length > 0
      ? await supabase
          .from("process_steps")
          .select("id, linked_hazard_id")
          .in("id", stepIds)
      : { data: [] as { id: string; linked_hazard_id: string | null }[] };

  const linkedHazardByStep: Record<string, string | null> = {};
  for (const row of linkRows ?? []) {
    linkedHazardByStep[row.id] = row.linked_hazard_id;
  }

  // Bekræftede CCP/oPRP-farer fra risikomodulet
  type HazardJoinRow = {
    id: string;
    label: string;
    process_steps: { step_no: number } | { step_no: number }[] | null;
  };

  function toOptions(rows: HazardJoinRow[] | null): ConfirmedHazardOption[] {
    return (rows ?? []).map((r) => {
      const stepInfo = Array.isArray(r.process_steps)
        ? r.process_steps[0]
        : r.process_steps;
      return {
        id: r.id,
        label: r.label,
        stepNo: stepInfo?.step_no ?? 0,
      };
    });
  }

  const [{ data: ccpRows }, { data: oprpRows }] =
    stepIds.length > 0
      ? await Promise.all([
          supabase
            .from("step_hazards")
            .select("id, label, process_steps(step_no)")
            .in("step_id", stepIds)
            .eq("er_ccp", true)
            .eq("status", "bekraeftet"),
          supabase
            .from("step_hazards")
            .select("id, label, process_steps(step_no)")
            .in("step_id", stepIds)
            .eq("er_oprp", true)
            .eq("status", "bekraeftet"),
        ])
      : [{ data: [] }, { data: [] }];

  const confirmedCcpHazards = toOptions(ccpRows as HazardJoinRow[] | null);
  const confirmedOprpHazards = toOptions(oprpRows as HazardJoinRow[] | null);

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">
              <Link href="/flow" className="underline hover:text-brand">
                Flowdiagram
              </Link>{" "}
              · v{d.version}
            </p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">
              {d.name}
            </h1>
          </div>
          <p className="text-[14px] text-ink-faint">
            Oprettet {formatDate(d.created_at)}
          </p>
        </div>
      </header>

      {/* Canvas + palet */}
      <section className="mt-8">
        <div className="rule-double flex flex-wrap items-baseline justify-between gap-2 pb-3">
          <h2 className="label">Diagram</h2>
          <p className="text-[13px] text-ink-faint">
            Gule felter forbinder fra alle sider · Enter i en boks laver
            linjeskift, klik væk for at gemme
          </p>
        </div>

        {stepList.length === 0 ? (
          <p className="mt-3 text-[14px] text-ink-faint">
            Træk et element fra paletten ud på det tomme areal for at oprette
            det første trin.
          </p>
        ) : null}

        <div className="mt-4">
          <FlowCanvas
            diagramId={d.id}
            steps={stepList}
            edges={edgeList}
            linkedHazardByStep={linkedHazardByStep}
            confirmedCcpHazards={confirmedCcpHazards}
            confirmedOprpHazards={confirmedOprpHazards}
          />
        </div>

        <p className="mt-3 text-[13px] text-ink-faint">
          Vil du hellere udfylde et trin i den fulde, guidede formular?{" "}
          <Link
            href={`/flow/${d.id}/nyt-trin`}
            className="text-brand underline"
          >
            Brug den her
          </Link>
          .
        </p>
      </section>

      {/* Gem diagram – styringsdatoer */}
      <section className="mt-12">
        <div className="rule-double pb-3">
          <h2 className="label">Gem diagram</h2>
          <p className="mt-1 text-[13px] text-ink-faint">
            Dokumentstyringsdatoer for diagrammet – dem en auditor spørger
            til.
          </p>
        </div>

        <form action={saveDiagramMeta} className="mt-6">
          <input type="hidden" name="diagram_id" value={d.id} />
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label htmlFor="oprettet_dato" className="label">
                Oprettelsesdato
              </label>
              <input
                id="oprettet_dato"
                name="oprettet_dato"
                type="date"
                defaultValue={d.oprettet_dato ?? ""}
                className={dateInputCls}
              />
            </div>
            <div>
              <label htmlFor="verificeret_dato" className="label">
                Verificeringsdato
              </label>
              <input
                id="verificeret_dato"
                name="verificeret_dato"
                type="date"
                defaultValue={d.verificeret_dato ?? ""}
                className={dateInputCls}
              />
            </div>
            <div>
              <label htmlFor="fornyelse_dato" className="label">
                Dato for fornyelse
              </label>
              <input
                id="fornyelse_dato"
                name="fornyelse_dato"
                type="date"
                defaultValue={d.fornyelse_dato ?? ""}
                className={dateInputCls}
              />
            </div>
            <div>
              <label htmlFor="ny_version_dato" className="label">
                Dato for ny version
              </label>
              <input
                id="ny_version_dato"
                name="ny_version_dato"
                type="date"
                defaultValue={d.ny_version_dato ?? ""}
                className={dateInputCls}
              />
            </div>
          </div>
          <button type="submit" className="btn mt-6">
            Gem diagram
          </button>
        </form>
      </section>

      {/* Farezone */}
      <section className="mt-14 border-t border-ink/10 pt-6">
        <form
          action={deleteDiagram}
          className="flex flex-wrap items-center justify-between gap-3"
        >
          <input type="hidden" name="id" value={d.id} />
          <p className="text-[13px] text-ink-faint">
            Sletning fjerner diagrammet og alle dets trin, kanter og
            attributter permanent.
          </p>
          <button type="submit" className="btn-quiet text-state-bad">
            Slet diagram
          </button>
        </form>
      </section>
    </main>
  );
}
