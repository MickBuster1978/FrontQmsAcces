// app/(app)/firma/page.tsx
import { createClient } from "@/lib/supabase/server";
import { getOrgContext } from "@/lib/org";
import { gemFirmaProfil } from "./actions";

const STANDARDER = [
  "IFS Food 8",
  "BRC Issue 9",
  "FSSC 22000 v6",
  "ISO 22000:2018",
  "Egenkontrol (Fødevarestyrelsen)",
];

const FEJL_TEKST: Record<string, string> = {
  navn: "Virksomhedens navn skal være mindst 2 tegn.",
  navn_findes: "En anden virksomhed bruger allerede det navn.",
  standard: "Vælg en gyldig standard.",
  antal: "Antal ansatte skal være et tal.",
  ukendt: "Kunne ikke gemme. Prøv igen.",
};

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw px-3 py-2 " +
  "text-[16px] outline-none transition-colors focus:border-brand " +
  "disabled:cursor-not-allowed disabled:opacity-60";

type OrgProfil = {
  name: string;
  cvr: string | null;
  autorisationsnr: string | null;
  adresse: string | null;
  postnr: string | null;
  bynavn: string | null;
  telefon: string | null;
  email: string | null;
  kontaktperson: string | null;
  aktiviteter: string | null;
  antal_ansatte: number | null;
  standard: string;
};

export default async function FirmaPage({
  searchParams,
}: {
  searchParams: { gemt?: string; fejl?: string };
}) {
  const ctx = await getOrgContext();
  const supabase = createClient();

  const { data } = await supabase
    .from("organizations")
    .select(
      "name, cvr, autorisationsnr, adresse, postnr, bynavn, telefon, email, kontaktperson, aktiviteter, antal_ansatte, standard"
    )
    .eq("id", ctx?.orgId ?? "")
    .maybeSingle();

  const org = (data ?? null) as OrgProfil | null;
  const kanRedigere = ctx?.role === "admin";
  const gemt = searchParams.gemt === "1";
  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  return (
    <main className="mx-auto max-w-3xl px-6 pb-20 pt-8">
      <header className="rule-double pb-4">
        <p className="label">Firmaoplysninger</p>
        <h1 className="mt-1 text-4xl font-semibold tracking-tight">
          {org?.name ?? "Virksomhedsprofil"}
        </h1>
        <p className="mt-2 text-[14px] text-ink-faint">
          Grundlaget alle andre moduler læser fra – flowdiagram, risikoanalyse
          og dokumenter henter oplysninger her.
        </p>
      </header>

      {!kanRedigere ? (
        <p className="mt-6 border border-raw-edge bg-raw-deep px-4 py-3 text-[14px] text-ink-soft">
          Du kan se profilen, men kun virksomhedens administrator kan ændre
          den.
        </p>
      ) : null}

      <form action={gemFirmaProfil} className="mt-8 space-y-8">
        {/* Identitet */}
        <section>
          <h2 className="label rule-double pb-2">Identitet</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="name" className="label">
                Virksomhedens navn *
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                minLength={2}
                defaultValue={org?.name ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="cvr" className="label">
                CVR-nummer
              </label>
              <input
                id="cvr"
                name="cvr"
                type="text"
                defaultValue={org?.cvr ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="autorisationsnr" className="label">
                Autorisationsnr. (Fødevarestyrelsen)
              </label>
              <input
                id="autorisationsnr"
                name="autorisationsnr"
                type="text"
                defaultValue={org?.autorisationsnr ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Adresse & kontakt */}
        <section>
          <h2 className="label rule-double pb-2">Adresse & kontakt</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label htmlFor="adresse" className="label">
                Adresse
              </label>
              <input
                id="adresse"
                name="adresse"
                type="text"
                defaultValue={org?.adresse ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="postnr" className="label">
                Postnr.
              </label>
              <input
                id="postnr"
                name="postnr"
                type="text"
                defaultValue={org?.postnr ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="bynavn" className="label">
                By
              </label>
              <input
                id="bynavn"
                name="bynavn"
                type="text"
                defaultValue={org?.bynavn ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="telefon" className="label">
                Telefon
              </label>
              <input
                id="telefon"
                name="telefon"
                type="tel"
                defaultValue={org?.telefon ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="email" className="label">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                defaultValue={org?.email ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="kontaktperson" className="label">
                Kvalitetsansvarlig kontaktperson
              </label>
              <input
                id="kontaktperson"
                name="kontaktperson"
                type="text"
                defaultValue={org?.kontaktperson ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
          </div>
        </section>

        {/* Produktion */}
        <section>
          <h2 className="label rule-double pb-2">Produktion & standard</h2>
          <div className="mt-4 grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor="standard" className="label">
                Standard *
              </label>
              <select
                id="standard"
                name="standard"
                defaultValue={org?.standard ?? "IFS Food 8"}
                disabled={!kanRedigere}
                className={inputCls}
              >
                {STANDARDER.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="antal_ansatte" className="label">
                Antal ansatte
              </label>
              <input
                id="antal_ansatte"
                name="antal_ansatte"
                type="number"
                min={0}
                defaultValue={org?.antal_ansatte ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
            </div>
            <div className="sm:col-span-2">
              <label htmlFor="aktiviteter" className="label">
                Aktiviteter & produkter
              </label>
              <textarea
                id="aktiviteter"
                name="aktiviteter"
                rows={4}
                placeholder="Fx: Opskæring og pakning af kølet okse- og svinekød til engros. Vakuum og MAP. Ingen varmebehandling."
                defaultValue={org?.aktiviteter ?? ""}
                disabled={!kanRedigere}
                className={inputCls}
              />
              <p className="mt-1.5 text-[13px] text-ink-faint">
                Beskriv hvad I producerer og håndterer – risikoanalysen og
                AI-assistenten bruger dette som grundlag.
              </p>
            </div>
          </div>
        </section>

        {gemt ? (
          <p className="border border-state-ok/30 bg-state-ok/5 px-3 py-2 text-[14px] text-state-ok">
            Profilen er gemt.
          </p>
        ) : null}
        {fejl ? (
          <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2 text-[14px] text-state-bad">
            {fejl}
          </p>
        ) : null}

        {kanRedigere ? (
          <button type="submit" className="btn">
            Gem profil
          </button>
        ) : null}
      </form>
    </main>
  );
}
