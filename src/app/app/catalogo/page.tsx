import type { Metadata } from "next";
import { CatalogManager } from "@/components/catalog-manager";
import type { Supplier, Tire } from "@/lib/types";
import { requireOwner } from "@/lib/workshop";

export const metadata: Metadata = { title: "Catálogo" };

export default async function CatalogPage({ searchParams }: { searchParams: Promise<{ nuevo?: string }> }) {
  const { supabase, active } = await requireOwner();
  const [{ data: tires, error }, { data: suppliers }] = await Promise.all([
    supabase
      .from("tires")
      .select("*")
      .eq("workshop_id", active.workshop_id)
      .order("brand")
      .order("width")
      .order("aspect_ratio")
      .order("rim")
      .limit(5000),
    supabase.from("suppliers").select("*").eq("workshop_id", active.workshop_id).order("name"),
  ]);
  if (error) throw new Error(error.message);
  const { nuevo } = await searchParams;

  return (
    <CatalogManager
      tires={(tires ?? []) as Tire[]}
      suppliers={(suppliers ?? []) as Supplier[]}
      welcome={nuevo === "1"}
    />
  );
}
