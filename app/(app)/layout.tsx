// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import TopNav from "@/components/dashboard/TopNav";
import { getOrgContext, ROLE_LABELS } from "@/lib/org";
import { foersteOpsaetning } from "./actions";

const inputCls =
  "mt-1.5 w-full rounded-sm border border-raw-edge bg-raw-deep px-3 py-2 " +
  "text-[16px] outline-none transition-colors focus:border-brand";

/**
 * Layout for alle indloggede moduler.
 *
 * Adgangsmodel:
 * - Brugere oprettes KUN af AiQMS i Supabase (efter kontrakt)
 * - Første login uden virksomhed -> kunden udfylder selv sin opsætning her
 * - Resten af firmaoplysningerne udfyldes i Firma-modulet bagefter
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();

  if (!ctx) redirect("/login");

  if (!ctx.orgId) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="rule-double pb-4 text-center">
            <p className="text-[26px] font-semibold tracking-tight">AiQMS</p>
            <p className="label mt-1">Velkommen – lad os sætte jer op</p>
          </div>

          <p className="mt-6 text-center text-[14px] text-ink-soft">
            Du er logget ind som <strong>{ctx.email}</strong>. Udfyld de to
            felter, så er jeres system klar. Resten af virksomhedens
            oplysninger udfylder du bagefter i Firma-modulet.
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

            <button type="submit" className="btn w-full">
              Gør systemet klar
            </button>
          </form>

          {/* Forkert konto? Vejen ud – ingen fælde */}
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

  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        orgName={ctx.orgName}
        userName={ctx.fullName}
        userRole={ROLE_LABELS[ctx.role]}
      />

      <div className="flex-1">{children}</div>

      <footer className="border-t border-raw-edge">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <p className="label">
            AiQMS · kvalitetsstyring for fødevareproducenter
          </p>
          <p className="text-[13px] text-ink-faint">
            Standard: {ctx.standard}
          </p>
        </div>
      </footer>
    </div>
  );
}
