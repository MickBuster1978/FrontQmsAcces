// components/dashboard/TopNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type NavLink = {
  href: string;
  label: string;
};

const LINKS: NavLink[] = [
  { href: "/dashboard", label: "Overblik" },
  { href: "/firma", label: "Firma" },
  { href: "/flow", label: "Flowdiagram" },
  { href: "/risiko", label: "Risikoanalyse" },
  { href: "/dokumenter", label: "Dokumenter" },
  { href: "/verifikation", label: "Verifikationer" },
];

export type TopNavProps = {
  orgName: string;
  userName: string;
  userRole: string;
};

export default function TopNav({ orgName, userName, userRole }: TopNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  const isActive = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`);

  async function handleSignOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

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

        <div className="flex items-center gap-3">
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
            {initials}
          </Link>
          <button
            type="button"
            onClick={handleSignOut}
            className="btn-quiet px-3 py-1.5 text-[13px]"
          >
            Log ud
          </button>
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
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
