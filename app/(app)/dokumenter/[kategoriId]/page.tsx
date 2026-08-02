// app/(app)/dokumenter/[kategoriId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  DOKUMENT_STATUS_LABELS,
  type DocumentKategori,
  type Dokument,
} from "@/lib/dokumenter/types";

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
}: {
  params: { kategoriId: string };
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

  const dokumentList = (dokumenter ?? []) as Dokument[];

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

      {dokumentList.length === 0 ? (
        <div className="mt-8 border border-dashed border-raw-edge bg-raw-deep p-8 text-center">
          <p className="text-[17px]">
            Ingen dokumenter i denne kategori endnu.
          </p>
          <p className="mx-auto mt-2 max-w-md text-[14px] text-ink-faint">
            Upload og oprettelse af dokumenter er næste skridt i modulet.
          </p>
        </div>
      ) : (
        <ul className="mt-8 divide-y divide-ink/10">
          {dokumentList.map((doc) => (
            <li
              key={doc.id}
              className="flex flex-wrap items-center justify-between gap-3 py-4"
            >
              <div>
                <p className="text-[16px] font-semibold">{doc.titel}</p>
                <p className="text-[13px] text-ink-faint">
                  v{doc.version} · {DOKUMENT_STATUS_LABELS[doc.status]}
                  {doc.ansvarlig ? ` · ${doc.ansvarlig}` : ""}
                </p>
              </div>
              <p className="text-[13px] text-ink-faint">
                Gennemgået {formatDate(doc.gennemgaaet_dato)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
