import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/auth-shell";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "Tu taller" };

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { count } = await supabase
    .from("memberships")
    .select("workshop_id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) > 0) redirect("/app");

  const suggested = typeof user.user_metadata?.workshop_name === "string" ? user.user_metadata.workshop_name : "";

  return (
    <AuthShell title="Tu taller" subtitle="Ponle nombre. Si te han invitado, abre el enlace de invitación en su lugar.">
      <OnboardingForm defaultName={suggested} />
    </AuthShell>
  );
}
