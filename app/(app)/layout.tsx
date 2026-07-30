// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import TopNav from "@/components/dashboard/TopNav";
import { getOrgContext, ROLE_LABELS } from "@/lib/org";

/**
 * Layout for alle indloggede moduler.
 * Virksomheder oprettes KUN manuelt af AiQMS (efter kontrakt).
 * Brugere uden medlemskab ser en henvisning – ingen selvbetjening.
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
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-[26px] font-semibold tracking-tight">AiQMS</p>
          <p className="mt-4 text-ink-soft">
            Din bruger (<strong>{ctx.email}</strong>) er ikke knyttet til
            nogen virksomhed.
          </p>
          <p className="mt-2 text-[14px] text-ink-faint">
            Er din virksomhed kunde hos AiQMS, så bed jeres administrator om
            at få dig tilføjet. Er I ikke kunde endnu, så kontakt AiQMS for
            en aftale.
          </p>
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
