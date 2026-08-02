// app/(app)/dokumenter/[kategoriId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DOKUMENT_STATUS_LABELS,
  type DocumentKategori,
  type Dokument,
} from "@/lib/dokumenter/types";
import { sletDokument, uploadDokument } from "../actions";

/** Lokal udvidelse med diagram_id, uden at ændre den delte Dokument-type */
type DokumentMedDiagram = Dokument & { diagram_id: string | null };

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

export default async function DokumentKategoriPage({
  params,
  searchParams,
}: {
  params: { kategoriId: string };
  searchParams: { fejl?: string };
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
          {dokumenterMedUrl.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="text-[16px] font-semibold">{doc.titel}</p>
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
          ))}
        </ul>
      )}

      {/* Nyt dokument */}
      <section className="mt-14 border-t border-ink/10 pt-8">
        <h2 className="label">Nyt dokument</h2>
        <form action={uploadDokument} className="mt-4 space-y-5">
          <input type="hidden" name="kategori_id" value={k.id} />

          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="titel" className="label">
                Titel *
              </label>
              <input
                id="titel"
                name="titel"
                type="text"
                required
                minLength={2}
                placeholder="Fx Rengøringsprocedure – opskæringslokale"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="version" className="label">
                Version
              </label>
              <input
                id="version"
                name="version"
                type="text"
                defaultValue="1.0"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select
                id="status"
                name="status"
                defaultValue="udkast"
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
              <label htmlFor="ansvarlig" className="label">
                Ansvarlig
              </label>
              <input
                id="ansvarlig"
                name="ansvarlig"
                type="text"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="fil" className="label">
                Fil (PDF, Word, billede)
              </label>
              <input
                id="fil"
                name="fil"
                type="file"
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                className={`${inputCls} file:mr-3 file:border-0 file:bg-raw-deep file:px-3 file:py-1.5`}
              />
            </div>

            <div>
              <label htmlFor="oprettet_dato" className="label">
                Oprettelsesdato
              </label>
              <input
                id="oprettet_dato"
                name="oprettet_dato"
                type="date"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="gennemgaaet_dato" className="label">
                Gennemgået
              </label>
              <input
                id="gennemgaaet_dato"
                name="gennemgaaet_dato"
                type="date"
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="udloeber_dato" className="label">
                Udløber
              </label>
              <input
                id="udloeber_dato"
                name="udloeber_dato"
                type="date"
                className={inputCls}
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="beskrivelse" className="label">
                Beskrivelse
              </label>
              <textarea
                id="beskrivelse"
                name="beskrivelse"
                rows={2}
                className={inputCls}
              />
            </div>
          </div>

          {fejl ? (
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
