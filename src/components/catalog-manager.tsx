"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { deleteTire, saveTire, seedDemoCatalog } from "@/app/actions/catalog";
import { FormMessage } from "@/components/auth-shell";
import { ImportPanel } from "@/components/import-panel";
import { formatPrice, formatTireSize, normalizeText } from "@/lib/tires";
import type { Supplier, Tire } from "@/lib/types";

type Mode = { kind: "list" } | { kind: "edit"; tire: Tire | null } | { kind: "import" };

export function CatalogManager({ tires, suppliers, welcome }: { tires: Tire[]; suppliers: Supplier[]; welcome: boolean }) {
  const [mode, setMode] = useState<Mode>({ kind: "list" });
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [seeding, startSeed] = useTransition();
  const [, startDelete] = useTransition();

  const visible = useMemo(() => {
    const words = normalizeText(query).split(" ").filter(Boolean);
    if (!words.length) return tires;
    return tires.filter((t) => {
      const hay = normalizeText(`${t.brand} ${t.model} ${t.sku ?? ""} ${formatTireSize(t)} ${t.width} ${t.aspect_ratio} ${t.rim}`);
      return words.every((w) => hay.includes(w));
    });
  }, [tires, query]);

  if (mode.kind === "edit") {
    return <TireForm tire={mode.tire} suppliers={suppliers} onDone={() => setMode({ kind: "list" })} />;
  }
  if (mode.kind === "import") {
    return (
      <ImportPanel
        suppliers={suppliers}
        onDone={(imported) => {
          setMode({ kind: "list" });
          if (imported != null) setMessage({ ok: `${imported} neumáticos importados.` });
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase">Catálogo</h1>
          <p className="text-sm text-ink-soft">{tires.length} neumáticos · la base que consulta el asistente</p>
        </div>
        <div className="flex gap-2">
          <button type="button" className="btn-ghost" onClick={() => setMode({ kind: "import" })}>
            Importar CSV/Excel
          </button>
          <button type="button" className="btn-primary" onClick={() => setMode({ kind: "edit", tire: null })}>
            Añadir
          </button>
        </div>
      </div>

      {welcome && tires.length === 0 && (
        <div className="card tread p-5">
          <p className="font-display text-2xl font-bold uppercase">¡Taller creado!</p>
          <p className="mt-1 text-ink-soft">
            Importa la tarifa de tu proveedor (CSV o Excel) o, para probar ya, carga un catálogo de demostración con unos
            200 neumáticos y un proveedor de ejemplo.
          </p>
        </div>
      )}

      {tires.length === 0 && (
        <button
          type="button"
          disabled={seeding}
          className="btn-ghost w-full border-dashed py-4"
          onClick={() =>
            startSeed(async () => {
              const res = await seedDemoCatalog();
              setMessage(res.error ? { error: res.error } : { ok: `Catálogo de demostración cargado (${res.imported}).` });
            })
          }
        >
          {seeding ? "Cargando…" : "Cargar catálogo de demostración"}
        </button>
      )}

      <FormMessage error={message?.error} ok={message?.ok} />

      {tires.length > 0 && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar por marca, medida o referencia"
          aria-label="Buscar en el catálogo"
          className="input"
        />
      )}

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        {visible.slice(0, 300).map((t) => (
          <li key={t.id} className="flex items-center gap-3 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="truncate">
                <span className="size-tag">{formatTireSize(t)}</span>{" "}
                <span className="font-semibold">{t.brand}</span> <span className="text-ink-soft">{t.model}</span>
              </p>
              <p className="text-xs text-ink-soft">
                {t.sku ?? "sin ref."} · {formatPrice(Number(t.price))} · stock {t.stock} · {t.season}
              </p>
            </div>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={() => setMode({ kind: "edit", tire: t })}>
              Editar
            </button>
            <button
              type="button"
              className="btn-danger px-3 py-1.5 text-xs"
              onClick={() => {
                if (!confirm(`¿Borrar ${t.brand} ${formatTireSize(t)}?`)) return;
                startDelete(async () => {
                  const res = await deleteTire(t.id);
                  if (res.error) setMessage({ error: res.error });
                });
              }}
            >
              Borrar
            </button>
          </li>
        ))}
      </ul>
      {visible.length > 300 && <p className="text-center text-sm text-ink-soft">Mostrando 300 de {visible.length}.</p>}
    </div>
  );
}

function TireForm({ tire, suppliers, onDone }: { tire: Tire | null; suppliers: Supplier[]; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveTire, undefined);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  const field = (name: keyof Tire, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <div>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input id={name} name={name} defaultValue={(tire?.[name] as string | number | null) ?? ""} className="input" {...props} />
    </div>
  );

  return (
    <form action={action} className="space-y-4">
      <h1 className="font-display text-3xl font-extrabold uppercase">{tire ? "Editar neumático" : "Nuevo neumático"}</h1>
      {tire && <input type="hidden" name="id" value={tire.id} />}
      <div className="grid grid-cols-3 gap-3">
        {field("width", "Ancho", { type: "number", required: true, min: 100, max: 400, inputMode: "numeric", placeholder: "225" })}
        {field("aspect_ratio", "Perfil", { type: "number", required: true, min: 20, max: 100, inputMode: "numeric", placeholder: "45" })}
        {field("rim", "Llanta", { type: "number", required: true, min: 10, max: 26, step: 0.5, inputMode: "decimal", placeholder: "17" })}
      </div>
      <div className="grid grid-cols-2 gap-3">
        {field("brand", "Marca", { required: true, maxLength: 80 })}
        {field("model", "Modelo", { maxLength: 120 })}
      </div>
      <div className="grid grid-cols-3 gap-3">
        {field("load_index", "Carga", { type: "number", min: 0, max: 200, inputMode: "numeric" })}
        {field("speed_rating", "Velocidad", { maxLength: 3 })}
        <div>
          <label htmlFor="season" className="label">
            Temporada
          </label>
          <select id="season" name="season" defaultValue={tire?.season ?? "verano"} className="input">
            <option value="verano">Verano</option>
            <option value="invierno">Invierno</option>
            <option value="all-season">All-season</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {field("price", "Precio €", { type: "number", min: 0, step: 0.01, inputMode: "decimal", required: true })}
        {field("stock", "Stock", { type: "number", min: 0, inputMode: "numeric", required: true })}
        {field("sku", "Referencia", { maxLength: 80 })}
      </div>
      <div>
        <label htmlFor="supplier_id" className="label">
          Proveedor
        </label>
        <select id="supplier_id" name="supplier_id" defaultValue={tire?.supplier_id ?? ""} className="input">
          <option value="">Sin proveedor</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <FormMessage error={state?.error} />
      <div className="flex gap-2">
        <button type="button" className="btn-ghost flex-1" onClick={onDone}>
          Cancelar
        </button>
        <button type="submit" disabled={pending} className="btn-primary flex-1">
          {pending ? "Guardando…" : "Guardar"}
        </button>
      </div>
    </form>
  );
}
