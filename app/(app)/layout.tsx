// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import TopNav from "@/components/dashboard/TopNav";
import { getOrgContext, ROLE_LABELS } from "@/lib/org";

/**
 * Layout for alle indloggede moduler.
 * Henter bruger + organisation fra Supabase og sender dem til navbaren.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();

  // Middleware fanger dette normalt – dobbeltsikring
  if (!ctx) redirect("/login");

  // Logget ind men intet medlemskab endnu
  if (!ctx.orgId) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md text-center">
          <p className="text-[26px] font-semibold tracking-tight">AiQMS</p>
          <p className="mt-4 text-ink-soft">
            Din bruger ({ctx.email}) er ikke knyttet til nogen virksomhed
            endnu. Kontakt jeres administrator, eller kør
            oprettelses-scriptet i Supabase hvis du selv er ved at sætte
            systemet op.
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
