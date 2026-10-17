import type { Metadata } from "next";
import { SupplierManager } from "@/components/supplier-manager";
import type { Supplier } from "@/lib/types";
import { requireOwner } from "@/lib/workshop";

export const metadata: Metadata = { title: "Proveedores" };

export default async function SuppliersPage() {
  const { supabase, active } = await requireOwner();
  const { data, error } = await supabase
    .from("suppliers")
    .select("*")
    .eq("workshop_id", active.workshop_id)
    .order("name");
  if (error) throw new Error(error.message);
  return <SupplierManager suppliers={(data ?? []) as Supplier[]} />;
}
