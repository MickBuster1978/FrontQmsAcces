// components/flow/FlowCanvas.tsx
"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import ReactFlow, {
  Background,
  Controls,
  Handle,
  Position,
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
  type ProcessEdge,
  type ProcessStep,
} from "@/lib/flow/types";
import {
  createEdge,
  deleteEdge,
  saveStepPosition,
} from "@/app/(app)/flow/actions";

type StepNodeData = {
  step: ProcessStep;
  erCcp: boolean;
  erOprp: boolean;
};

/**
 * Custom node.
 * - Øverste forbindelsespunkt (input) er en rombe.
 * - Nederste forbindelsespunkt (output) er en cirkel.
 * - CCP/oPRP-badge i hjørnet, men KUN for bekræftede farer – et
 *   forslag der ikke er taget stilling til, skal ikke se ud som en
 *   afklaret CCP på diagrammet.
 */
function StepNode({ data }: NodeProps<StepNodeData>) {
  const s = data.step;
  return (
    <div className="relative w-56 rounded-sm border border-raw-edge bg-raw-deep shadow-sm">
      {/* Input – rombe */}
      <Handle
        type="target"
        position={Position.Top}
        title={s.input_desc ?? "Input"}
        className="!h-2.5 !w-2.5 !rotate-45 !rounded-none !border-raw !bg-brand"
      />

      {/* CCP / oPRP badges */}
      {data.erCcp || data.erOprp ? (
        <div className="absolute -right-1.5 -top-1.5 flex gap-0.5">
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

      <div className="border-b border-raw-edge px-3 py-1.5">
        <p className="text-[10px] uppercase tracking-label text-ink-faint">
          {s.step_no}. {STEP_TYPE_LABELS[s.step_type]}
        </p>
      </div>
      <div className="px-3 py-2">
        <p className="text-[14px] font-semibold leading-snug">{s.name}</p>
        <p className="mt-1 text-[12px] text-ink-soft">
          {s.temp_target_c != null ? `${s.temp_target_c}°C` : "–"}
          {s.location_zone ? ` · ${s.location_zone}` : ""}
        </p>
        <p className="mt-0.5 text-[11px] text-ink-faint">
          {s.product_open ? "Åbent produkt" : "Lukket produkt"}
          {s.person_contact ? " · personkontakt" : ""}
        </p>
      </div>

      {/* Output – cirkel */}
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

export type FlowCanvasProps = {
  diagramId: string;
  steps: ProcessStep[];
  edges: ProcessEdge[];
  /** step_id -> er der en BEKRÆFTET CCP/oPRP-fare på trinnet */
  hazardFlags: Record<string, { ccp: boolean; oprp: boolean }>;
};

export default function FlowCanvas({
  diagramId,
  steps,
  edges,
  hazardFlags,
}: FlowCanvasProps) {
  const router = useRouter();

  const initialNodes: Node<StepNodeData>[] = useMemo(
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

  const initialEdges: Edge[] = useMemo(
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

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialEdges);

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

  return (
    <div className="h-[560px] border border-raw-edge bg-raw-deep">
      <ReactFlow
        nodes={nodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
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
  );
}
