// app/(app)/flow/[id]/print/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import PrintButton from "@/components/flow/PrintButton";
import type { FlowDiagram, NodeShape, ProcessEdge, ProcessStep } from "@/lib/flow/types";

function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// Samme farver som selve canvas (components/flow/FlowCanvas.tsx) -
// kan ikke importeres direkte derfra, da den fil er "use client".
const SHAPE_COLOR: Record<NodeShape, string> = {
  cirkel: "#DCEEE3",
  rektangel: "#DCE6F0",
  kvadrat: "#FFFFFF",
  rombe: "#F3EEE3",
  trekant_oprp: "#F4E2CE",
  trekant_ccp: "#A8321C",
};

const SHAPE_TEXT_LIGHT: Record<NodeShape, boolean> = {
  cirkel: false,
  rektangel: false,
  kvadrat: false,
  rombe: false,
  trekant_oprp: false,
  trekant_ccp: true,
};

// Footprint pr. form - bruges til bounding box og selve tegningen.
// Skal ikke være pixel-identisk med canvas, kun visuelt genkendeligt.
const SHAPE_SIZE: Record<NodeShape, { w: number; h: number }> = {
  rektangel: { w: 220, h: 70 },
  cirkel: { w: 100, h: 100 },
  kvadrat: { w: 100, h: 100 },
  rombe: { w: 120, h: 120 },
  trekant_oprp: { w: 100, h: 90 },
  trekant_ccp: { w: 100, h: 90 },
};

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

function ShapeSvg({
  step,
  color,
}: {
  step: ProcessStep;
  color: string;
}) {
  const { pos_x: x, pos_y: y, node_shape: shape } = step;
  const size = SHAPE_SIZE[shape];
  const stroke = "#DFD6C4";

  if (shape === "cirkel") {
    return (
      <circle
        cx={x + size.w / 2}
        cy={y + size.h / 2}
        r={size.w / 2}
        fill={color}
        stroke={stroke}
        strokeWidth={1.5}
      />
    );
  }
  if (shape === "kvadrat") {
    return (
      <rect
        x={x}
        y={y}
        width={size.w}
        height={size.h}
        fill={color}
        stroke={stroke}
        strokeWidth={1.5}
      />
    );
  }
  if (shape === "rombe") {
    const cx = x + size.w / 2;
    const cy = y + size.h / 2;
    const points = `${cx},${y} ${x + size.w},${cy} ${cx},${y + size.h} ${x},${cy}`;
    return <polygon points={points} fill={color} stroke={stroke} strokeWidth={1.5} />;
  }
  if (shape === "trekant_oprp" || shape === "trekant_ccp") {
    const triH = size.h * 0.6;
    const points = `${x + size.w / 2},${y} ${x + size.w},${y + triH} ${x},${y + triH}`;
    return <polygon points={points} fill={color} stroke={stroke} strokeWidth={1.5} />;
  }
  // rektangel
  return (
    <rect
      x={x}
      y={y}
      width={size.w}
      height={size.h}
      rx={4}
      fill={color}
      stroke={stroke}
      strokeWidth={1.5}
    />
  );
}

function LabelForeignObject({
  step,
  label,
  light,
}: {
  step: ProcessStep;
  label: string;
  light: boolean;
}) {
  const size = SHAPE_SIZE[step.node_shape];
  const isTriangle =
    step.node_shape === "trekant_ccp" || step.node_shape === "trekant_oprp";
  const y = isTriangle ? step.pos_y + size.h * 0.6 : step.pos_y;
  const h = isTriangle ? size.h * 0.4 : size.h;

  return (
    <foreignObject x={step.pos_x} y={y} width={size.w} height={h}>
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "0 8px",
          textAlign: "center",
          fontSize: 11,
          fontWeight: 600,
          lineHeight: 1.25,
          color: light ? "#FAF6EE" : "#14120F",
          fontFamily: "inherit",
        }}
      >
        {label}
      </div>
    </foreignObject>
  );
}

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
    supabase.from("process_steps").select("*").eq("diagram_id", d.id),
    supabase.from("process_edges").select("*").eq("diagram_id", d.id),
  ]);

  const allSteps = (steps ?? []) as ProcessStep[];
  const edgeList = (edges ?? []) as ProcessEdge[];
  const stepIds = allSteps.map((s) => s.id);
  const stepById = new Map(allSteps.map((s) => [s.id, s]));

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

  const hazardById = new Map<string, HazardJoinRow>();
  const ccpList: { label: string; stepNo: number; stepName: string }[] = [];
  const oprpList: { label: string; stepNo: number; stepName: string }[] = [];

  for (const h of (hazardRows ?? []) as HazardJoinRow[]) {
    hazardById.set(h.id, h);
    const info = Array.isArray(h.process_steps)
      ? h.process_steps[0]
      : h.process_steps;
    if (h.er_ccp) {
      ccpList.push({
        label: h.label,
        stepNo: info?.step_no ?? 0,
        stepName: info?.name ?? "",
      });
    }
    if (h.er_oprp) {
      oprpList.push({
        label: h.label,
        stepNo: info?.step_no ?? 0,
        stepName: info?.name ?? "",
      });
    }
  }

  // linked_hazard_id pr. trin - kun relevant for trekant_ccp/trekant_oprp
  const { data: linkRows } =
    stepIds.length > 0
      ? await supabase
          .from("process_steps")
          .select("id, linked_hazard_id")
          .in("id", stepIds)
      : { data: [] as { id: string; linked_hazard_id: string | null }[] };

  const linkedHazardByStep = new Map<string, string | null>();
  for (const row of linkRows ?? []) {
    linkedHazardByStep.set(row.id, row.linked_hazard_id);
  }

  function labelFor(s: ProcessStep): string {
    if (s.node_shape === "trekant_ccp" || s.node_shape === "trekant_oprp") {
      const hazardId = linkedHazardByStep.get(s.id);
      const hazard = hazardId ? hazardById.get(hazardId) : undefined;
      return hazard ? hazard.label : "Ikke koblet";
    }
    return s.name;
  }

  // Bounding box ud fra faktiske positioner + formstørrelser
  let minX = 0, minY = 0, maxX = 400, maxY = 300;
  if (allSteps.length > 0) {
    minX = Math.min(...allSteps.map((s) => s.pos_x));
    minY = Math.min(...allSteps.map((s) => s.pos_y));
    maxX = Math.max(
      ...allSteps.map((s) => s.pos_x + SHAPE_SIZE[s.node_shape].w)
    );
    maxY = Math.max(
      ...allSteps.map((s) => s.pos_y + SHAPE_SIZE[s.node_shape].h)
    );
  }
  const PAD = 40;
  const viewBox = `${minX - PAD} ${minY - PAD} ${maxX - minX + PAD * 2} ${
    maxY - minY + PAD * 2
  }`;

  return (
    <>
      <style>{`
        @page { size: A4; margin: 14mm; }
        @media print {
          .no-print { display: none !important; }
          nav, footer { display: none !important; }
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      <main className="mx-auto max-w-4xl px-6 pb-20 pt-8 print:max-w-none print:px-0 print:pt-0">
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

        {/* Selve diagrammet */}
        <section className="mt-8">
          <h2 className="label rule-double pb-2">Diagram</h2>
          {allSteps.length === 0 ? (
            <p className="mt-4 text-[14px] text-ink-faint">
              Ingen trin i dette diagram endnu.
            </p>
          ) : (
            <div className="mt-4 border border-raw-edge bg-raw-deep p-3">
              <svg viewBox={viewBox} className="h-auto w-full">
                <defs>
                  <marker
                    id="pil"
                    viewBox="0 0 10 10"
                    refX="9"
                    refY="5"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto-start-reverse"
                  >
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#C9600F" />
                  </marker>
                </defs>

                {/* Kanter først, så kortene visuelt dækker linjens ender */}
                {edgeList.map((e) => {
                  const from = stepById.get(e.from_step);
                  const to = stepById.get(e.to_step);
                  if (!from || !to) return null;
                  const fromSize = SHAPE_SIZE[from.node_shape];
                  const toSize = SHAPE_SIZE[to.node_shape];
                  const x1 = from.pos_x + fromSize.w / 2;
                  const y1 = from.pos_y + fromSize.h / 2;
                  const x2 = to.pos_x + toSize.w / 2;
                  const y2 = to.pos_y + toSize.h / 2;
                  return (
                    <line
                      key={e.id}
                      x1={x1}
                      y1={y1}
                      x2={x2}
                      y2={y2}
                      stroke="#C9600F"
                      strokeWidth={2}
                      markerEnd="url(#pil)"
                    />
                  );
                })}

                {allSteps.map((s) => (
                  <g key={s.id}>
                    <ShapeSvg step={s} color={SHAPE_COLOR[s.node_shape]} />
                    <LabelForeignObject
                      step={s}
                      label={labelFor(s)}
                      light={SHAPE_TEXT_LIGHT[s.node_shape]}
                    />
                  </g>
                ))}
              </svg>
            </div>
          )}
          <p className="mt-2 text-[11px] text-ink-faint">
            Meget høje diagrammer kan blive skåret af på én printside – del op
            i flere mindre diagrammer hvis det sker.
          </p>
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
