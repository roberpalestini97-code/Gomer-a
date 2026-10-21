"use client";

import { formatPrice, formatTireSize } from "@/lib/tires";
import type { RecommendedTire } from "@/lib/types";
import { buildOrderMessage, buildWhatsAppLink } from "@/lib/whatsapp";

export function StockBadge({ stock }: { stock: number }) {
  if (stock <= 0)
    return (
      <span className="shrink-0 rounded-full bg-danger/15 px-2.5 py-1 text-xs font-bold text-danger uppercase">
        Sin stock
      </span>
    );
  if (stock < 4)
    return (
      <span className="shrink-0 rounded-full bg-warn/15 px-2.5 py-1 text-xs font-bold text-warn uppercase">
        Quedan {stock}
      </span>
    );
  return (
    <span className="shrink-0 rounded-full bg-ok/15 px-2.5 py-1 text-xs font-bold text-ok uppercase">
      {stock} en stock
    </span>
  );
}

export function TireCard({
  tire,
  workshopName,
  highlight = false,
  rank,
}: {
  tire: RecommendedTire;
  workshopName: string;
  highlight?: boolean;
  rank?: number;
}) {
  const phone = tire.supplier?.whatsapp_phone;
  const needed = Math.max(4 - tire.stock, 2);
  const waLink =
    phone && tire.stock < 4
      ? buildWhatsAppLink(
          phone,
          buildOrderMessage({
            workshopName,
            salesRepName: tire.supplier?.sales_rep_name,
            brand: tire.brand,
            model: tire.model,
            width: tire.width,
            aspect_ratio: tire.aspect_ratio,
            rim: tire.rim,
            quantity: needed,
            sku: tire.sku,
          }),
        )
      : null;

  return (
    <article className={`card p-4 ${highlight ? "flash" : ""}`} data-testid="tire-card">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="size-tag text-lg">
            {rank != null && <span className="mr-1.5 text-accent">#{rank}</span>}
            {formatTireSize(tire)}
            {(tire.load_index || tire.speed_rating) && (
              <span className="ml-1.5 text-sm text-ink-soft">
                {tire.load_index}
                {tire.speed_rating}
              </span>
            )}
          </p>
          <h3 className="font-display truncate text-xl font-bold uppercase">
            {tire.brand} <span className="font-semibold text-ink-soft normal-case">{tire.model}</span>
          </h3>
        </div>
        <p className="font-display shrink-0 text-2xl font-extrabold">{formatPrice(Number(tire.price))}</p>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <StockBadge stock={tire.stock} />
          {tire.supplier?.name && <span className="truncate text-xs text-ink-soft">{tire.supplier.name}</span>}
        </div>
        {waLink && (
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="btn bg-whatsapp px-3 py-2 text-white hover:brightness-95"
            data-testid="whatsapp-order"
          >
            <WhatsAppIcon />
            Pedir {needed} al comercial
          </a>
        )}
      </div>
    </article>
  );
}

function WhatsAppIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-4 w-4 fill-current">
      <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.8 11.9 11.9 0 0 0 4.6 4c1.7.7 2.4.8 3.2.7.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3Z" />
    </svg>
  );
}
