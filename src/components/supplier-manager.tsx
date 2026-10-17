"use client";

import { useActionState, useState, useTransition } from "react";
import { deleteSupplier, saveSupplier } from "@/app/actions/catalog";
import { FormMessage } from "@/components/auth-shell";
import type { Supplier } from "@/lib/types";

export function SupplierManager({ suppliers }: { suppliers: Supplier[] }) {
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase">Proveedores</h1>
        <p className="text-sm text-ink-soft">
          El WhatsApp del comercial se usa para el botón «Pedir» cuando un neumático no tiene stock.
        </p>
      </div>

      <ul className="space-y-2">
        {suppliers.map((s) => (
          <li key={s.id} className="card flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-sm text-ink-soft">
                {s.sales_rep_name ?? "Sin comercial"} · {s.whatsapp_phone ?? "sin WhatsApp"}
              </p>
            </div>
            <button
              type="button"
              className="btn-ghost px-3 py-1.5 text-xs"
              onClick={() => {
                setEditing(s);
                setFormKey((k) => k + 1);
              }}
            >
              Editar
            </button>
            <button
              type="button"
              className="btn-danger px-3 py-1.5 text-xs"
              onClick={() => {
                if (!confirm(`¿Borrar ${s.name}? Sus neumáticos quedarán sin proveedor.`)) return;
                startTransition(async () => {
                  const res = await deleteSupplier(s.id);
                  setError(res.error ?? null);
                });
              }}
            >
              Borrar
            </button>
          </li>
        ))}
        {suppliers.length === 0 && <li className="card p-4 text-center text-ink-soft">Aún no hay proveedores.</li>}
      </ul>
      <FormMessage error={error} />

      <SupplierForm
        key={formKey}
        supplier={editing}
        onCancel={() => {
          setEditing(null);
          setFormKey((k) => k + 1);
        }}
      />
    </div>
  );
}

function SupplierForm({ supplier, onCancel }: { supplier: Supplier | null; onCancel: () => void }) {
  const [state, action, pending] = useActionState(saveSupplier, undefined);
  return (
    <form action={action} className="card space-y-3 p-4">
      <h2 className="font-display text-xl font-bold uppercase">{supplier ? `Editar ${supplier.name}` : "Nuevo proveedor"}</h2>
      {supplier && <input type="hidden" name="id" value={supplier.id} />}
      <div>
        <label htmlFor="name" className="label">
          Empresa
        </label>
        <input id="name" name="name" required maxLength={120} defaultValue={supplier?.name ?? ""} className="input" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="sales_rep_name" className="label">
            Comercial
          </label>
          <input id="sales_rep_name" name="sales_rep_name" maxLength={120} defaultValue={supplier?.sales_rep_name ?? ""} className="input" />
        </div>
        <div>
          <label htmlFor="whatsapp_phone" className="label">
            WhatsApp (con prefijo)
          </label>
          <input
            id="whatsapp_phone"
            name="whatsapp_phone"
            type="tel"
            inputMode="tel"
            placeholder="+34 600 123 456"
            defaultValue={supplier?.whatsapp_phone ?? ""}
            className="input"
          />
        </div>
      </div>
      <FormMessage error={state?.error} ok={state?.ok} />
      <div className="flex gap-2">
        {supplier && (
          <button type="button" className="btn-ghost flex-1" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" disabled={pending} className="btn-primary flex-1">
          {pending ? "Guardando…" : "Guardar proveedor"}
        </button>
      </div>
    </form>
  );
}
