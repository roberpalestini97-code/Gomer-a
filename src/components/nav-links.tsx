"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Asistente", owner: false },
  { href: "/app/stock", label: "Stock", owner: false },
  { href: "/app/catalogo", label: "Catálogo", owner: true },
  { href: "/app/proveedores", label: "Proveedores", owner: true },
  { href: "/app/equipo", label: "Equipo", owner: true },
  { href: "/app/historial", label: "Historial", owner: true },
];

export function NavLinks({ isOwner }: { isOwner: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Secciones" className="-mx-4 mt-2 flex gap-1 overflow-x-auto px-4 [scrollbar-width:none]">
      {LINKS.filter((l) => isOwner || !l.owner).map((l) => {
        const active = l.href === "/app" ? pathname === "/app" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 rounded-full px-3.5 py-1.5 text-sm font-semibold transition ${
              active ? "bg-ink text-bg" : "text-ink-soft hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
