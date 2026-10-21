import Link from "next/link";
import { ResponsiveLogo } from "./logo";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-10">
      <Link href="/" aria-label="GomerIA.app" className="mb-6 self-start">
        <ResponsiveLogo className="h-10 w-auto" compactClassName="h-10 w-auto" />
      </Link>
      <div className="card p-6">
        <h1 className="font-display text-3xl font-extrabold uppercase">{title}</h1>
        {subtitle && <p className="mt-1 break-words text-ink-soft">{subtitle}</p>}
        <div className="mt-5">{children}</div>
      </div>
    </main>
  );
}

export function FormMessage({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error)
    return (
      <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm break-words text-danger">
        {error}
      </p>
    );
  if (ok)
    return (
      <p role="status" className="rounded-xl border border-ok/40 bg-ok/10 px-3 py-2 text-sm break-words text-ok">
        {ok}
      </p>
    );
  return null;
}
