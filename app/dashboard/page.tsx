// app/dashboard/page.tsx
import StatusOverview, {
  type AuthorityNotice,
  type ReviewItem,
} from "@/components/dashboard/StatusOverview";

/**
 * Mock-data. Erstattes af Supabase-queries når schemaet ligger fast –
 * formen her er bevidst den form tabellerne skal levere.
 */
const REVIEW_ITEMS: ReviewItem[] = [
  {
    id: "r1",
    title: "CCP2 – Metaldetektion, verifikation",
    origin: "HACCP-plan",
    dueDate: "2026-07-14",
    daysLeft: -16,
  },
  {
    id: "r2",
    title: "DOK-018 – Modtagekontrol kølet kød",
    origin: "Dokumentstyring",
    dueDate: "2026-08-11",
    daysLeft: 12,
  },
  {
    id: "r3",
    title: "Flowdiagram – Opskæring & pakning",
    origin: "Flowdiagram",
    dueDate: "2026-08-24",
    daysLeft: 25,
  },
  {
    id: "r4",
    title: "Risikovurdering – Trin 7, hakning",
    origin: "Risikoanalyse",
    dueDate: "2026-10-02",
    daysLeft: 64,
  },
];

const NOTICES: AuthorityNotice[] = [];

type ModuleCard = {
  href: string;
  index: string;
  title: string;
  blurb: string;
  metaLabel: string;
  metaValue: string;
  cta: string;
};

const MODULES: ModuleCard[] = [
  {
    href: "/firma",
    index: "01",
    title: "Firmaoplysninger",
    blurb:
      "Produkter, anlæg, zoner, leverandører og valgt standard. Grundlaget alle andre moduler læser fra.",
    metaLabel: "Udfyldt",
    metaValue: "82 %",
    cta: "Åbn profil",
  },
  {
    href: "/flow",
    index: "02",
    title: "Flowdiagram",
    blurb:
      "Byg processen som data, ikke som tegning. Guidet, fra skabelon eller frit canvas.",
    metaLabel: "Diagrammer",
    metaValue: "3 aktive",
    cta: "Åbn builder",
  },
  {
    href: "/risiko",
    index: "03",
    title: "Risikoanalyse",
    blurb:
      "Farer og beslutningstræ genereret pr. procestrin ud fra flow og firmaprofil.",
    metaLabel: "Trin uden vurdering",
    metaValue: "4",
    cta: "Åbn analyse",
  },
  {
    href: "/dokumenter",
    index: "04",
    title: "Dokumentstyring",
    blurb:
      "Versionering, godkendelse og arkiv. Dokumenter knyttes til procestrin, ikke til mapper.",
    metaLabel: "Til godkendelse",
    metaValue: "2",
    cta: "Åbn arkiv",
  },
  {
    href: "/verifikation",
    index: "05",
    title: "Verifikationer",
    blurb:
      "Personalets registrering og verifikation af CCP, oPRP og egenkontrol. Adgang pr. funktion.",
    metaLabel: "Mangler i dag",
    metaValue: "1 registrering",
    cta: "Åbn oversigt",
  },
];

export default function DashboardPage() {
  const today = new Date().toLocaleDateString("da-DK", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-6xl px-6 pb-20 pt-10">
      {/* Masthead */}
      <header className="rule-double pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="label">Kvalitetsstyring</p>
            <h1 className="mt-1 text-4xl font-semibold tracking-tight">
              Overblik
            </h1>
          </div>
          <div className="text-right">
            <p className="text-[15px] text-ink-soft">Nordjysk Engroskød A/S</p>
            <p className="text-[13px] capitalize text-ink-faint">{today}</p>
          </div>
        </div>
      </header>

      {/* Status hele vejen over */}
      <div className="mt-8">
        <StatusOverview
          health="warn"
          planVersion="v4.2"
          lastReviewedAt="2026-03-12"
          stepCount={14}
          ccpCount={3}
          oprpCount={2}
          reviewItems={REVIEW_ITEMS}
          notices={NOTICES}
          noticeSourceReady={false}
        />
      </div>

      {/* Moduler */}
      <section className="mt-12">
        <div className="rule-double flex items-baseline justify-between pb-3">
          <h2 className="label">Moduler</h2>
          <a href="/indstillinger" className="text-[13px] text-brand underline">
            Indstillinger
          </a>
        </div>

        <div className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {MODULES.map((m) => (
            <a
              key={m.href}
              href={m.href}
              className="group flex flex-col border border-raw-edge bg-raw-deep
                         p-6 transition-colors hover:border-brand"
            >
              <div className="flex items-start justify-between">
                <span className="tabular text-[13px] text-ink-faint">
                  {m.index}
                </span>
                <span
                  className="h-px w-8 bg-raw-edge transition-colors
                             group-hover:bg-brand"
                />
              </div>

              <h3 className="mt-5 text-2xl font-semibold">{m.title}</h3>
              <p className="mt-2 flex-1 text-[15px] leading-snug text-ink-soft">
                {m.blurb}
              </p>

              <div className="mt-6 border-t border-ink/10 pt-4">
                <p className="label">{m.metaLabel}</p>
                <p className="tabular mt-1 text-[17px]">{m.metaValue}</p>
              </div>

              <span className="btn mt-5 w-full">{m.cta}</span>
            </a>
          ))}
        </div>
      </section>
    </main>
  );
}
