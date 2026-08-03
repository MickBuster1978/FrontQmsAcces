// app/(app)/risiko/[diagramId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STEP_TYPE_LABELS,
  type FlowDiagram,
  type ProcessStep,
} from "@/lib/flow/types";
import type { StepHazard } from "@/lib/risiko/types";

type HazardRow = Pick<StepHazard, "step_id" | "status" | "er_ccp" | "er_oprp">;

export default async function RisikoRegisterPage({
  params,
}: {
  params: { diagramId: string };
}) {
  const supabase = createClient();

  const { data: diagram } = await supabase
    .from("flow_diagrams")
    .select("*")
    .eq("id", params.diagramId)
    .maybeSingle();

  if (!diagram) notFound();
  const d = diagram as FlowDiagram;

  const { data: steps } = await supabase
    .from("process_steps")
    .select("*")
    .eq("diagram_id", d.id)
    .order("step_no");

  const stepList = (steps ?? []) as ProcessStep[];
  const stepIds = stepList.map((s) => s.id);

  const { data: hazards } =
    stepIds.length > 0
      ? await supabase
          .from("step_hazards")
          .select("step_id, status, er_ccp, er_oprp")
          .in("step_id", stepIds)
      : { data: [] as HazardRow[] };

  const hazardsByStep = new Map<string, HazardRow[]>();
  for (const h of (hazards ?? []) as HazardRow[]) {
    const arr = hazardsByStep.get(h.step_id) ?? [];
    arr.push(h);
    hazardsByStep.set(h.step_id, arr);
  }

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">
          <Link href="/risiko" className="underline hover:text-brand">
            Risikoanalyse
          </Link>{" "}
          ·{" "}
          <Link href={`/flow/${d.id}`} className="underline hover:text-brand">
            {d.name}
          </Link>
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Farevurdering pr. trin
        </h1>
      </header>

      {stepList.length === 0 ? (
        <div className="mt-8 border border-dashed border-raw-edge bg-raw-deep p-8 text-center">
          <p className="text-[17px]">Ingen trin i dette diagram endnu.</p>
          <Link href={`/flow/${d.id}`} className="btn mt-5 inline-flex">
            Til flowdiagram
          </Link>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10">
          {stepList.map((s) => {
            const hs = hazardsByStep.get(s.id) ?? [];
            const pending = hs.filter((h) => h.status === "forslag").length;
            const ccp = hs.filter((h) => h.er_ccp).length;
            const oprp = hs.filter((h) => h.er_oprp).length;

            return (
              <li key={s.id}>
                <Link
                  href={`/risiko/${d.id}/${s.id}`}
                  className="group flex flex-wrap items-center justify-between gap-3 py-4 transition-colors hover:bg-raw-deep"
                >
                  <span className="flex items-baseline gap-3 px-2">
                    <span className="tabular text-[13px] text-ink-faint">
                      {s.step_no}
                    </span>
                    <span className="text-[16px] font-semibold group-hover:text-brand">
                      {s.name}
                    </span>
                    <span className="text-[13px] text-ink-faint">
                      {s.step_type
                        ? STEP_TYPE_LABELS[s.step_type]
                        : "Type ikke sat"}
                    </span>
                  </span>
                  <span className="tabular flex items-center gap-3 px-2 text-[13px]">
                    {hs.length === 0 ? (
                      <span className="text-ink-faint">Ikke vurderet</span>
                    ) : (
                      <>
                        {pending > 0 ? (
                          <span className="text-state-warn">
                            {pending} til vurdering
                          </span>
                        ) : null}
                        {ccp > 0 ? (
                          <span className="rounded-sm border border-state-bad/30 bg-state-bad/5 px-1.5 py-0.5 text-state-bad">
                            {ccp} CCP
                          </span>
                        ) : null}
                        {oprp > 0 ? (
                          <span className="rounded-sm border border-state-warn/30 bg-state-warn/5 px-1.5 py-0.5 text-state-warn">
                            {oprp} oPRP
                          </span>
                        ) : null}
                      </>
                    )}
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
