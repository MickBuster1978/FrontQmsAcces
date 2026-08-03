// app/(app)/risiko/page.tsx
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { FlowDiagram, ProcessStep } from "@/lib/flow/types";
import type { StepHazard } from "@/lib/risiko/types";

type StepRow = Pick<ProcessStep, "id" | "diagram_id">;
type HazardRow = Pick<StepHazard, "step_id" | "status" | "er_ccp" | "er_oprp">;

export default async function RisikoOversigtPage() {
  const supabase = createClient();

  const [{ data: diagrams }, { data: steps }, { data: hazards }] =
    await Promise.all([
      supabase
        .from("flow_diagrams")
        .select("*")
        .order("updated_at", { ascending: false }),
      supabase.from("process_steps").select("id, diagram_id"),
      supabase.from("step_hazards").select("step_id, status, er_ccp, er_oprp"),
    ]);

  const diagramList = (diagrams ?? []) as FlowDiagram[];
  const stepList = (steps ?? []) as StepRow[];
  const hazardList = (hazards ?? []) as HazardRow[];

  const stepsByDiagram = new Map<string, string[]>();
  for (const s of stepList) {
    const arr = stepsByDiagram.get(s.diagram_id) ?? [];
    arr.push(s.id);
    stepsByDiagram.set(s.diagram_id, arr);
  }

  const hazardsByStep = new Map<string, HazardRow[]>();
  for (const h of hazardList) {
    const arr = hazardsByStep.get(h.step_id) ?? [];
    arr.push(h);
    hazardsByStep.set(h.step_id, arr);
  }

  function statsFor(diagramId: string) {
    const stepIds = stepsByDiagram.get(diagramId) ?? [];
    let total = 0;
    let pending = 0;
    let ccp = 0;
    let oprp = 0;
    for (const sid of stepIds) {
      for (const h of hazardsByStep.get(sid) ?? []) {
        total += 1;
        if (h.status === "forslag") pending += 1;
        if (h.er_ccp) ccp += 1;
        if (h.er_oprp) oprp += 1;
      }
    }
    return { stepCount: stepIds.length, total, pending, ccp, oprp };
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">Risikoanalyse</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Farevurdering
        </h1>
      </header>

      {diagramList.length === 0 ? (
        <div className="mt-8 border border-dashed border-raw-edge bg-raw-deep p-8 text-center">
          <p className="text-[17px]">Intet flowdiagram endnu.</p>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-faint">
            Risikoanalysen bygger på jeres flow. Byg et diagram med
            procestrin først.
          </p>
          <Link href="/flow" className="btn mt-5 inline-flex">
            Til flowdiagram
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10">
          {diagramList.map((d) => {
            const s = statsFor(d.id);
            return (
              <li key={d.id}>
                <Link
                  href={`/risiko/${d.id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 py-5 transition-colors hover:bg-raw-deep"
                >
                  <span className="px-2">
                    <span className="text-[18px] font-semibold group-hover:text-brand">
                      {d.name}
                    </span>
                    <span className="ml-3 text-[13px] text-ink-faint">
                      {s.stepCount} trin
                    </span>
                  </span>
                  <span className="tabular flex items-center gap-5 px-2 text-[13px]">
                    {s.pending > 0 ? (
                      <span className="text-state-warn">
                        {s.pending} til vurdering
                      </span>
                    ) : s.total === 0 ? (
                      <span className="text-ink-faint">Ikke startet</span>
                    ) : (
                      <span className="text-state-ok">Ajour</span>
                    )}
                    <span className="text-ink-faint">{s.ccp} CCP</span>
                    <span className="text-ink-faint">{s.oprp} oPRP</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
