// components/flow/FlowCanvas.tsx
"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  BaseEdge,
  Background,
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

/**
 * Farve pr. form. Rombens farve stod ikke specificeret – den bruger
 * derfor systemets neutrale standardfarve i stedet for at gætte.
 */
const SHAPE_COLOR: Record<NodeShape, string> = {
  cirkel: "#DCEEE3", // lysgrøn
  rektangel: "#DCE6F0", // lysblå
  kvadrat: "#FFFFFF", // hvid
  rombe: "#F3EEE3", // neutral (uspecificeret)
  trekant_oprp: "#F4E2CE", // lysorange
  trekant_ccp: "#A8321C", // rød
};

/** Trekant-noden CCP har lys tekst (rød baggrund), resten mørk tekst */
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
};

/** Fire forbindelsespunkter – top/højre/bund/venstre – hver med
 * source OG target stablet samme sted, så man kan forbinde fra
 * og til alle sider. */
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
        <div key={id}>
          <Handle
            type="target"
            position={pos}
            id={`${id}-target`}
            className={handleCls}
          />
          <Handle
            type="source"
            position={pos}
            id={`${id}-source`}
            className={handleCls}
          />
        </div>
      ))}
    </>
  );
}

/** Inputfelt til navnet. key={name} nulstiller feltet korrekt når
 * navnet ændres udefra (fx efter et refresh). */
function NameField({
  id,
  name,
  onRename,
  align = "left",
  light = false,
}: {
  id: string;
  name: string;
  onRename: (stepId: string, newName: string) => void;
  align?: "left" | "center";
  light?: boolean;
}) {
  const cls = [
    "nodrag w-full border-none bg-transparent p-0 outline-none",
    "text-[12px] font-semibold leading-snug",
    align === "center" ? "text-center" : "",
    light ? "text-raw placeholder:text-raw/70" : "text-ink",
    "focus:bg-raw focus:px-1 focus:py-0.5 focus:text-ink",
  ].join(" ");

  return (
    <input
      key={name}
      defaultValue={name}
      onBlur={(e) => onRename(id, e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
      }}
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
              {s.step_no}.{" "}
              {s.step_type ? STEP_TYPE_LABELS[s.step_type] : "Type ikke sat"}
            </p>
          </div>
          <div className="px-3 py-2">
            <NameField id={id} name={s.name} onRename={data.onRename} />
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

  if (shape === "cirkel") {
    return (
      <div className="relative">
        <FourSideHandles />
        <div
          className="flex h-24 w-24 items-center justify-center rounded-full
                     border border-raw-edge text-center shadow-sm"
          style={{ backgroundColor: color }}
        >
          <div className="px-2">
            <NameField
              id={id}
              name={s.name}
              onRename={data.onRename}
              align="center"
            />
          </div>
        </div>
      </div>
    );
  }

  if (shape === "kvadrat") {
    return (
      <div className="relative">
        <FourSideHandles />
        <div
          className="flex h-24 w-24 items-center justify-center
                     border border-raw-edge text-center shadow-sm"
          style={{ backgroundColor: color }}
        >
          <div className="px-2">
            <NameField
              id={id}
              name={s.name}
              onRename={data.onRename}
              align="center"
            />
          </div>
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
              <NameField
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

  // trekant_oprp / trekant_ccp – form øverst, navn som billedtekst nedenunder
  return (
    <div className="relative flex w-24 flex-col items-center">
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
      <div className="mt-1 w-full text-center">
        <NameField
          id={id}
          name={s.name}
          onRename={data.onRename}
          align="center"
          light={light}
        />
      </div>
    </div>
  );
}

const nodeTypes = { step: StepNode };

/** Kant med et lille × ved midtpunktet. */
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

/** Palet-chip: farvet firkant + label. */
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
  /** Vestigial indtil næste batch fjerner den fra page.tsx – ubrugt her. */
  hazardFlags?: Record<string, { ccp: boolean; oprp: boolean }>;
};

function FlowCanvasInner({ diagramId, steps, edges }: FlowCanvasProps) {
  const router = useRouter();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const { project } = useReactFlow();

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
      steps.map((s) => ({
        id: s.id,
        type: "step",
        position: { x: Number(s.pos_x), y: Number(s.pos_y) },
        data: { step: s, onRename: handleRename },
        deletable: false,
      })),
    [steps, handleRename]
  );

  const builtEdges: Edge[] = useMemo(
    () =>
      edges.map((e) => ({
        id: e.id,
        type: "deletable",
        source: e.from_step,
        target: e.to_step,
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
      <div className="flex flex-row flex-wrap gap-2 sm:w-40 sm:flex-none sm:flex-col">
        <p className="label hidden w-full sm:block">Træk ud</p>
        {NODE_SHAPES.map((shape) => (
          <PaletteItem key={shape} shape={shape} />
        ))}
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
