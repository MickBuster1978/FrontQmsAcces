// app/(app)/flow/[id]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import FlowCanvas from "@/components/flow/FlowCanvas";
import {
  STEP_TYPES,
  STEP_TYPE_LABELS,
  type FlowDiagram,
  type ProcessEdge,
  type ProcessStep,
} from "@/lib/flow/types";
import { deleteDiagram, deleteStep, updateStepCore } from "../actions";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const cellInputCls =
  "w-full rounded-sm border border-raw-edge bg-raw px-2 py-1 text-[14px] " +
  "outline-none transition-colors focus:border-brand";

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
            Rombe = input · cirkel = output · pil = flowretning · ▲ rød = CCP
            · ▲ gul = oPRP (bekræftet)
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
            hazardFlags={hazardFlags}
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

      {/* Redigerbar data-tabel */}
      {stepList.length > 0 ? (
        <section className="mt-12">
          <div className="rule-double pb-3">
            <h2 className="label">Trin som data ({stepList.length})</h2>
            <p className="mt-1 text-[13px] text-ink-faint">
              Type, åbent produkt og personkontakt er det risikomotoren
              matcher fareforslag ud fra – ret dem her hvis de mangler, og
              tryk Gem pr. række.
            </p>
          </div>

          <div className="mt-6 overflow-x-auto">
            <table className="w-full text-left text-[14px]">
              <thead>
                <tr className="border-b border-ink/15">
                  <th className="label py-2 pr-3 font-normal">Nr.</th>
                  <th className="label py-2 pr-3 font-normal">Trin</th>
                  <th className="label py-2 pr-3 font-normal">Type</th>
                  <th className="label py-2 pr-3 font-normal">Zone</th>
                  <th className="label py-2 pr-3 font-normal">Temp °C</th>
                  <th className="label py-2 pr-3 font-normal">± tol.</th>
                  <th className="label py-2 pr-3 font-normal">Åbent</th>
                  <th className="label py-2 pr-3 font-normal">Kontakt</th>
                  <th className="py-2 font-normal"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/10">
                {stepList.map((s) => {
                  const formId = `trin-${s.id}`;
                  return (
                    <tr key={s.id}>
                      <td className="tabular py-2 pr-3 align-top text-ink-faint">
                        {s.step_no}
                        {/* Anker-form: selve bindingen til updateStepCore.
                            Felterne der udgør formen sidder i de andre
                            celler via form={formId} – gyldig HTML5. */}
                        <form
                          id={formId}
                          action={updateStepCore}
                          className="hidden"
                        >
                          <input type="hidden" name="step_id" value={s.id} />
                          <input
                            type="hidden"
                            name="diagram_id"
                            value={d.id}
                          />
                        </form>
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <input
                          form={formId}
                          name="name"
                          type="text"
                          defaultValue={s.name}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <select
                          form={formId}
                          name="step_type"
                          defaultValue={s.step_type ?? ""}
                          className={cellInputCls}
                        >
                          <option value="">– Ikke sat –</option>
                          {STEP_TYPES.map((t) => (
                            <option key={t} value={t}>
                              {STEP_TYPE_LABELS[t]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <input
                          form={formId}
                          name="location_zone"
                          type="text"
                          defaultValue={s.location_zone ?? ""}
                          className={cellInputCls}
                        />
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <input
                          form={formId}
                          name="temp_target_c"
                          type="number"
                          step="any"
                          defaultValue={s.temp_target_c ?? ""}
                          className={`tabular ${cellInputCls}`}
                        />
                      </td>
                      <td className="py-2 pr-3 align-top">
                        <input
                          form={formId}
                          name="temp_tolerance_c"
                          type="number"
                          step="any"
                          defaultValue={s.temp_tolerance_c ?? ""}
                          className={`tabular ${cellInputCls}`}
                        />
                      </td>
                      <td className="py-2 pr-3 pt-2.5 align-top">
                        <input
                          form={formId}
                          name="product_open"
                          type="checkbox"
                          defaultChecked={s.product_open}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="py-2 pr-3 pt-2.5 align-top">
                        <input
                          form={formId}
                          name="person_contact"
                          type="checkbox"
                          defaultChecked={s.person_contact}
                          className="h-4 w-4"
                        />
                      </td>
                      <td className="py-2 align-top">
                        <div className="flex flex-col gap-1.5">
                          <button
                            form={formId}
                            type="submit"
                            className="text-[13px] text-brand underline"
                          >
                            Gem
                          </button>
                          <form action={deleteStep}>
                            <input
                              type="hidden"
                              name="step_id"
                              value={s.id}
                            />
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
                        </div>
                      </td>
                    </tr>
                  );
                })}
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
