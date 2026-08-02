// lib/flow/types.ts
// Typer der spejler supabase/migrations/002_flow_model.sql + 008/009.

export const STEP_TYPES = [
  "modtagelse",
  "koelelagring",
  "frostlagring",
  "optoening",
  "opskaering",
  "hakning",
  "tilsaetning",
  "vejning",
  "pakning",
  "maerkning",
  "metaldetektion",
  "frysning",
  "forsendelse",
  "transport",
  "intern_flytning",
] as const;

export type StepType = (typeof STEP_TYPES)[number];

export const STEP_TYPE_LABELS: Record<StepType, string> = {
  modtagelse: "Modtagelse",
  koelelagring: "Kølelagring",
  frostlagring: "Frostlagring",
  optoening: "Optøning",
  opskaering: "Opskæring",
  hakning: "Hakning",
  tilsaetning: "Tilsætning",
  vejning: "Vejning",
  pakning: "Pakning",
  maerkning: "Mærkning",
  metaldetektion: "Metaldetektion",
  frysning: "Frysning",
  forsendelse: "Forsendelse",
  transport: "Transport",
  intern_flytning: "Intern flytning",
};

/** Visuel form på canvas – uafhængig af step_type */
export const NODE_SHAPES = [
  "cirkel",
  "rektangel",
  "kvadrat",
  "rombe",
  "trekant_oprp",
  "trekant_ccp",
] as const;
export type NodeShape = (typeof NODE_SHAPES)[number];

export const NODE_SHAPE_LABELS: Record<NodeShape, string> = {
  cirkel: "Start",
  rektangel: "Procestrin",
  kvadrat: "Input",
  rombe: "Output",
  trekant_oprp: "oPRP",
  trekant_ccp: "CCP",
};

export type DiagramStatus = "kladde" | "aktiv" | "arkiveret";

export type FlowDiagram = {
  id: string;
  org_id: string;
  name: string;
  status: DiagramStatus;
  version: number;
  /** Styringsdatoer (dokumentstyring) – redigeres af brugeren */
  oprettet_dato: string | null;
  verificeret_dato: string | null;
  fornyelse_dato: string | null;
  ny_version_dato: string | null;
  created_at: string;
  updated_at: string;
};

export type ProcessStep = {
  id: string;
  diagram_id: string;
  org_id: string;
  step_no: number;
  name: string;
  /** Null for ikke-rektangel-noder – de er ikke en fysisk proces-type */
  step_type: StepType | null;
  node_shape: NodeShape;
  location_zone: string | null;
  product_open: boolean;
  person_contact: boolean;
  temp_target_c: number | null;
  temp_tolerance_c: number | null;
  max_dwell_min: number | null;
  equipment: string | null;
  responsible_role: string | null;
  input_desc: string | null;
  output_desc: string | null;
  pos_x: number;
  pos_y: number;
  created_at: string;
};

export type ProcessEdge = {
  id: string;
  diagram_id: string;
  org_id: string;
  from_step: string;
  to_step: string;
  /** Hvilken side forbindelsen sidder på: top/right/bottom/left */
  from_handle: string | null;
  to_handle: string | null;
  label: string | null;
};

export type AttributeValueType = "text" | "number" | "boolean" | "select";

export type AttributeDefinition = {
  id: string;
  label: string;
  help_text: string | null;
  value_type: AttributeValueType;
  unit: string | null;
  options: string[] | null;
  applies_to: StepType[];
  required: boolean;
  standard_ref: string | null;
  sort_order: number;
};

export type StepAttribute = {
  step_id: string;
  org_id: string;
  attr_id: string;
  value_text: string | null;
  value_num: number | null;
  value_bool: boolean | null;
};

/** Definitioner der gælder for en given trin-type, sorteret */
export function definitionsForStepType(
  defs: AttributeDefinition[],
  stepType: StepType
): AttributeDefinition[] {
  return defs
    .filter((d) => d.applies_to.includes(stepType))
    .sort((a, b) => a.sort_order - b.sort_order);
}

/** Læs værdien af en attribut uanset value_type */
export function attributeValue(
  attr: StepAttribute,
  def: AttributeDefinition
): string | number | boolean | null {
  switch (def.value_type) {
    case "number":
      return attr.value_num;
    case "boolean":
      return attr.value_bool;
    default:
      return attr.value_text;
  }
}
