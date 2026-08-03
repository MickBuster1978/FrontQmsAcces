// app/(app)/risiko/[diagramId]/[stepId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { STEP_TYPE_LABELS, type ProcessStep } from "@/lib/flow/types";
import {
  FARE_KATEGORI_LABELS,
  definitionsForStep,
  risikoTone,
  type FareKategori,
  type HazardDefinition,
  type StepHazard,
} from "@/lib/risiko/types";
import {
  afvisHazard,
  sletHazard,
  tilfoejHazard,
  updateHazard,
} from "../../actions";

const FEJL_TEKST: Record<string, string> = {
  navn: "Giv faren en beskrivelse (mindst 2 tegn).",
};

const KATEGORIER: FareKategori[] = ["biologisk", "kemisk", "fysisk"];

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw px-3 py-2 " +
  "text-[15px] outline-none transition-colors focus:border-brand";

function ToneBadge({ score }: { score: number }) {
  const tone = risikoTone(score);
  const cls =
    tone === "bad"
      ? "border-state-bad/30 bg-state-bad/5 text-state-bad"
      : tone === "warn"
        ? "border-state-warn/30 bg-state-warn/5 text-state-warn"
        : "border-state-ok/30 bg-state-ok/5 text-state-ok";
  return (
    <span
      className={`tabular rounded-sm border px-1.5 py-0.5 text-[13px] ${cls}`}
    >
      Score {score}
    </span>
  );
}

function StatusBadge({ status }: { status: StepHazard["status"] }) {
  const cls =
    status === "bekraeftet"
      ? "border-state-ok/30 bg-state-ok/5 text-state-ok"
      : status === "afvist"
        ? "border-ink/15 text-ink-faint"
        : "border-state-warn/30 bg-state-warn/5 text-state-warn";
  const label =
    status === "bekraeftet"
      ? "Bekræftet"
      : status === "afvist"
        ? "Afvist"
        : "Forslag";
  return (
    <span className={`rounded-sm border px-1.5 py-0.5 text-[12px] ${cls}`}>
      {label}
    </span>
  );
}

export default async function TrinRisikoPage({
  params,
  searchParams,
}: {
  params: { diagramId: string; stepId: string };
  searchParams: { fejl?: string };
}) {
  const supabase = createClient();

  const { data: step } = await supabase
    .from("process_steps")
    .select("*")
    .eq("id", params.stepId)
    .eq("diagram_id", params.diagramId)
    .maybeSingle();

  if (!step) notFound();
  const s = step as ProcessStep;

  const { data: defs } = await supabase.from("hazard_definitions").select("*");
  // Trin uden type (fx oprettet blankt fra paletten) matcher ingen
  // regler endnu - det er korrekt, ikke en fejl.
  const matching = s.step_type
    ? definitionsForStep(
        (defs ?? []) as HazardDefinition[],
        s.step_type,
        s.product_open,
        s.person_contact
      )
    : [];

  const { data: eksisterende } = await supabase
    .from("step_hazards")
    .select("*")
    .eq("step_id", s.id);

  const kendteDefIds = new Set(
    ((eksisterende ?? []) as StepHazard[])
      .map((h) => h.hazard_def_id)
      .filter((id): id is string => id !== null)
  );

  // Materialisér kun de forslag der endnu ikke findes for trinnet
  const manglende = matching.filter((def) => !kendteDefIds.has(def.id));
  if (manglende.length > 0) {
    await supabase.from("step_hazards").insert(
      manglende.map((def) => ({
        step_id: s.id,
        org_id: s.org_id,
        hazard_def_id: def.id,
        category: def.category,
        label: def.label,
        description: def.description,
        sandsynlighed: def.default_sandsynlighed,
        konsekvens: def.default_konsekvens,
        status: "forslag" as const,
      }))
    );
  }

  const { data: samlet } = await supabase
    .from("step_hazards")
    .select("*")
    .eq("step_id", s.id)
    .order("category")
    .order("created_at");

  const hazardList = (samlet ?? []) as StepHazard[];
  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">
          <Link href="/risiko" className="underline hover:text-brand">
            Risikoanalyse
          </Link>{" "}
          ·{" "}
          <Link
            href={`/risiko/${params.diagramId}`}
            className="underline hover:text-brand"
          >
            Trin
          </Link>
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          {s.name}
        </h1>
        <p className="mt-1 text-[14px] text-ink-faint">
          Trin {s.step_no} ·{" "}
          {s.step_type ? STEP_TYPE_LABELS[s.step_type] : "Type ikke sat"}
          {s.location_zone ? ` · ${s.location_zone}` : ""}
        </p>
      </header>

      {hazardList.length === 0 ? (
        <p className="mt-8 text-[15px] text-ink-faint">
          Ingen fareregler matcher dette trin endnu. Tilføj en fare manuelt
          herunder, eller sæt en type på trinnet i flowdiagrammet.
        </p>
      ) : (
        <div className="mt-8 space-y-10">
          {KATEGORIER.map((kat) => {
            const iKategori = hazardList.filter((h) => h.category === kat);
            if (iKategori.length === 0) return null;

            return (
              <section key={kat}>
                <h2 className="label rule-double pb-2">
                  {FARE_KATEGORI_LABELS[kat]}
                </h2>
                <div className="mt-4 space-y-4">
                  {iKategori.map((h) => {
                    const klassifikationNu = h.er_ccp
                      ? "ccp"
                      : h.er_oprp
                        ? "oprp"
                        : "ingen";
                    return (
                      <div
                        key={h.id}
                        className="border border-raw-edge bg-raw-deep p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-[16px] font-semibold">
                              {h.label}
                            </p>
                            {h.description ? (
                              <p className="mt-1 text-[14px] text-ink-soft">
                                {h.description}
                              </p>
                            ) : null}
                          </div>
                          <div className="flex items-center gap-2">
                            <ToneBadge score={h.risikoscore} />
                            <StatusBadge status={h.status} />
                          </div>
                        </div>

                        <form
                          action={updateHazard}
                          className="mt-4 grid gap-4 sm:grid-cols-2"
                        >
                          <input type="hidden" name="hazard_id" value={h.id} />
                          <input
                            type="hidden"
                            name="diagram_id"
                            value={params.diagramId}
                          />
                          <input type="hidden" name="step_id" value={s.id} />

                          <div>
                            <label className="label">
                              Sandsynlighed (1-3)
                            </label>
                            <input
                              name="sandsynlighed"
                              type="number"
                              min={1}
                              max={3}
                              defaultValue={h.sandsynlighed}
                              className={inputCls}
                            />
                          </div>
                          <div>
                            <label className="label">Konsekvens (1-3)</label>
                            <input
                              name="konsekvens"
                              type="number"
                              min={1}
                              max={3}
                              defaultValue={h.konsekvens}
                              className={inputCls}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <label className="label">Klassifikation</label>
                            <div className="mt-1.5 flex flex-wrap items-center gap-5">
                              <label className="flex items-center gap-2 text-[14px]">
                                <input
                                  type="radio"
                                  name="klassifikation"
                                  value="ingen"
                                  defaultChecked={klassifikationNu === "ingen"}
                                  className="h-4 w-4"
                                />
                                Ingen af delene
                              </label>
                              <label className="flex items-center gap-2 text-[14px]">
                                <input
                                  type="radio"
                                  name="klassifikation"
                                  value="ccp"
                                  defaultChecked={klassifikationNu === "ccp"}
                                  className="h-4 w-4"
                                />
                                CCP
                              </label>
                              <label className="flex items-center gap-2 text-[14px]">
                                <input
                                  type="radio"
                                  name="klassifikation"
                                  value="oprp"
                                  defaultChecked={klassifikationNu === "oprp"}
                                  className="h-4 w-4"
                                />
                                oPRP
                              </label>
                            </div>
                          </div>

                          <div className="sm:col-span-2">
                            <label className="label">
                              Begrundelse (fx for CCP/oPRP-klassifikation)
                            </label>
                            <textarea
                              name="begrundelse"
                              rows={2}
                              defaultValue={h.begrundelse ?? ""}
                              className={inputCls}
                            />
                          </div>

                          <div className="sm:col-span-2">
                            <button type="submit" className="btn">
                              Bekræft/gem
                            </button>
                          </div>
                        </form>

                        <div className="mt-3 flex gap-4 border-t border-ink/10 pt-3">
                          <form action={afvisHazard}>
                            <input
                              type="hidden"
                              name="hazard_id"
                              value={h.id}
                            />
                            <input
                              type="hidden"
                              name="diagram_id"
                              value={params.diagramId}
                            />
                            <input type="hidden" name="step_id" value={s.id} />
                            <button
                              type="submit"
                              className="text-[13px] text-ink-faint underline hover:text-state-bad"
                            >
                              Afvis – ikke relevant her
                            </button>
                          </form>
                          <form action={sletHazard}>
                            <input
                              type="hidden"
                              name="hazard_id"
                              value={h.id}
                            />
                            <input
                              type="hidden"
                              name="diagram_id"
                              value={params.diagramId}
                            />
                            <input type="hidden" name="step_id" value={s.id} />
                            <button
                              type="submit"
                              className="text-[13px] text-ink-faint underline hover:text-state-bad"
                            >
                              Slet
                            </button>
                          </form>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>
      )}

      {/* Tilføj manuel fare */}
      <section className="mt-14 border-t border-ink/10 pt-6">
        <h2 className="label">Tilføj fare manuelt</h2>
        <form
          action={tilfoejHazard}
          className="mt-4 flex flex-wrap items-end gap-3"
        >
          <input type="hidden" name="diagram_id" value={params.diagramId} />
          <input type="hidden" name="step_id" value={s.id} />
          <div>
            <label htmlFor="category" className="label">
              Kategori
            </label>
            <select
              name="category"
              id="category"
              defaultValue="biologisk"
              className={inputCls}
            >
              <option value="biologisk">Biologisk</option>
              <option value="kemisk">Kemisk</option>
              <option value="fysisk">Fysisk</option>
            </select>
          </div>
          <div className="flex-1">
            <label htmlFor="label" className="label">
              Beskrivelse
            </label>
            <input
              id="label"
              name="label"
              type="text"
              minLength={2}
              placeholder="Fx en fare der er specifik for jeres anlæg"
              className={inputCls}
            />
          </div>
          <div>
            <label htmlFor="klassifikation_ny" className="label">
              Klassifikation
            </label>
            <select
              name="klassifikation"
              id="klassifikation_ny"
              defaultValue="ingen"
              className={inputCls}
            >
              <option value="ingen">Ingen af delene</option>
              <option value="ccp">CCP</option>
              <option value="oprp">oPRP</option>
            </select>
          </div>
          <button type="submit" className="btn">
            Tilføj
          </button>
        </form>
        {fejl ? (
          <p className="mt-3 text-[14px] text-state-bad">{fejl}</p>
        ) : null}
      </section>
    </main>
  );
}
