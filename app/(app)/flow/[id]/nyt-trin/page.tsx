// app/(app)/flow/[id]/nyt-trin/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  STEP_TYPES,
  STEP_TYPE_LABELS,
  definitionsForStepType,
  type AttributeDefinition,
  type StepType,
} from "@/lib/flow/types";
import { createStep } from "../../actions";

const FEJL_TEKST: Record<string, string> = {
  type: "Vælg en trin-type.",
  navn: "Giv trinnet et navn (mindst 2 tegn).",
  ukendt: "Kunne ikke gemme trinnet. Prøv igen.",
};

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw px-3 py-2 " +
  "text-[16px] outline-none transition-colors focus:border-brand";

function AttributFelt({
  def,
  defaultValue,
  prefillNote,
}: {
  def: AttributeDefinition;
  defaultValue?: string;
  prefillNote?: string;
}) {
  const name = `attr_${def.id}`;

  return (
    <div>
      <label htmlFor={name} className="label">
        {def.label}
        {def.unit ? ` (${def.unit})` : ""}
        {def.required ? " *" : ""}
      </label>

      {def.value_type === "boolean" ? (
        <label className="mt-1.5 flex items-center gap-2 text-[15px]">
          <input id={name} name={name} type="checkbox" className="h-4 w-4" />
          Ja
        </label>
      ) : def.value_type === "select" ? (
        <select
          id={name}
          name={name}
          required={def.required}
          defaultValue={defaultValue ?? ""}
          className={inputCls}
        >
          <option value="" disabled>
            Vælg …
          </option>
          {(def.options ?? []).map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </select>
      ) : (
        <input
          id={name}
          name={name}
          type={def.value_type === "number" ? "number" : "text"}
          step={def.value_type === "number" ? "any" : undefined}
          required={def.required}
          defaultValue={defaultValue}
          className={inputCls}
        />
      )}

      {prefillNote ? (
        <p className="mt-1 text-[13px] text-brand">{prefillNote}</p>
      ) : def.help_text ? (
        <p className="mt-1 text-[13px] text-ink-faint">
          {def.help_text}
          {def.standard_ref ? ` · ${def.standard_ref}` : ""}
        </p>
      ) : null}
    </div>
  );
}

export default async function NytTrinPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { type?: string; fejl?: string };
}) {
  const supabase = createClient();

  const { data: diagram } = await supabase
    .from("flow_diagrams")
    .select("id, name")
    .eq("id", params.id)
    .maybeSingle();

  if (!diagram) notFound();

  const valgtType = STEP_TYPES.includes(searchParams.type as StepType)
    ? (searchParams.type as StepType)
    : null;

  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  let defs: AttributeDefinition[] = [];

  // Udgangstemperatur fra forrige trin – forudfylder dette trins
  // indgangstemperatur, så samme tal ikke tastes to gange.
  let forrigeUdgangstemp: string | undefined;

  if (valgtType) {
    const { data } = await supabase
      .from("attribute_definitions")
      .select("*")
      .contains("applies_to", [valgtType]);
    defs = definitionsForStepType(
      (data ?? []) as AttributeDefinition[],
      valgtType
    );

    const { data: forrigeTrin } = await supabase
      .from("process_steps")
      .select("id")
      .eq("diagram_id", diagram.id)
      .order("step_no", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (forrigeTrin) {
      const { data: udgangstemp } = await supabase
        .from("step_attributes")
        .select("value_num")
        .eq("step_id", forrigeTrin.id)
        .eq("attr_id", "kernetemp_ud")
        .maybeSingle();

      if (udgangstemp?.value_num != null) {
        forrigeUdgangstemp = String(udgangstemp.value_num);
      }
    }
  }

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">
          <Link href="/flow" className="underline hover:text-brand">
            Flowdiagram
          </Link>{" "}
          ·{" "}
          <Link
            href={`/flow/${diagram.id}`}
            className="underline hover:text-brand"
          >
            {diagram.name}
          </Link>
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          Nyt procestrin
        </h1>
      </header>

      {/* Skridt 1: vælg type */}
      <section className="mt-8">
        <h2 className="label rule-double pb-2">
          1. Trin-type{valgtType ? `: ${STEP_TYPE_LABELS[valgtType]}` : ""}
        </h2>
        <div className="mt-4 flex flex-wrap gap-2">
          {STEP_TYPES.map((t) => (
            <Link
              key={t}
              href={`/flow/${diagram.id}/nyt-trin?type=${t}`}
              className={`rounded-sm border px-3 py-1.5 text-[14px] transition-colors ${
                valgtType === t
                  ? "border-brand bg-brand text-raw"
                  : "border-raw-edge bg-raw-deep hover:border-brand"
              }`}
            >
              {STEP_TYPE_LABELS[t]}
            </Link>
          ))}
        </div>
        {!valgtType ? (
          <p className="mt-3 text-[14px] text-ink-faint">
            Typen bestemmer hvilke felter der spørges om – og senere hvilke
            farer risikoanalysen foreslår.
          </p>
        ) : null}
      </section>

      {/* Skridt 2: formular */}
      {valgtType ? (
        <form action={createStep} className="mt-10 space-y-8">
          <input type="hidden" name="diagram_id" value={diagram.id} />
          <input type="hidden" name="step_type" value={valgtType} />

          <section>
            <h2 className="label rule-double pb-2">2. Om trinnet</h2>
            <p className="mt-2 text-[13px] text-ink-faint">
              Kun navnet er påkrævet. Resten kan du udfylde nu eller lade stå
              tomt.
            </p>
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="name" className="label">
                  Trinnets navn *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  minLength={2}
                  placeholder={`Fx ${STEP_TYPE_LABELS[valgtType]} af kølet okse`}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="location_zone" className="label">
                  Zone/lokation
                </label>
                <input
                  id="location_zone"
                  name="location_zone"
                  type="text"
                  placeholder="Fx rå-zone, kølerum 2"
                  className={inputCls}
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
                  placeholder="Fx produktionsmedarbejder"
                  className={inputCls}
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
                  placeholder="Fx hakker H1, vakuumpakker"
                  className={inputCls}
                />
              </div>
              <div className="flex flex-col justify-end gap-2 pb-1">
                <label className="flex items-center gap-2 text-[15px]">
                  <input
                    name="product_open"
                    type="checkbox"
                    className="h-4 w-4"
                  />
                  Produktet er åbent/ubeskyttet
                </label>
                <label className="flex items-center gap-2 text-[15px]">
                  <input
                    name="person_contact"
                    type="checkbox"
                    className="h-4 w-4"
                  />
                  Direkte personkontakt med produktet
                </label>
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
                  className={inputCls}
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
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor="max_dwell_min" className="label">
                  Maks. opholdstid (min)
                </label>
                <input
                  id="max_dwell_min"
                  name="max_dwell_min"
                  type="number"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="input_desc" className="label">
                  Input (hvad kommer ind)
                </label>
                <input
                  id="input_desc"
                  name="input_desc"
                  type="text"
                  placeholder="Fx fersk okse i fjerdinger, kølet"
                  className={inputCls}
                />
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="output_desc" className="label">
                  Output (hvad kommer ud)
                </label>
                <input
                  id="output_desc"
                  name="output_desc"
                  type="text"
                  placeholder="Fx udbenet kød i kasser"
                  className={inputCls}
                />
              </div>
            </div>
          </section>

          {defs.length > 0 ? (
            <section>
              <h2 className="label rule-double pb-2">
                3. Specifikt for {STEP_TYPE_LABELS[valgtType].toLowerCase()}
              </h2>
              <p className="mt-2 text-[13px] text-ink-faint">
                Ingen af felterne herunder er påkrævede.
              </p>
              <div className="mt-4 grid gap-5 sm:grid-cols-2">
                {defs.map((d) => (
                  <AttributFelt
                    key={d.id}
                    def={d}
                    defaultValue={
                      d.id === "kernetemp_ind" ? forrigeUdgangstemp : undefined
                    }
                    prefillNote={
                      d.id === "kernetemp_ind" && forrigeUdgangstemp
                        ? "Forudfyldt fra forrige trins udgangstemperatur – ret det, hvis der er sket noget undervejs (fx transport eller nedkøling)."
                        : undefined
                    }
                  />
                ))}
              </div>
            </section>
          ) : null}

          {fejl ? (
            <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2 text-[14px] text-state-bad">
              {fejl}
            </p>
          ) : null}

          <div className="flex gap-3">
            <button type="submit" className="btn">
              Gem trin
            </button>
            <Link href={`/flow/${diagram.id}`} className="btn-quiet">
              Annullér
            </Link>
          </div>
        </form>
      ) : null}
    </main>
  );
}
