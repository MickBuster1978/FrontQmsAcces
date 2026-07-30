// app/velkommen/page.tsx
import { redirect } from "next/navigation";
import { getOrgContext } from "@/lib/org";
import { foersteOpsaetning } from "./actions";

const FEJL_TEKST: Record<string, string> = {
  firma: "Skriv virksomhedens navn (mindst 2 tegn).",
  navn: "Skriv dit fulde navn (mindst 2 tegn).",
  firma_findes:
    "Der findes allerede en virksomhed med det navn i systemet. Vælg et andet navn – eller kontakt AiQMS hvis det er JERES virksomhed, så rydder vi op.",
  ukendt:
    "Noget gik galt på serveren. Prøv igen – fortsætter det, så kontakt AiQMS.",
};

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw-deep px-3 py-2 " +
  "text-[16px] outline-none transition-colors focus:border-brand";

export default async function VelkommenPage({
  searchParams,
}: {
  searchParams: { fejl?: string };
}) {
  const ctx = await getOrgContext();

  if (!ctx) redirect("/login");
  if (ctx.orgId) redirect("/dashboard");

  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="rule-double pb-4 text-center">
          <p className="text-[26px] font-semibold tracking-tight">AiQMS</p>
          <p className="label mt-1">Velkommen – lad os sætte jer op</p>
        </div>

        <p className="mt-6 text-center text-[14px] text-ink-soft">
          Du er logget ind som <strong>{ctx.email}</strong>. Udfyld de to
          felter, så er jeres system klar. Resten af virksomhedens oplysninger
          udfylder du bagefter i Firma-modulet.
        </p>

        <form action={foersteOpsaetning} className="mt-6 space-y-5">
          <div>
            <label htmlFor="org_name" className="label">
              Virksomhedens navn
            </label>
            <input
              id="org_name"
              name="org_name"
              type="text"
              required
              minLength={2}
              autoComplete="organization"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="full_name" className="label">
              Dit fulde navn
            </label>
            <input
              id="full_name"
              name="full_name"
              type="text"
              required
              minLength={2}
              autoComplete="name"
              className={inputCls}
            />
          </div>

          {fejl ? (
            <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2 text-[14px] text-state-bad">
              {fejl}
            </p>
          ) : null}

          <button type="submit" className="btn w-full">
            Gør systemet klar
          </button>
        </form>

        <form action="/auth/signout" method="post" className="mt-5 text-center">
          <button
            type="submit"
            className="text-[13px] text-ink-faint underline hover:text-brand"
          >
            Forkert konto? Log ud
          </button>
        </form>
      </div>
    </main>
  );
}
