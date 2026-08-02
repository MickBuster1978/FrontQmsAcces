// app/(app)/flow/[id]/print/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/flow/PrintButton";
import {
  STEP_TYPE_LABELS,
  type FlowDiagram,
  type ProcessEdge,
  type ProcessStep,
} from "@/lib/flow/types";

function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type HazardJoinRow = {
  id: string;
  label: string;
  step_id: string;
  er_ccp: boolean;
  er_oprp: boolean;
  process_steps:
    | { step_no: number; name: string }
    | { step_no: number; name: string }[]
    | null;
};

export default async function PrintDiagramPage({
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

  const allSteps = (steps ?? []) as ProcessStep[];
  const edgeList = (edges ?? []) as ProcessEdge[];
  const processSteps = allSteps.filter((s) => s.node_shape === "rektangel");
  const stepIds = allSteps.map((s) => s.id);

  const stepById = new Map(allSteps.map((s) => [s.id, s]));
  const outgoingByStep = new Map<string, ProcessStep[]>();
  for (const e of edgeList) {
    const list = outgoingByStep.get(e.from_step) ?? [];
    const target = stepById.get(e.to_step);
    if (target) list.push(target);
    outgoingByStep.set(e.from_step, list);
  }

  const { data: hazardRows } =
    stepIds.length > 0
      ? await supabase
          .from("step_hazards")
          .select(
            "id, label, step_id, er_ccp, er_oprp, process_steps(step_no, name)"
          )
          .in("step_id", stepIds)
          .eq("status", "bekraeftet")
          .or("er_ccp.eq.true,er_oprp.eq.true")
      : { data: [] as HazardJoinRow[] };

  const hazardsByStep = new Map<string, { ccp: boolean; oprp: boolean }>();
  const ccpList: { label: string; stepNo: number; stepName: string }[] = [];
  const oprpList: { label: string; stepNo: number; stepName: string }[] = [];

  for (const h of (hazardRows ?? []) as HazardJoinRow[]) {
    const info = Array.isArray(h.process_steps)
      ? h.process_steps[0]
      : h.process_steps;
    const entry = hazardsByStep.get(h.step_id) ?? { ccp: false, oprp: false };
    if (h.er_ccp) {
      entry.ccp = true;
      ccpList.push({
        label: h.label,
        stepNo: info?.step_no ?? 0,
        stepName: info?.name ?? "",
      });
    }
    if (h.er_oprp) {
      entry.oprp = true;
      oprpList.push({
        label: h.label,
        stepNo: info?.step_no ?? 0,
        stepName: info?.name ?? "",
      });
    }
    hazardsByStep.set(h.step_id, entry);
  }

  return (
    <>
      <style>{`
        @page { size: A4; margin: 16mm; }
        @media print {
          .no-print { display: none !important; }
          nav, footer { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
        .step-card { break-inside: avoid; }
      `}</style>

      <main className="mx-auto max-w-3xl px-6 pb-20 pt-8 print:max-w-none print:px-0 print:pt-0">
        <div className="no-print mb-6 flex items-center justify-between">
          <Link
            href={`/flow/${d.id}`}
            className="text-[14px] underline hover:text-brand"
          >
            ← Tilbage til diagram
          </Link>
          <PrintButton />
        </div>

        <header className="rule-double pb-4">
          <p className="label">Flowdiagram · v{d.version}</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight">
            {d.name}
          </h1>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-4">
            <div>
              <dt className="text-ink-faint">Oprettet</dt>
              <dd>{formatDate(d.oprettet_dato)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Verificeret</dt>
              <dd>{formatDate(d.verificeret_dato)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Fornyelse</dt>
              <dd>{formatDate(d.fornyelse_dato)}</dd>
            </div>
            <div>
              <dt className="text-ink-faint">Ny version</dt>
              <dd>{formatDate(d.ny_version_dato)}</dd>
            </div>
          </dl>
          <p className="mt-3 text-[12px] text-ink-faint">
            Udskrevet{" "}
            {new Date().toLocaleDateString("da-DK", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </header>

        <section className="mt-8 space-y-4">
          <h2 className="label rule-double pb-2">
            Procestrin ({processSteps.length})
          </h2>
          {processSteps.length === 0 ? (
            <p className="text-[14px] text-ink-faint">
              Ingen procestrin i dette diagram.
            </p>
          ) : (
            processSteps.map((s) => {
              const hz = hazardsByStep.get(s.id);
              const next = outgoingByStep.get(s.id) ?? [];
              return (
                <div
                  key={s.id}
                  className="step-card border border-raw-edge bg-raw-deep p-4"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-[15px] font-semibold">
                      {s.step_no}. {s.name}
                    </p>
                    <div className="flex gap-1.5">
                      {hz?.ccp ? (
                        <span className="rounded-sm border border-state-bad/30 bg-state-bad/5 px-1.5 py-0.5 text-[11px] text-state-bad">
                          CCP
                        </span>
                      ) : null}
                      {hz?.oprp ? (
                        <span className="rounded-sm border border-state-warn/30 bg-state-warn/5 px-1.5 py-0.5 text-[11px] text-state-warn">
                          oPRP
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-1 text-[13px] text-ink-soft">
                    {s.step_type ? STEP_TYPE_LABELS[s.step_type] : "Type ikke sat"}
                    {s.location_zone ? ` · ${s.location_zone}` : ""}
                    {s.temp_target_c != null ? ` · ${s.temp_target_c}°C` : ""}
                  </p>
                  <p className="mt-0.5 text-[12px] text-ink-faint">
                    {s.product_open ? "Åbent produkt" : "Lukket produkt"}
                    {s.person_contact ? " · personkontakt" : ""}
                  </p>
                  {next.length > 0 ? (
                    <p className="mt-2 text-[12px] text-ink-faint">
                      Fører til:{" "}
                      {next.map((n) => `${n.step_no}. ${n.name}`).join(", ")}
                    </p>
                  ) : null}
                </div>
              );
            })
          )}
        </section>

        {ccpList.length > 0 || oprpList.length > 0 ? (
          <section className="mt-10 space-y-4">
            <h2 className="label rule-double pb-2">Kritiske kontrolpunkter</h2>
            {ccpList.length > 0 ? (
              <div>
                <p className="text-[13px] font-semibold text-state-bad">CCP</p>
                <ul className="mt-1 space-y-1 text-[13px]">
                  {ccpList.map((h, i) => (
                    <li key={i}>
                      Trin {h.stepNo} ({h.stepName}) · {h.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {oprpList.length > 0 ? (
              <div className="mt-3">
                <p className="text-[13px] font-semibold text-state-warn">
                  oPRP
                </p>
                <ul className="mt-1 space-y-1 text-[13px]">
                  {oprpList.map((h, i) => (
                    <li key={i}>
                      Trin {h.stepNo} ({h.stepName}) · {h.label}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </section>
        ) : null}
      </main>
    </>
  );
}
