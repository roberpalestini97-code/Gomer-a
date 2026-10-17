import type { Metadata } from "next";
import { AssistantChat } from "@/components/assistant-chat";
import { requireWorkshop } from "@/lib/workshop";

export const metadata: Metadata = { title: "Asistente" };

export default async function AssistantPage() {
  const { active, supabase } = await requireWorkshop();
  const { count } = await supabase
    .from("tires")
    .select("id", { count: "exact", head: true })
    .eq("workshop_id", active.workshop_id);

  return (
    <AssistantChat
      workshopId={active.workshop_id}
      workshopName={active.workshop.name}
      emptyCatalog={(count ?? 0) === 0}
      isOwner={active.role === "owner"}
    />
  );
}
