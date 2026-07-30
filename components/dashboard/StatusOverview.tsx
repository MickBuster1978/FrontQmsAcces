// components/dashboard/StatusOverview.tsx

export type HaccpHealth = "ok" | "warn" | "bad";

export type ReviewItem = {
  id: string;
  /** Hvad der er ved at blive forældet, fx "CCP2 – Metaldetektion" */
  title: string;
  /** Hvor det hører hjemme: HACCP-plan, dokument, flowdiagram, verifikation */
  origin: string;
  /** ISO-dato for næste revision */
  dueDate: string;
  /** Negativ = overskredet */
  daysLeft: number;
};

export type AuthorityNotice = {
  id: string;
  headline: string;
  source: string;
  publishedAt: string;
  /** Vurderet relevans for virksomhedens produkter */
  relevance: "direkte" | "muligt" | "ingen";
};

export type StatusOverviewProps = {
  health: HaccpHealth;
  planVersion: string;
  lastReviewedAt: string;
  stepCount: number;
  ccpCount: number;
  oprpCount: number;
  reviewItems: ReviewItem[];
  /** Tom liste indtil datakilden er koblet på */
  notices: AuthorityNotice[];
  noticeSourceReady: boolean;
};

const HEALTH_COPY: Record<HaccpHealth, { label: string; tone: string }> = {
  ok: { label: "Ajour", tone: "text-state-ok" },
  warn: { label: "Kræver opmærksomhed", tone: "text-state-warn" },
  bad: { label: "Forældet", tone: "text-state-bad" },
};

function dueTone(daysLeft: number) {
  if (daysLeft < 0) return "text-state-bad";
  if (daysLeft <= 30) return "text-state-warn";
  return "text-ink-soft";
}

function dueText(daysLeft: number) {
  if (daysLeft < 0) return `${Math.abs(daysLeft)} dage overskredet`;
  if (daysLeft === 0) return "Forfalder i dag";
  return `${daysLeft} dage tilbage`;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function StatusOverview({
  health,
  planVersion,
  lastReviewedAt,
  stepCount,
  ccpCount,
  oprpCount,
  reviewItems,
  notices,
  noticeSourceReady,
}: StatusOverviewProps) {
  const overdue = reviewItems.filter((i) => i.daysLeft < 0).length;
  const soon = reviewItems.filter(
    (i) => i.daysLeft >= 0 && i.daysLeft <= 30
  ).length;

  return (
    <section className="border border-raw-edge bg-raw-deep">
      {/* Øverste bånd: samlet HACCP-status */}
      <div className="grid gap-px bg-raw-edge md:grid-cols-[1.1fr_1fr_1fr]">
        <div className="bg-raw-deep px-6 py-5">
          <p className="label">HACCP-status</p>
          <p
            className={`mt-2 text-3xl font-semibold ${HEALTH_COPY[health].tone}`}
          >
            {HEALTH_COPY[health].label}
          </p>
          <p className="mt-1 text-[14px] text-ink-faint">
            Plan {planVersion} · senest gennemgået {formatDate(lastReviewedAt)}
          </p>
        </div>

        <div className="bg-raw-deep px-6 py-5">
          <p className="label">Omfang</p>
          <div className="tabular mt-3 flex items-baseline gap-6">
            <span>
              <span className="text-2xl font-semibold">{stepCount}</span>
              <span className="ml-1.5 text-[13px] text-ink-faint">trin</span>
            </span>
            <span>
              <span className="text-2xl font-semibold">{ccpCount}</span>
              <span className="ml-1.5 text-[13px] text-ink-faint">CCP</span>
            </span>
            <span>
              <span className="text-2xl font-semibold">{oprpCount}</span>
              <span className="ml-1.5 text-[13px] text-ink-faint">oPRP</span>
            </span>
          </div>
        </div>

        <div className="bg-raw-deep px-6 py-5">
          <p className="label">Revisioner</p>
          <div className="tabular mt-3 flex items-baseline gap-6">
            <span>
              <span
                className={`text-2xl font-semibold ${
                  overdue > 0 ? "text-state-bad" : "text-ink"
                }`}
              >
                {overdue}
              </span>
              <span className="ml-1.5 text-[13px] text-ink-faint">
                overskredet
              </span>
            </span>
            <span>
              <span
                className={`text-2xl font-semibold ${
                  soon > 0 ? "text-state-warn" : "text-ink"
                }`}
              >
                {soon}
              </span>
              <span className="ml-1.5 text-[13px] text-ink-faint">
                inden 30 dage
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Nederste bånd: forældelse + myndighedsnyt */}
      <div className="grid gap-px border-t border-raw-edge bg-raw-edge lg:grid-cols-[1.4fr_1fr]">
        {/* Ved at blive forældet */}
        <div className="bg-raw-deep px-6 py-5">
          <div className="flex items-baseline justify-between">
            <p className="label">Ved at blive forældet</p>
            <a href="/revisioner" className="text-[13px] text-brand underline">
              Se alle
            </a>
          </div>

          {reviewItems.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-faint">
              Ingen revisioner forfalder inden for de næste 90 dage.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {reviewItems.map((item) => (
                <li
                  key={item.id}
                  className="flex items-baseline justify-between gap-4 py-2.5"
                >
                  <span className="min-w-0">
                    <span className="block truncate">{item.title}</span>
                    <span className="text-[13px] text-ink-faint">
                      {item.origin} · {formatDate(item.dueDate)}
                    </span>
                  </span>
                  <span
                    className={`tabular whitespace-nowrap text-[14px] ${dueTone(
                      item.daysLeft
                    )}`}
                  >
                    {dueText(item.daysLeft)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Fødevarestyrelsen */}
        <div className="bg-raw-deep px-6 py-5">
          <p className="label">Fødevarestyrelsen · tilbagetrækninger</p>

          {!noticeSourceReady ? (
            <div className="mt-4 border border-dashed border-raw-edge px-4 py-5">
              <p className="text-[15px] text-ink-soft">
                Datakilde ikke tilkoblet endnu.
              </p>
              <p className="mt-1.5 text-[13px] text-ink-faint">
                Feltet er reserveret til automatisk overvågning af
                tilbagetrækninger og advarsler, filtreret mod virksomhedens
                produkter og leverandører.
              </p>
            </div>
          ) : notices.length === 0 ? (
            <p className="mt-4 text-[15px] text-ink-faint">
              Ingen relevante meddelelser i de seneste 30 dage.
            </p>
          ) : (
            <ul className="mt-4 divide-y divide-ink/10">
              {notices.map((n) => (
                <li key={n.id} className="py-2.5">
                  <p className="text-[15px] leading-snug">{n.headline}</p>
                  <p className="mt-1 text-[13px] text-ink-faint">
                    {n.source} · {formatDate(n.publishedAt)} · relevans:{" "}
                    {n.relevance}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
