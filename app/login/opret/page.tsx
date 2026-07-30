// app/login/opret/page.tsx
import Link from "next/link";
import { createAccount } from "./actions";

const FEJL_TEKST: Record<string, string> = {
  navn: "Skriv dit fulde navn (mindst 2 tegn).",
  firma: "Skriv virksomhedens navn (mindst 2 tegn).",
  firma_findes:
    "Der findes allerede en virksomhed med det navn. Skal du inviteres i stedet? Kontakt jeres administrator.",
  email: "Skriv en gyldig e-mailadresse.",
  email_findes: "Der findes allerede en konto med den e-mail. Log ind i stedet.",
  kode: "Adgangskoden skal være mindst 8 tegn.",
  ukendt: "Noget gik galt. Prøv igen.",
};

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw-deep px-3 py-2 " +
  "text-[16px] outline-none transition-colors focus:border-brand";

export default function OpretPage({
  searchParams,
}: {
  searchParams: { fejl?: string };
}) {
  const fejl = searchParams.fejl ? FEJL_TEKST[searchParams.fejl] : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="rule-double pb-4 text-center">
          <p className="text-[26px] font-semibold tracking-tight">AiQMS</p>
          <p className="label mt-1">Opret virksomhed og konto</p>
        </div>

        <form action={createAccount} className="mt-8 space-y-5">
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
            <label htmlFor="email" className="label">
              E-mail
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              className={inputCls}
            />
          </div>

          <div>
            <label htmlFor="password" className="label">
              Adgangskode (mindst 8 tegn)
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className={inputCls}
            />
          </div>

          {fejl ? (
            <p className="border border-state-bad/30 bg-state-bad/5 px-3 py-2 text-[14px] text-state-bad">
              {fejl}
            </p>
          ) : null}

          <button type="submit" className="btn w-full">
            Opret virksomhed og konto
          </button>

          <p className="text-center text-[14px] text-ink-faint">
            Du oprettes som administrator for virksomheden.{" "}
            <Link href="/login" className="text-brand underline">
              Har du allerede en konto? Log ind
            </Link>
          </p>
        </form>
      </div>
    </main>
  );
}
