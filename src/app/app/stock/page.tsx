import type { Metadata } from "next";
import { StockBoard } from "@/components/stock-board";
import type { RecommendedTire } from "@/lib/types";
import { requireWorkshop } from "@/lib/workshop";

export const metadata: Metadata = { title: "Stock" };

export default async function StockPage() {
  const { supabase, active, isOwner } = await requireWorkshop();
  const { data, error } = await supabase
    .from("tires")
    .select("*, supplier:suppliers(name, sales_rep_name, whatsapp_phone)")
    .eq("workshop_id", active.workshop_id)
    .order("width")
    .order("aspect_ratio")
    .order("rim")
    .order("brand")
    .limit(5000);
  if (error) throw new Error(error.message);

  return (
    <StockBoard
      workshopId={active.workshop_id}
      workshopName={active.workshop.name}
      initial={(data ?? []) as unknown as RecommendedTire[]}
      canEdit={isOwner}
    />
  );
}
