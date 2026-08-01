// app/(app)/flow/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FlowCanvas from "@/components/flow/FlowCanvas";
import {
  STEP_TYPE_LABELS,
  type FlowDiagram,
  type ProcessEdge,
  type ProcessStep,
} from "@/lib/flow/types";
import { deleteDiagram, deleteStep } from "../actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

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

  // Kun BEKRÆFTEDE farer må vise et CCP/oPRP-badge på diagrammet.
  const { data: hazardRows } =
    stepIds.length > 0
      ? await supabase
          .from("step_hazards")
          .select("step_id, er_ccp, er_oprp")
          .in("step_id", stepIds)
          .eq("status", "bekraeftet")
      : { data: [] as { step_id: string; er_ccp: boolean; er_oprp: boolean }[] };

  const hazardFlags: Record<string, { ccp: boolean; oprp: boolean }> = {};
  for (const h of hazardRows ?? []) {
    const nu = hazardFlags[h.step_id] ?? { ccp: false, oprp: false };
    hazardFlags[h.step_id] = {
      ccp: nu.ccp || h.er_ccp,
      oprp: nu.oprp || h.er_oprp,
    };
  }

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
          <div className="flex items-center gap-4">
            <p className="text-[14px] text-ink-faint">
              Oprettet {formatDate(d.created_at)}
            </p>
            <Link href={`/flow/${d.id}/nyt-trin`} className="btn">
              Tilføj trin
            </Link>
          </div>
        </div>
      </header>

      {/* Canvas */}
      <section className="mt-8">
        <div className="rule-double flex flex-wrap items-baseline justify-between gap-2 pb-3">
          <h2 className="label">Diagram</h2>
          <p className="text-[13px] text-ink-faint">
            Rombe = input · cirkel = output · ▲ rød = CCP · ▲ gul = oPRP
            (bekræftet)
          </p>
        </div>

        {stepList.length === 0 ? (
          <div className="mt-6 border border-dashed border-raw-edge bg-raw-deep p-8 text-center">
            <p className="text-[17px]">Ingen trin endnu.</p>
            <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-faint">
              Tilføj det første trin – typisk modtagelsen. Hvert trin gemmes
              som data, og diagrammet tegner sig selv.
            </p>
            <Link
              href={`/flow/${d.id}/nyt-trin`}
              className="btn mt-5 inline-flex"
            >
              Tilføj første trin
            </Link>
          </div>
        ) : (
          <div className="mt-6">
            <FlowCanvas
              diagramId={d.id}
              steps={stepList}
              edges={edgeList}
              hazardFlags={hazardFlags}
            />
          </div>
        )}
      </section>

      {/* Data-tabel */}
      {stepList.length > 0 ? (
        <section className="mt-12">
          <div className="rule-double pb-3">
            <h2 className="label">Trin som data ({stepList.length})</h2>
          </div>
          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-[15px]">
              <thead>
                <tr className="border-b border-ink/15">
                  <th className="label py-2 pr-4 font-normal">Nr.</th>
                  <th className="label py-2 pr-4 font-normal">Trin</th>
                  <th className="label py-2 pr-4 font-normal">Type</th>
                  <th className="label py-2 pr-4 font-normal">Zone</th>
                  <th className="label py-2 pr-4 font-normal">Temp.</th>
                  <th className="label py-2 pr-4 font-normal">Åbent</th>
                  <th className="label py-2 pr-4 font-normal">Kontakt</th>
                  <th className="py-2 font-normal"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {stepList.map((s) => (
                  <tr key={s.id}>
                    <td className="tabular py-2.5 pr-4 text-ink-faint">
                      {s.step_no}
                    </td>
                    <td className="py-2.5 pr-4 font-semibold">{s.name}</td>
                    <td className="py-2.5 pr-4">
                      {STEP_TYPE_LABELS[s.step_type]}
                    </td>
                    <td className="py-2.5 pr-4">{s.location_zone ?? "–"}</td>
                    <td className="tabular py-2.5 pr-4">
                      {s.temp_target_c != null
                        ? `${s.temp_target_c}°C${
                            s.temp_tolerance_c != null
                              ? ` ±${s.temp_tolerance_c}`
                              : ""
                          }`
                        : "–"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {s.product_open ? "Ja" : "Nej"}
                    </td>
                    <td className="py-2.5 pr-4">
                      {s.person_contact ? "Ja" : "Nej"}
                    </td>
                    <td className="py-2.5 text-right">
                      <form action={deleteStep} className="inline">
                        <input type="hidden" name="step_id" value={s.id} />
                        <input
                          type="hidden"
                          name="diagram_id"
                          value={d.id}
                        />
                        <button
                          type="submit"
                          className="text-[13px] text-ink-faint underline hover:text-state-bad"
                        >
                          Slet
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

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
