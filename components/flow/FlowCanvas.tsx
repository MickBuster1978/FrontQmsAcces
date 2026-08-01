// components/flow/FlowCanvas.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
  ReactFlowProvider,
  useReactFlow,
  type Connection,
  type Edge,
  type Node,
  type NodeProps,
  useEdgesState,
  useNodesState,
} from "reactflow";
import "reactflow/dist/style.css";
import {
  STEP_TYPE_LABELS,
  type NodeShape,
  type ProcessEdge,
  type ProcessStep,
} from "@/lib/flow/types";
import {
  createEdge,
  createStepQuick,
  deleteEdge,
  renameStep,
  saveStepPosition,
} from "@/app/(app)/flow/actions";

type StepNodeData = {
  step: ProcessStep;
  erCcp: boolean;
  erOprp: boolean;
};

/** Formen omkring nodens indhold – rektangel/rombe/cirkel */
function ShapeBody({
  shape,
  children,
}: {
  shape: NodeShape;
  children: React.ReactNode;
}) {
  if (shape === "rombe") {
    return (
      <div className="flex h-32 w-32 items-center justify-center">
        <div className="flex h-20 w-20 rotate-45 items-center justify-center border border-raw-edge bg-raw-deep shadow-sm">
          <div className="w-16 -rotate-45 text-center text-[12px] leading-snug">
            {children}
          </div>
        </div>
      </div>
    );
  }
  if (shape === "cirkel") {
    return (
      <div className="flex h-28 w-28 items-center justify-center rounded-full border border-raw-edge bg-raw-deep text-center shadow-sm">
        <div className="px-2 text-[12px] leading-snug">{children}</div>
      </div>
    );
  }
  return (
    <div className="w-56 rounded-sm border border-raw-edge bg-raw-deep shadow-sm">
      {children}
    </div>
  );
}

/**
 * Custom node. Rektangel viser fulde fakta (type, temp, zone).
 * Rombe/cirkel viser kun navnet. CCP/oPRP-badge vises for alle
 * former, men kun for BEKRÆFTEDE farer.
 */
function StepNode({ data }: NodeProps<StepNodeData>) {
  const s = data.step;
  const shape = s.node_shape;

  return (
    <div className="relative">
      <Handle
        type="target"
        position={Position.Top}
        title={s.input_desc ?? "Input"}
        className="!h-2.5 !w-2.5 !rotate-45 !rounded-none !border-raw !bg-brand"
      />

      {data.erCcp || data.erOprp ? (
        <div className="absolute -right-1.5 -top-1.5 z-10 flex gap-0.5">
          {data.erCcp ? (
            <span
              className="text-[15px] leading-none text-state-bad"
              title="CCP – kritisk kontrolpunkt (bekræftet)"
            >
              ▲
            </span>
          ) : null}
          {data.erOprp ? (
            <span
              className="text-[15px] leading-none text-state-warn"
              title="oPRP – operationelt forudsætningsprogram (bekræftet)"
            >
              ▲
            </span>
          ) : null}
        </div>
      ) : null}

      <ShapeBody shape={shape}>
        {shape === "rektangel" ? (
          <>
            <div className="border-b border-raw-edge px-3 py-1.5">
              <p className="text-[10px] uppercase tracking-label text-ink-faint">
                {s.step_no}.{" "}
                {s.step_type ? STEP_TYPE_LABELS[s.step_type] : "Type ikke sat"}
              </p>
            </div>
            <div className="px-3 py-2">
              <p className="text-[14px] font-semibold leading-snug">
                {s.name}
              </p>
              <p className="mt-1 text-[12px] text-ink-soft">
                {s.temp_target_c != null ? `${s.temp_target_c}°C` : "–"}
                {s.location_zone ? ` · ${s.location_zone}` : ""}
              </p>
              <p className="mt-0.5 text-[11px] text-ink-faint">
                {s.product_open ? "Åbent produkt" : "Lukket produkt"}
                {s.person_contact ? " · personkontakt" : ""}
              </p>
            </div>
          </>
        ) : (
          <p className="font-semibold">{s.name}</p>
        )}
      </ShapeBody>

      <Handle
        type="source"
        position={Position.Bottom}
        title={s.output_desc ?? "Output"}
        className="!h-2.5 !w-2.5 !rounded-full !border-raw !bg-brand"
      />
    </div>
  );
}

const nodeTypes = { step: StepNode };

function PaletteItem({
  shape,
  label,
  symbol,
}: {
  shape: NodeShape;
  label: string;
  symbol: string;
}) {
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
      <span className="w-4 text-center text-[16px] leading-none text-brand">
        {symbol}
      </span>
      {label}
    </div>
  );
}

export type FlowCanvasProps = {
  diagramId: string;
  steps: ProcessStep[];
  edges: ProcessEdge[];
  hazardFlags: Record<string, { ccp: boolean; oprp: boolean }>;
};

function FlowCanvasInner({
  diagramId,
  steps,
  edges,
  hazardFlags,
}: FlowCanvasProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

  const builtNodes: Node<StepNodeData>[] = useMemo(
    () =>
      steps.map((s) => ({
        id: s.id,
        type: "step",
        position: { x: Number(s.pos_x), y: Number(s.pos_y) },
        data: {
          step: s,
          erCcp: hazardFlags[s.id]?.ccp ?? false,
          erOprp: hazardFlags[s.id]?.oprp ?? false,
        },
        deletable: false, // trin slettes i tabellen, ikke med tastetryk
      })),
    [steps, hazardFlags]
  );

  const builtEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        source: e.from_step,
        target: e.to_step,
        label: e.label ?? undefined,
        style: { stroke: "#C9600F", strokeWidth: 1.5 },
      })),
    [edges]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState(builtNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(builtEdges);

  // useNodesState/useEdgesState sætter kun tilstanden ved FØRSTE render.
  // Når serveren sender nye steps/edges ned (fx efter router.refresh()
  // ved oprettelse fra paletten), skal canvasset eksplicit synkroniseres –
  // ellers ser det nye trin ud til at forsvinde, selvom det ligger korrekt
  // i databasen (tabellen nedenunder viser det jo, den er ikke ramt af dette).
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
      const res = await createEdge(diagramId, conn.source, conn.target);
      if (res.ok) router.refresh();
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

  const onNodeDoubleClick = useCallback(
    async (_: unknown, node: Node<StepNodeData>) => {
      const nytNavn = window.prompt("Nyt navn:", node.data.step.name);
      if (nytNavn && nytNavn.trim().length > 0) {
        await renameStep(node.id, diagramId, nytNavn);
        router.refresh();
      }
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

  return (
    <div className="flex flex-col gap-4 sm:flex-row">
      {/* Palet */}
      <div className="flex flex-row gap-2 sm:w-44 sm:flex-none sm:flex-col">
        <p className="label hidden sm:block">Træk ud på diagrammet</p>
        <PaletteItem shape="rektangel" label="Procestrin" symbol="▭" />
        <PaletteItem shape="rombe" label="Beslutning" symbol="◇" />
        <PaletteItem shape="cirkel" label="Start/slut" symbol="○" />
      </div>

      {/* Canvas */}
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
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodeDragStop={onNodeDragStop}
          onNodeDoubleClick={onNodeDoubleClick}
          onConnect={onConnect}
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
  );
}

export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
