// app/velkommen/actions.ts
"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/** Pak databasefejlen med i URL'en så den kan VISES i stedet for at gemmes */
function medDetalje(
  sti: string,
  fejl: { code?: string; message?: string } | null,
  trin: string
) {
  const tekst = `${trin} | ${fejl?.code ?? "?"} | ${fejl?.message ?? "?"}`;
  return `${sti}&detalje=${encodeURIComponent(tekst.slice(0, 300))}`;
}

export async function foersteOpsaetning(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const orgName = String(formData.get("org_name") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();

  if (orgName.length < 2) redirect("/velkommen?fejl=firma");
  if (fullName.length < 2) redirect("/velkommen?fejl=navn");

  const orgId = randomUUID();

  // 1. Organisation – ingen tilbagelæsning (kræver select-policy vi ikke har endnu)
  const { error: orgError } = await supabase
    .from("organizations")
    .insert({ id: orgId, name: orgName });

  if (orgError) {
    console.error("foersteOpsaetning org insert:", orgError);
    if (orgError.code === "23505") redirect("/velkommen?fejl=firma_findes");
    if (orgError.code === "42501") redirect("/velkommen?fejl=rettighed");
    redirect(medDetalje("/velkommen?fejl=ukendt", orgError, "org"));
  }

  // 2. Medlemskab som admin
  const { error: memberError } = await supabase.from("memberships").insert({
    org_id: orgId,
    user_id: user.id,
    role: "admin",
    full_name: fullName,
  });

  if (memberError) {
    console.error("foersteOpsaetning membership insert:", memberError);
    if (memberError.code === "42501") {
      redirect(medDetalje("/velkommen?fejl=rettighed", memberError, "medlem"));
    }
    redirect(medDetalje("/velkommen?fejl=ukendt", memberError, "medlem"));
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
