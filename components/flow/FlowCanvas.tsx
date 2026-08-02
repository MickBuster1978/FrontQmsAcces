// components/flow/FlowCanvas.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  BaseEdge,
  Background,
  ConnectionMode,
  Controls,
  EdgeLabelRenderer,
  Handle,
  MarkerType,
  Position,
  ReactFlowProvider,
  getStraightPath,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  NODE_SHAPE_LABELS,
  NODE_SHAPES,
  type AttributeDefinition,
  type NodeShape,
  type ProcessEdge,
  type ProcessStep,
  type StepAttribute,
} from "@/lib/flow/types";
import {
  createEdge,
  createStepQuick,
  createStepType,
  deleteEdge,
  linkHazard,
  renameStep,
  saveStepPosition,
  updateStepDetails,
} from "@/app/(app)/flow/actions";

export type ConfirmedHazardOption = {
  id: string;
  label: string;
  stepNo: number;
};

/** Trin-typer er data, ikke en fast liste - delte starttyper
 * (org_id null) plus jeres egne (fx "Svejsning" for en metalvirksomhed). */
export type StepTypeDefinition = {
  id: string;
  org_id: string | null;
  label: string;
  sort_order: number;
};

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

type StepNodeData = {
  step: ProcessStep;
  onRename: (stepId: string, newName: string) => void;
  linkedLabel: string | null;
  /** Trin-typens visningsnavn, slået op i stepTypeDefs - data, ikke en fast liste */
  stepTypeLabel: string | null;
};

/**
 * Fire forbindelsespunkter – top/højre/bund/venstre. ÉT punkt pr.
 * side. Kombineret med connectionMode={ConnectionMode.Loose} på
 * <ReactFlow>, som tillader forbindelser mellem alle punkter uanset
 * type – den dokumenterede løsning til "forbind fra alle sider".
 */
function FourSideHandles() {
  const sides = [
    { pos: Position.Top, id: "top" },
    { pos: Position.Right, id: "right" },
    { pos: Position.Bottom, id: "bottom" },
    { pos: Position.Left, id: "left" },
  ] as const;

  const handleCls =
    "!h-3 !w-3 !rounded-none !border-2 !border-raw !bg-yellow-400";

  return (
    <>
      {sides.map(({ pos, id }) => (
        <Handle
          key={id}
          type="source"
          position={pos}
          id={id}
          className={handleCls}
        />
      ))}
    </>
  );
}

/**
 * Flerlinjet, selvvoksende tekstfelt. Enter laver linjeskift (native
 * textarea-adfærd) – gemmes ved blur. key={name} nulstiller feltet
 * korrekt når navnet ændres udefra.
 */
function AutoTextarea({
  id,
  name,
  onRename,
  align = "left",
}: {
  id: string;
  name: string;
  onRename: (stepId: string, newName: string) => void;
  align?: "left" | "center";
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  const resize = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, []);

  useEffect(() => {
    resize();
  }, [resize]);

  const cls = [
    "nodrag w-full resize-none overflow-hidden border-none bg-transparent p-0",
    "text-[12px] font-semibold leading-snug outline-none",
    align === "center" ? "text-center" : "",
    "focus:bg-raw focus:px-1 focus:py-0.5",
  ].join(" ");

  return (
    <textarea
      key={name}
      ref={ref}
      defaultValue={name}
      rows={1}
      onInput={resize}
      onBlur={(e) => onRename(id, e.target.value)}
      className={cls}
    />
  );
}

/** Custom node – renderer efter node_shape. */
function StepNode({ id, data }: NodeProps<StepNodeData>) {
  const s = data.step;
  const shape = s.node_shape;
  const color = SHAPE_COLOR[shape];
  const light = SHAPE_TEXT_LIGHT[shape];

  if (shape === "rektangel") {
    return (
      <div className="relative">
        <FourSideHandles />
        <div
          className="w-56 rounded-sm border border-raw-edge shadow-sm"
          style={{ backgroundColor: color }}
        >
          <div className="border-b border-raw-edge/60 px-3 py-1.5">
            <p className="text-[10px] uppercase tracking-label text-ink-faint">
              {s.step_no}. {data.stepTypeLabel ?? "Type ikke sat"}
            </p>
          </div>
          <div className="px-3 py-2">
            <AutoTextarea id={id} name={s.name} onRename={data.onRename} />
            <p className="mt-1 text-[12px] text-ink-soft">
              {s.temp_target_c != null ? `${s.temp_target_c}°C` : "–"}
              {s.location_zone ? ` · ${s.location_zone}` : ""}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-faint">
              {s.product_open ? "Åbent produkt" : "Lukket produkt"}
              {s.person_contact ? " · personkontakt" : ""}
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (shape === "cirkel" || shape === "kvadrat") {
    return (
      <div className="relative">
        <FourSideHandles />
        <div
          className={`flex min-h-24 w-24 items-center justify-center border border-raw-edge px-2 py-2 text-center shadow-sm ${
            shape === "cirkel" ? "rounded-full" : ""
          }`}
          style={{ backgroundColor: color }}
        >
          <AutoTextarea
            id={id}
            name={s.name}
            onRename={data.onRename}
            align="center"
          />
        </div>
      </div>
    );
  }

  if (shape === "rombe") {
    return (
      <div className="relative">
        <FourSideHandles />
        <div className="flex h-32 w-32 items-center justify-center">
          <div
            className="flex h-20 w-20 rotate-45 items-center justify-center
                       border border-raw-edge shadow-sm"
            style={{ backgroundColor: color }}
          >
            <div className="w-16 -rotate-45">
              <AutoTextarea
                id={id}
                name={s.name}
                onRename={data.onRename}
                align="center"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex w-28 flex-col items-center">
      <FourSideHandles />
      <div
        style={{
          width: 0,
          height: 0,
          borderLeft: "42px solid transparent",
          borderRight: "42px solid transparent",
          borderBottom: `72px solid ${color}`,
        }}
      />
      <p
        className={`mt-1 w-full text-center text-[11px] font-semibold leading-snug ${
          light ? "text-ink" : "text-ink"
        }`}
      >
        {data.linkedLabel ?? "Vælg i sidebar →"}
      </p>
    </div>
  );
}

const panelInputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw px-3 py-2 " +
  "text-[15px] outline-none transition-colors focus:border-brand";

/** Ét attribut-felt i redigeringspanelet - samme mønster som nyt-trin */
function PanelAttributFelt({
  def,
  existing,
}: {
  def: AttributeDefinition;
  existing: StepAttribute | undefined;
}) {
  const name = `attr_${def.id}`;

  if (def.value_type === "boolean") {
    return (
      <div>
        <label className="label">
          {def.label}
          {def.required ? " *" : ""}
        </label>
        <label className="mt-1.5 flex items-center gap-2 text-[14px]">
          <input
            name={name}
            type="checkbox"
            defaultChecked={existing?.value_bool ?? false}
            className="h-4 w-4"
          />
          Ja
        </label>
      </div>
    );
  }

  if (def.value_type === "select") {
    return (
      <div>
        <label htmlFor={name} className="label">
          {def.label}
          {def.unit ? ` (${def.unit})` : ""}
        </label>
        <select
          id={name}
          name={name}
          defaultValue={existing?.value_text ?? ""}
          className={panelInputCls}
        >
          <option value="">Vælg …</option>
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label htmlFor={name} className="label">
        {def.label}
        {def.unit ? ` (${def.unit})` : ""}
      </label>
      <input
        id={name}
        name={name}
        type={def.value_type === "number" ? "number" : "text"}
        step={def.value_type === "number" ? "any" : undefined}
        defaultValue={
          def.value_type === "number"
            ? existing?.value_num ?? ""
            : existing?.value_text ?? ""
        }
        className={panelInputCls}
      />
    </div>
  );
}

/**
 * Fuldt redigeringspanel for et rektangel-trin: kernefelter + de
 * type-specifikke attributter, filtreret reaktivt når typen ændres.
 * Almindeligt formular-submit (ikke klient-kald) - redirect() i
 * actionen giver et rent, genindlæst canvas efter gem.
 */
function StepEditPanel({
  diagramId,
  step,
  attributeDefs,
  existingAttrs,
  stepTypeDefs,
  onClose,
}: {
  diagramId: string;
  step: ProcessStep;
  attributeDefs: AttributeDefinition[];
  existingAttrs: StepAttribute[];
  stepTypeDefs: StepTypeDefinition[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [valgtType, setValgtType] = useState<string>(step.step_type ?? "");
  const [visNyType, setVisNyType] = useState(false);
  const [nytTypeNavn, setNytTypeNavn] = useState("");
  const [opretterType, setOpretterType] = useState(false);

  const relevanteDefs = valgtType
    ? attributeDefs
        .filter((d) => d.applies_to.some((t) => t === valgtType))
        .sort((a, b) => a.sort_order - b.sort_order)
    : [];

  const valgtTypeLabel =
    stepTypeDefs.find((t) => t.id === valgtType)?.label ?? valgtType;

  const existingByAttr = new Map(existingAttrs.map((a) => [a.attr_id, a]));

  async function handleOpretType() {
    if (nytTypeNavn.trim().length < 2) return;
    setOpretterType(true);
    const res = await createStepType(nytTypeNavn.trim());
    setOpretterType(false);
    if (res.ok) {
      setValgtType(res.id);
      setVisNyType(false);
      setNytTypeNavn("");
      router.refresh();
    }
  }

  return (
    <div className="border border-raw-edge bg-raw-deep p-5">
      <div className="flex items-center justify-between">
        <h3 className="label">Rediger trin {step.step_no} · {step.name}</h3>
        <button
          type="button"
          onClick={onClose}
          className="text-[13px] text-ink-faint underline"
        >
          Luk
        </button>
      </div>

      <form action={updateStepDetails} className="mt-4 space-y-6">
        <input type="hidden" name="step_id" value={step.id} />
        <input type="hidden" name="diagram_id" value={diagramId} />
        <input type="hidden" name="step_type" value={valgtType} />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label htmlFor="step_type_select" className="label">
              Trin-type
            </label>
            {visNyType ? (
              <div className="mt-1.5 flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={nytTypeNavn}
                  onChange={(e) => setNytTypeNavn(e.target.value)}
                  placeholder="Fx Svejsning"
                  className={`${panelInputCls} mt-0`}
                />
                <button
                  type="button"
                  onClick={handleOpretType}
                  disabled={opretterType || nytTypeNavn.trim().length < 2}
                  className="btn whitespace-nowrap px-3 disabled:opacity-50"
                >
                  {opretterType ? "…" : "Opret"}
                </button>
                <button
                  type="button"
                  onClick={() => setVisNyType(false)}
                  className="text-[13px] text-ink-faint underline"
                >
                  Fortryd
                </button>
              </div>
            ) : (
              <select
                id="step_type_select"
                value={valgtType}
                onChange={(e) => {
                  if (e.target.value === "__ny__") {
                    setVisNyType(true);
                  } else {
                    setValgtType(e.target.value);
                  }
                }}
                className={panelInputCls}
              >
                <option value="">– Ikke sat –</option>
                {stepTypeDefs.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                    {t.org_id ? " (egen)" : ""}
                  </option>
                ))}
                <option value="__ny__">+ Opret ny type…</option>
              </select>
            )}
          </div>
          <div>
            <label htmlFor="location_zone" className="label">
              Zone/lokation
            </label>
            <input
              id="location_zone"
              name="location_zone"
              type="text"
              defaultValue={step.location_zone ?? ""}
              className={panelInputCls}
            />
          </div>
          <div>
            <label htmlFor="temp_target_c" className="label">
              Måltemperatur (°C)
            </label>
            <input
              id="temp_target_c"
              name="temp_target_c"
              type="number"
              step="any"
              defaultValue={step.temp_target_c ?? ""}
              className={panelInputCls}
            />
          </div>
          <div>
            <label htmlFor="temp_tolerance_c" className="label">
              Tolerance (± °C)
            </label>
            <input
              id="temp_tolerance_c"
              name="temp_tolerance_c"
              type="number"
              step="any"
              defaultValue={step.temp_tolerance_c ?? ""}
              className={panelInputCls}
            />
          </div>
          <div>
            <label htmlFor="equipment" className="label">
              Udstyr
            </label>
            <input
              id="equipment"
              name="equipment"
              type="text"
              defaultValue={step.equipment ?? ""}
              className={panelInputCls}
            />
          </div>
          <div>
            <label htmlFor="responsible_role" className="label">
              Ansvarlig funktion
            </label>
            <input
              id="responsible_role"
              name="responsible_role"
              type="text"
              defaultValue={step.responsible_role ?? ""}
              className={panelInputCls}
            />
          </div>
          <div>
            <label htmlFor="input_desc" className="label">
              Input
            </label>
            <input
              id="input_desc"
              name="input_desc"
              type="text"
              defaultValue={step.input_desc ?? ""}
              className={panelInputCls}
            />
          </div>
          <div>
            <label htmlFor="output_desc" className="label">
              Output
            </label>
            <input
              id="output_desc"
              name="output_desc"
              type="text"
              defaultValue={step.output_desc ?? ""}
              className={panelInputCls}
            />
          </div>
          <div className="flex items-center gap-5 pt-1">
            <label className="flex items-center gap-2 text-[14px]">
              <input
                name="product_open"
                type="checkbox"
                defaultChecked={step.product_open}
                className="h-4 w-4"
              />
              Åbent produkt
            </label>
            <label className="flex items-center gap-2 text-[14px]">
              <input
                name="person_contact"
                type="checkbox"
                defaultChecked={step.person_contact}
                className="h-4 w-4"
              />
              Personkontakt
            </label>
          </div>
        </div>

        {relevanteDefs.length > 0 ? (
          <div>
            <p className="label rule-double pb-2">
              Specifikt for {valgtTypeLabel.toLowerCase()}
            </p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {relevanteDefs.map((d) => (
                <PanelAttributFelt
                  key={d.id}
                  def={d}
                  existing={existingByAttr.get(d.id)}
                />
              ))}
            </div>
          </div>
        ) : null}

        <button type="submit" className="btn">
          Gem trin
        </button>
      </form>
    </div>
  );
}

const nodeTypes = { step: StepNode };

type EdgeData = { onDelete: (edgeId: string) => void };

function DeletableEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  markerEnd,
  style,
  data,
}: EdgeProps<EdgeData>) {
  const [edgePath, labelX, labelY] = getStraightPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
  });

  return (
    <>
      <BaseEdge id={id} path={edgePath} markerEnd={markerEnd} style={style} />
      <EdgeLabelRenderer>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            data?.onDelete(id);
          }}
          title="Slet forbindelse"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
          }}
          className="nodrag nopan flex h-4 w-4 items-center justify-center
                     rounded-full border border-state-bad bg-raw text-[11px]
                     leading-none text-state-bad transition-colors
                     hover:bg-state-bad hover:text-raw"
        >
          ×
        </button>
      </EdgeLabelRenderer>
    </>
  );
}

const edgeTypes = { deletable: DeletableEdge };

function PaletteItem({ shape }: { shape: NodeShape }) {
  const color = SHAPE_COLOR[shape];

  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData("application/aiqms-shape", shape);
        e.dataTransfer.effectAllowed = "move";
      }}
      className="flex cursor-grab items-center gap-2 border border-raw-edge
                 bg-raw px-3 py-2 text-[13px] transition-colors
                 hover:border-brand active:cursor-grabbing"
    >
      <span
        className="h-4 w-4 flex-none border border-ink/15"
        style={{ backgroundColor: color }}
      />
      {NODE_SHAPE_LABELS[shape]}
    </div>
  );
}

export type FlowCanvasProps = {
  diagramId: string;
  steps: ProcessStep[];
  edges: ProcessEdge[];
  linkedHazardByStep: Record<string, string | null>;
  confirmedCcpHazards: ConfirmedHazardOption[];
  confirmedOprpHazards: ConfirmedHazardOption[];
  attributeDefs: AttributeDefinition[];
  stepAttributesByStep: Record<string, StepAttribute[]>;
  stepTypeDefs: StepTypeDefinition[];
};

function FlowCanvasInner({
  diagramId,
  steps,
  edges,
  linkedHazardByStep,
  confirmedCcpHazards,
  confirmedOprpHazards,
  attributeDefs,
  stepAttributesByStep,
  stepTypeDefs,
}: FlowCanvasProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const handleRename = useCallback(
    async (stepId: string, newName: string) => {
      const trimmed = newName.trim();
      if (trimmed.length === 0) {
        router.refresh();
        return;
      }
      await renameStep(stepId, diagramId, trimmed);
      router.refresh();
    },
    [diagramId, router]
  );

  const handleDeleteEdge = useCallback(
    async (edgeId: string) => {
      await deleteEdge(diagramId, edgeId);
      router.refresh();
    },
    [diagramId, router]
  );

  const builtNodes: Node<StepNodeData>[] = useMemo(
    () =>
      steps.map((s) => {
        let linkedLabel: string | null = null;
        const linkedId = linkedHazardByStep[s.id];
        if (linkedId) {
          const pool =
            s.node_shape === "trekant_ccp"
              ? confirmedCcpHazards
              : s.node_shape === "trekant_oprp"
                ? confirmedOprpHazards
                : [];
          const found = pool.find((h) => h.id === linkedId);
          linkedLabel = found ? `Trin ${found.stepNo} · ${found.label}` : null;
        }
        const stepTypeLabel = s.step_type
          ? stepTypeDefs.find((t) => t.id === s.step_type)?.label ?? s.step_type
          : null;
        return {
          id: s.id,
          type: "step",
          position: { x: Number(s.pos_x), y: Number(s.pos_y) },
          data: { step: s, onRename: handleRename, linkedLabel, stepTypeLabel },
          deletable: false,
        };
      }),
    [
      steps,
      handleRename,
      linkedHazardByStep,
      confirmedCcpHazards,
      confirmedOprpHazards,
      stepTypeDefs,
    ]
  );

  const builtEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        type: "deletable",
        source: e.from_step,
        target: e.to_step,
        sourceHandle: e.from_handle ?? undefined,
        targetHandle: e.to_handle ?? undefined,
        label: e.label ?? undefined,
        style: { stroke: "#C9600F", strokeWidth: 1.5 },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: "#C9600F",
        },
        data: { onDelete: handleDeleteEdge },
      })),
    [edges, handleDeleteEdge]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(builtEdges);

  useEffect(() => {
    setNodes(builtNodes);
  }, [builtNodes, setNodes]);

  useEffect(() => {
    setRfEdges(builtEdges);
  }, [builtEdges, setRfEdges]);

  const onNodeDragStop = useCallback(
    async (_: unknown, node: Node) => {
      await saveStepPosition(node.id, node.position.x, node.position.y);
    },
    []
  );

  const onConnect = useCallback(
    async (conn: Connection) => {
      if (!conn.source || !conn.target) return;
      const res = await createEdge(
        diagramId,
        conn.source,
        conn.target,
        conn.sourceHandle ?? null,
        conn.targetHandle ?? null
      );
      if (!res.ok) {
        // Midlertidig, synlig fejlbesked - vi skal vide OM den rammer her,
        // hvis forbindelser stadig ikke virker efter denne rettelse.
        window.alert(
          "Forbindelsen kunne ikke gemmes. Sig til Claude at fejlen ramte createEdge/serveren, ikke selve trækket."
        );
        return;
      }
      router.refresh();
    },
    [diagramId, router]
  );

  const onEdgesDelete = useCallback(
    async (deleted: Edge[]) => {
      for (const e of deleted) {
        await deleteEdge(diagramId, e.id);
      }
      router.refresh();
    },
    [diagramId, router]
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const shape = event.dataTransfer.getData(
        "application/aiqms-shape"
      ) as NodeShape;
      if (!shape || !wrapperRef.current) return;

      const bounds = wrapperRef.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      const res = await createStepQuick(
        diagramId,
        shape,
        position.x,
        position.y
      );
      if (res.ok) router.refresh();
    },
    [diagramId, project, router]
  );

  const selectedStep = steps.find((s) => s.id === selectedId) ?? null;
  const showCcpPicker = selectedStep?.node_shape === "trekant_ccp";
  const showOprpPicker = selectedStep?.node_shape === "trekant_oprp";
  const pickerOptions = showCcpPicker
    ? confirmedCcpHazards
    : showOprpPicker
      ? confirmedOprpHazards
      : [];

  const showEditPanel = selectedStep?.node_shape === "rektangel";

  return (
    <div className="space-y-6">
    <div className="flex flex-col gap-4 sm:flex-row">
      <div className="flex flex-row flex-wrap gap-2 sm:w-48 sm:flex-none sm:flex-col">
        {showCcpPicker || showOprpPicker ? (
          <div>
            <p className="label">
              Vælg {showCcpPicker ? "CCP" : "oPRP"}
            </p>
            <select
              value={
                selectedStep ? linkedHazardByStep[selectedStep.id] ?? "" : ""
              }
              onChange={async (e) => {
                if (!selectedStep) return;
                await linkHazard(
                  selectedStep.id,
                  diagramId,
                  e.target.value || null
                );
                router.refresh();
              }}
              className="mt-2 w-full rounded-sm border border-raw-edge bg-raw
                         px-2 py-1.5 text-[13px] outline-none focus:border-brand"
            >
              <option value="">– Ikke koblet –</option>
              {pickerOptions.map((h) => (
                <option key={h.id} value={h.id}>
                  Trin {h.stepNo} · {h.label}
                </option>
              ))}
            </select>
            {pickerOptions.length === 0 ? (
              <p className="mt-2 text-[12px] text-ink-faint">
                Ingen bekræftede {showCcpPicker ? "CCP'er" : "oPRP'er"} endnu.
                Opret dem først i risikomodulet.
              </p>
            ) : null}
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="mt-3 text-[12px] text-ink-faint underline"
            >
              ← Tilbage til paletten
            </button>
          </div>
        ) : (
          <>
            <p className="label hidden w-full sm:block">Træk ud</p>
            {NODE_SHAPES.map((shape) => (
              <PaletteItem key={shape} shape={shape} />
            ))}
          </>
        )}
      </div>

      <div
        ref={wrapperRef}
        onDragOver={onDragOver}
        onDrop={onDrop}
        className="h-[560px] flex-1 border border-raw-edge bg-raw-deep"
      >
        <ReactFlow
          nodes={nodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeClick={(_, node) => setSelectedId(node.id)}
          onPaneClick={() => setSelectedId(null)}
          onConnect={onConnect}
          connectionMode={ConnectionMode.Loose}
          onEdgesDelete={onEdgesDelete}
          deleteKeyCode={["Backspace", "Delete"]}
          fitView
          fitViewOptions={{ padding: 0.25 }}
          proOptions={{ hideAttribution: true }}
        >
          <Background color="#DFD6C4" gap={20} size={1.5} />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
    </div>

    {showEditPanel && selectedStep ? (
      <StepEditPanel
        diagramId={diagramId}
        step={selectedStep}
        attributeDefs={attributeDefs}
        existingAttrs={stepAttributesByStep[selectedStep.id] ?? []}
        stepTypeDefs={stepTypeDefs}
        onClose={() => setSelectedId(null)}
      />
    ) : null}
    </div>
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
