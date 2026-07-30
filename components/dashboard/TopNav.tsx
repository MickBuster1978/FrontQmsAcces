// components/dashboard/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

type NavLink = {
  href: string;
  label: string;
  /** Antal ting der kræver handling – vises som orange tal */
  badge?: number;
};

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Overblik" },
  { href: "/firma", label: "Firma" },
  { href: "/flow", label: "Flowdiagram" },
  { href: "/risiko", label: "Risikoanalyse", badge: 4 },
  { href: "/dokumenter", label: "Dokumenter", badge: 2 },
  { href: "/verifikation", label: "Verifikationer", badge: 1 },
];

export type TopNavProps = {
  orgName: string;
  userName: string;
  /** Fx "Kvalitetsansvarlig" – styrer hvad brugeren må se */
  userRole: string;
};

export default function TopNav({ orgName, userName, userRole }: TopNavProps) {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  return (
    <header className="sticky top-0 z-40 border-b border-raw-edge bg-raw/95 backdrop-blur">
      {/* Øverste linje: wordmark + bruger */}
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3">
        <Link href="/dashboard" className="flex items-baseline gap-2.5">
          <span className="text-[22px] font-semibold leading-none tracking-tight">
            AiQMS
          </span>
          <span className="h-3 w-px bg-raw-edge" aria-hidden />
          <span className="label leading-none">{orgName}</span>
        </Link>

        <div className="flex items-center gap-4">
          <div className="hidden text-right leading-tight sm:block">
            <p className="text-[14px]">{userName}</p>
            <p className="label">{userRole}</p>
          </div>
          <Link
            href="/konto"
            className="flex h-9 w-9 items-center justify-center rounded-sm
                       border border-raw-edge bg-raw-deep text-[13px]
                       transition-colors hover:border-brand"
            aria-label="Konto og indstillinger"
          >
            {userName
              .split(" ")
              .map((n) => n[0])
              .slice(0, 2)
              .join("")}
          </Link>
        </div>
      </div>

      {/* Nederste linje: moduler */}
      <nav className="mx-auto max-w-6xl px-6">
        <ul className="-mb-px flex flex-wrap items-center gap-x-1">
          {LINKS.map((link) => {
            const active = isActive(link.href);
            return (
              <li key={link.href}>
                <Link
                  href={link.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-2 border-b-2 px-3 py-2.5
                              text-[15px] transition-colors ${
                                active
                                  ? "border-brand text-ink"
                                  : "border-transparent text-ink-soft hover:border-raw-edge hover:text-ink"
                              }`}
                >
                  {link.label}
                  {link.badge ? (
                    <span
                      className="tabular inline-flex min-w-[18px] justify-center
                                 rounded-sm bg-brand-soft px-1 text-[12px] text-brand"
                    >
                      {link.badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
