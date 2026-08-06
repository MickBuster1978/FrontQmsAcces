// app/(app)/dokumenter/[kategoriId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DOKUMENT_STATUS_LABELS,
  type DocumentKategori,
  type Dokument,
} from "@/lib/dokumenter/types";
import { redigerDokument, sletDokument, uploadDokument } from "../actions";

/** Lokal udvidelse med diagram_id og ccp_oprp_type, uden at ændre den delte Dokument-type */
type DokumentMedDiagram = Dokument & {
  diagram_id: string | null;
  ccp_oprp_type: "ccp" | "oprp" | null;
};

const FEJL_TEKST: Record<string, string> = {
  titel: "Giv dokumentet en titel (mindst 2 tegn).",
  upload: "Filen kunne ikke uploades. Prøv igen.",
  gem: "Dokumentet kunne ikke gemmes. Prøv igen.",
};

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw px-3 py-2 " +
  "text-[15px] outline-none transition-colors focus:border-brand";

function formatDate(iso: string | null) {
  if (!iso) return "–";
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Fælles felt-sæt til både "Nyt dokument" og redigering af et eksisterende */
function DokumentFelter({
  kategoriId,
  doc,
}: {
  kategoriId: string;
  doc?: DokumentMedDiagram;
}) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor={`titel-${doc?.id ?? "ny"}`} className="label">
          Titel *
        </label>
        <input
          id={`titel-${doc?.id ?? "ny"}`}
          name="titel"
          type="text"
          required
          minLength={2}
          defaultValue={doc?.titel}
          placeholder="Fx Rengøringsprocedure – opskæringslokale"
          className={inputCls}
        />
      </div>

      {kategoriId === "ccp_oprp" ? (
        <div className="sm:col-span-2">
          <label htmlFor={`ccp_oprp_type-${doc?.id ?? "ny"}`} className="label">
            Er dette en CCP eller en oPRP?
          </label>
          <select
            id={`ccp_oprp_type-${doc?.id ?? "ny"}`}
            name="ccp_oprp_type"
            defaultValue={doc?.ccp_oprp_type ?? ""}
            className={inputCls}
          >
            <option value="">– Vælg –</option>
            <option value="ccp">CCP</option>
            <option value="oprp">oPRP</option>
          </select>
        </div>
      ) : null}

      <div>
        <label htmlFor={`version-${doc?.id ?? "ny"}`} className="label">
          Version
        </label>
        <input
          id={`version-${doc?.id ?? "ny"}`}
          name="version"
          type="text"
          defaultValue={doc?.version ?? "1.0"}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor={`status-${doc?.id ?? "ny"}`} className="label">
          Status
        </label>
        <select
          id={`status-${doc?.id ?? "ny"}`}
          name="status"
          defaultValue={doc?.status ?? "udkast"}
          className={inputCls}
        >
          {Object.entries(DOKUMENT_STATUS_LABELS).map(([v, label]) => (
            <option key={v} value={v}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor={`ansvarlig-${doc?.id ?? "ny"}`} className="label">
          Ansvarlig
        </label>
        <input
          id={`ansvarlig-${doc?.id ?? "ny"}`}
          name="ansvarlig"
          type="text"
          defaultValue={doc?.ansvarlig ?? ""}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor={`fil-${doc?.id ?? "ny"}`} className="label">
          {doc ? "Erstat fil (valgfrit)" : "Fil (PDF, Word, billede)"}
        </label>
        <input
          id={`fil-${doc?.id ?? "ny"}`}
          name="fil"
          type="file"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          className={`${inputCls} file:mr-3 file:border-0 file:bg-raw-deep file:px-3 file:py-1.5`}
        />
      </div>

      <div>
        <label htmlFor={`oprettet_dato-${doc?.id ?? "ny"}`} className="label">
          Oprettelsesdato
        </label>
        <input
          id={`oprettet_dato-${doc?.id ?? "ny"}`}
          name="oprettet_dato"
          type="date"
          defaultValue={doc?.oprettet_dato ?? ""}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor={`gennemgaaet_dato-${doc?.id ?? "ny"}`} className="label">
          Gennemgået
        </label>
        <input
          id={`gennemgaaet_dato-${doc?.id ?? "ny"}`}
          name="gennemgaaet_dato"
          type="date"
          defaultValue={doc?.gennemgaaet_dato ?? ""}
          className={inputCls}
        />
      </div>
      <div>
        <label htmlFor={`udloeber_dato-${doc?.id ?? "ny"}`} className="label">
          Udløber
        </label>
        <input
          id={`udloeber_dato-${doc?.id ?? "ny"}`}
          name="udloeber_dato"
          type="date"
          defaultValue={doc?.udloeber_dato ?? ""}
          className={inputCls}
        />
      </div>

      <div className="sm:col-span-2">
        <label htmlFor={`beskrivelse-${doc?.id ?? "ny"}`} className="label">
          Beskrivelse
        </label>
        <textarea
          id={`beskrivelse-${doc?.id ?? "ny"}`}
          name="beskrivelse"
          rows={2}
          defaultValue={doc?.beskrivelse ?? ""}
          className={inputCls}
        />
      </div>
    </div>
  );
}

export default async function DokumentKategoriPage({
  params,
  searchParams,
}: {
  params: { kategoriId: string };
  searchParams: { fejl?: string; rediger?: string };
}) {
  const supabase = createClient();

  const { data: kategori } = await supabase
    .from("document_kategorier")
    .select("*")
    .eq("id", params.kategoriId)
    .maybeSingle();

  if (!kategori) notFound();
  const k = kategori as DocumentKategori;

  const { data: dokumenter } = await supabase
    .from("dokumenter")
    .select("*")
    .eq("kategori_id", k.id)
    .order("titel");

  const dokumentList = (dokumenter ?? []) as DokumentMedDiagram[];

  // Midlertidige download-links – genereres ved hvert besøg, udløber efter 1 time
  const dokumenterMedUrl = await Promise.all(
    dokumentList.map(async (doc) => {
      if (!doc.fil_sti) return { ...doc, url: null as string | null };
      const { data } = await supabase.storage
        .from("dokumenter")
        .createSignedUrl(doc.fil_sti, 3600);
      return { ...doc, url: data?.signedUrl ?? null };
    })
  );

  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  return (
    <main className="mx-auto max-w-4xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">
          <Link href="/dokumenter" className="underline hover:text-brand">
            Dokumentstyring
          </Link>
          {k.kapittel_nummer != null ? ` · Kapitel ${k.kapittel_nummer}` : ""}
        </p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          {k.label}
        </h1>
        {k.beskrivelse ? (
          <p className="mt-2 text-[15px] text-ink-soft">{k.beskrivelse}</p>
        ) : null}
      </header>

      {dokumenterMedUrl.length === 0 ? (
        <p className="mt-8 text-[14px] text-ink-faint">
          Ingen dokumenter i denne kategori endnu.
        </p>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10">
          {dokumenterMedUrl.map((doc) => {
            const redigeresNu = searchParams.rediger === doc.id;

            if (redigeresNu) {
              return (
                <li key={doc.id} className="py-5">
                  <form action={redigerDokument} className="space-y-5">
                    <input type="hidden" name="dokument_id" value={doc.id} />
                    <input type="hidden" name="kategori_id" value={k.id} />
                    <DokumentFelter kategoriId={k.id} doc={doc} />

                    {fejl ? (
                      <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2 text-[14px] text-state-bad">
                        {fejl}
                      </p>
                    ) : null}

                    <div className="flex items-center gap-4">
                      <button type="submit" className="btn">
                        Gem ændringer
                      </button>
                      <Link
                        href={`/dokumenter/${k.id}`}
                        className="text-[13px] text-ink-faint underline"
                      >
                        Annullér
                      </Link>
                    </div>
                  </form>
                </li>
              );
            }

            return (
              <li
                key={doc.id}
                className="flex flex-wrap items-center justify-between gap-3 py-4"
              >
                <div>
                  <p className="flex items-center gap-2 text-[16px] font-semibold">
                    {k.kapittel_nummer != null && doc.dokument_nummer != null ? (
                      <span className="tabular text-ink-faint">
                        {k.kapittel_nummer}.
                        {String(doc.dokument_nummer).padStart(3, "0")}
                      </span>
                    ) : null}
                    {doc.titel}
                    {doc.ccp_oprp_type ? (
                      <span
                        className={`rounded-sm border px-1.5 py-0.5 text-[11px] font-normal ${
                          doc.ccp_oprp_type === "ccp"
                            ? "border-state-bad/30 bg-state-bad/5 text-state-bad"
                            : "border-state-warn/30 bg-state-warn/5 text-state-warn"
                        }`}
                      >
                        {doc.ccp_oprp_type === "ccp" ? "CCP" : "oPRP"}
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[13px] text-ink-faint">
                    v{doc.version} · {DOKUMENT_STATUS_LABELS[doc.status]}
                    {doc.ansvarlig ? ` · ${doc.ansvarlig}` : ""}
                    {" · "}Gennemgået {formatDate(doc.gennemgaaet_dato)}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  {doc.diagram_id ? (
                    <Link
                      href={`/flow/${doc.diagram_id}/print`}
                      className="text-[13px] text-brand underline"
                    >
                      Se diagram
                    </Link>
                  ) : doc.url ? (
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] text-brand underline"
                    >
                      Download
                    </a>
                  ) : (
                    <span className="text-[13px] text-ink-faint">
                      Ingen fil
                    </span>
                  )}
                  {doc.diagram_id ? null : (
                    <Link
                      href={`/dokumenter/${k.id}?rediger=${doc.id}`}
                      className="text-[13px] text-brand underline"
                    >
                      Rediger
                    </Link>
                  )}
                  <form action={sletDokument}>
                    <input type="hidden" name="dokument_id" value={doc.id} />
                    <input type="hidden" name="kategori_id" value={k.id} />
                    <input
                      type="hidden"
                      name="fil_sti"
                      value={doc.fil_sti ?? ""}
                    />
                    <button
                      type="submit"
                      className="text-[13px] text-ink-faint underline hover:text-state-bad"
                    >
                      Slet
                    </button>
                  </form>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Nyt dokument */}
      <section className="mt-14 border-t border-ink/10 pt-8">
        <h2 className="label">Nyt dokument</h2>
        <form action={uploadDokument} className="mt-4 space-y-5">
          <input type="hidden" name="kategori_id" value={k.id} />
          <DokumentFelter kategoriId={k.id} />

          {fejl && !searchParams.rediger ? (
            <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2 text-[14px] text-state-bad">
              {fejl}
            </p>
          ) : null}

          <button type="submit" className="btn">
            Gem dokument
          </button>
        </form>
      </section>
    </main>
  );
}
