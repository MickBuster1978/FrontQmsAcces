// lib/org.ts
import { createClient } from "@/lib/supabase/server";

export type OrgContext = {
  userId: string;
  email: string;
  fullName: string;
  role: "admin" | "kvalitet" | "medarbejder";
  orgId: string;
  orgName: string;
  standard: string;
};

export const ROLE_LABELS: Record<OrgContext["role"], string> = {
  admin: "Administrator",
  kvalitet: "Kvalitetsansvarlig",
  medarbejder: "Medarbejder",
};

/**
 * Henter den aktuelle brugers org-kontekst.
 * - null hvis ikke logget ind
 * - { userId, email } med orgId === "" hvis logget ind men uden medlemskab
 *
 * Bruges i layouts og server components. Alle senere queries skal
 * filtrere på orgId herfra – aldrig på klient-leverede værdier.
 */
export async function getOrgContext(): Promise<OrgContext | null> {
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, full_name, organizations ( id, name, standard )")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  const org = Array.isArray(membership?.organizations)
    ? membership?.organizations[0]
    : membership?.organizations;

  return {
    userId: user.id,
    email: user.email ?? "",
    fullName:
      membership?.full_name ?? user.email?.split("@")[0] ?? "Ukendt bruger",
    role: (membership?.role as OrgContext["role"]) ?? "medarbejder",
    orgId: org?.id ?? "",
    orgName: org?.name ?? "",
    standard: org?.standard ?? "",
  };
}
