import Link from "next/link";
import { signOut } from "@/app/actions/workshop";
import { ResponsiveLogo } from "@/components/logo";
import { NavLinks } from "@/components/nav-links";
import { WorkshopSwitcher } from "@/components/workshop-switcher";
import { requireWorkshop } from "@/lib/workshop";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { memberships, active, isOwner } = await requireWorkshop();

  return (
    <div className="mx-auto flex min-h-dvh max-w-3xl flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-bg/90 px-4 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <Link href="/app" aria-label="Asistente" className="shrink-0">
            <ResponsiveLogo className="h-9 w-auto" compactClassName="h-8 w-auto" />
          </Link>
          {memberships.length > 1 ? (
            <WorkshopSwitcher
              activeId={active.workshop_id}
              options={memberships.map((m) => ({ id: m.workshop_id, name: m.workshop.name }))}
            />
          ) : (
            <p className="font-display min-w-0 flex-1 truncate text-lg font-bold uppercase">{active.workshop.name}</p>
          )}
          <form action={signOut} className="shrink-0">
            <button className="btn-ghost px-3 py-1.5 text-xs" type="submit">
              Salir
            </button>
          </form>
        </div>
        <NavLinks isOwner={isOwner} />
      </header>
      <main className="flex-1 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">{children}</main>
    </div>
  );
}
