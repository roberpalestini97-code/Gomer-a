"use client";

import { useMemo, useState, useTransition } from "react";
import { adjustStock } from "@/app/actions/catalog";
import { StockBadge } from "@/components/tire-card";
import { formatPrice, formatTireSize, normalizeText, parseTireSize } from "@/lib/tires";
import type { RecommendedTire } from "@/lib/types";
import { useLiveTires } from "@/lib/use-live-tires";
import { buildOrderMessage, buildWhatsAppLink } from "@/lib/whatsapp";

type Filter = "all" | "out" | "low";

export function StockBoard({
  workshopId,
  workshopName,
  initial,
  canEdit,
}: {
  workshopId: string;
  workshopName: string;
  initial: RecommendedTire[];
  canEdit: boolean;
}) {
  const { tires, changed, connected, patch } = useLiveTires(workshopId, initial);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const visible = useMemo(() => {
    const size = parseTireSize(query);
    const words = size ? [] : normalizeText(query).split(" ").filter(Boolean);
    return tires.filter((t) => {
      if (filter === "out" && t.stock > 0) return false;
      if (filter === "low" && (t.stock === 0 || t.stock >= 4)) return false;
      if (size) return t.width === size.width && t.aspect_ratio === size.aspect_ratio && Number(t.rim) === size.rim;
      if (words.length === 0) return true;
      const hay = normalizeText(`${t.brand} ${t.model} ${t.sku ?? ""} ${formatTireSize(t)} ${t.width} ${t.aspect_ratio} ${t.rim}`);
      return words.every((w) => hay.includes(w));
    });
  }, [tires, query, filter]);

  const outCount = tires.filter((t) => t.stock === 0).length;

  function change(t: RecommendedTire, delta: number) {
    const optimistic = Math.max(0, t.stock + delta);
    patch(t.id, { stock: optimistic });
    setError(null);
    startTransition(async () => {
      const res = await adjustStock(t.id, delta);
      if (res.error) {
        patch(t.id, { stock: t.stock });
        setError(res.error);
      } else if (res.stock != null) {
        patch(t.id, { stock: res.stock });
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-extrabold uppercase">Stock en vivo</h1>
          <p className="flex items-center gap-1.5 text-sm text-ink-soft">
            <span className={`inline-block h-2 w-2 rounded-full ${connected ? "bg-ok" : "bg-warn"}`} aria-hidden />
            {connected ? "Sincronizado en tiempo real" : "Conectando…"} · {tires.length} referencias · {outCount} sin stock
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Busca 225/45 R17, marca o referencia"
          aria-label="Buscar en el stock"
          className="input"
        />
        <div className="flex gap-2" role="group" aria-label="Filtro">
          {(
            [
              ["all", "Todo"],
              ["low", "Quedan pocos"],
              ["out", "Sin stock"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              aria-pressed={filter === value}
              className={`rounded-full px-3.5 py-1.5 text-sm font-semibold ${
                filter === value ? "bg-ink text-bg" : "border border-line bg-surface text-ink-soft"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      )}

      {visible.length === 0 ? (
        <p className="card p-6 text-center text-ink-soft">
          {tires.length === 0 ? "Todavía no hay neumáticos en el catálogo." : "Nada coincide con la búsqueda."}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.slice(0, 300).map((t) => {
            const phone = t.supplier?.whatsapp_phone;
            const wa =
              phone && t.stock < 4
                ? buildWhatsAppLink(
                    phone,
                    buildOrderMessage({
                      workshopName,
                      salesRepName: t.supplier?.sales_rep_name,
                      brand: t.brand,
                      model: t.model,
                      width: t.width,
                      aspect_ratio: t.aspect_ratio,
                      rim: t.rim,
                      quantity: Math.max(4 - t.stock, 2),
                      sku: t.sku,
                    }),
                  )
                : null;
            return (
              <li
                key={t.id}
                className={`card flex items-center gap-3 p-3 ${changed.has(t.id) ? "flash" : ""}`}
                data-testid="stock-row"
              >
                <div className="min-w-0 flex-1">
                  <p className="size-tag">{formatTireSize(t)}</p>
                  <p className="truncate text-sm">
                    <span className="font-semibold">{t.brand}</span> <span className="text-ink-soft">{t.model}</span>
                  </p>
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-soft">
                    <StockBadge stock={t.stock} />
                    {formatPrice(Number(t.price))}
                    {wa && (
                      <a href={wa} target="_blank" rel="noopener noreferrer" className="font-semibold text-whatsapp underline">
                        Pedir por WhatsApp
                      </a>
                    )}
                  </p>
                </div>
                {canEdit ? (
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => change(t, -1)}
                      disabled={t.stock === 0}
                      aria-label={`Restar uno a ${t.brand} ${formatTireSize(t)}`}
                      className="btn-ghost h-11 w-11 p-0 text-xl"
                    >
                      −
                    </button>
                    <span className="size-tag w-10 text-center text-xl" data-testid="stock-value">
                      {t.stock}
                    </span>
                    <button
                      type="button"
                      onClick={() => change(t, 1)}
                      aria-label={`Sumar uno a ${t.brand} ${formatTireSize(t)}`}
                      className="btn-ghost h-11 w-11 p-0 text-xl"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="size-tag w-10 shrink-0 text-center text-2xl" data-testid="stock-value">
                    {t.stock}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {visible.length > 300 && (
        <p className="text-center text-sm text-ink-soft">Mostrando 300 de {visible.length}. Afina la búsqueda.</p>
      )}
    </div>
  );
}
