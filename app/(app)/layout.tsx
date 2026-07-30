// app/(app)/layout.tsx
import TopNav from "@/components/dashboard/TopNav";

/**
 * Layout for alle indloggede moduler.
 * BEMÆRK: ingen <html> eller <body> her – de hører kun i app/layout.tsx.
 *
 * Org- og brugerdata er hårdkodet indtil auth er på plads.
 */
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <TopNav
        orgName="Nordjysk Engroskød A/S"
        userName="Mick Ogilvie"
        userRole="Kvalitetsansvarlig"
      />

      <div className="flex-1">{children}</div>

      <footer className="border-t border-raw-edge">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <p className="label">
            AiQMS · kvalitetsstyring for fødevareproducenter
          </p>
          <p className="text-[13px] text-ink-faint">
            Standard: IFS Food 8 · sidste synkronisering i dag
          </p>
        </div>
      </footer>
    </div>
  );
}
