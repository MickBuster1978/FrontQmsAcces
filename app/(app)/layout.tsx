// app/(app)/layout.tsx
import { redirect } from "next/navigation";
import TopNav from "@/components/dashboard/TopNav";
import { getOrgContext, ROLE_LABELS } from "@/lib/org";

/**
 * Layout for alle indloggede moduler.
 * Ingen virksomhed endnu -> /velkommen (egen side, kan vise fejl).
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getOrgContext();

  if (!ctx) redirect("/login");
  if (!ctx.orgId) redirect("/velkommen");

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
