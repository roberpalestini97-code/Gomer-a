import Link from "next/link";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center px-4 text-center">
      <p className="size-tag text-5xl text-accent">404</p>
      <h1 className="font-display mt-2 text-3xl font-extrabold uppercase">Pinchazo</h1>
      <p className="mt-1 text-ink-soft">Esta página no existe.</p>
      <Link href="/app" className="btn-primary mt-5">
        Ir al asistente
      </Link>
    </main>
  );
}
