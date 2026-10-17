"use client";

export default function AppError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 max-w-md p-6 text-center">
      <h1 className="font-display text-2xl font-bold uppercase">Algo ha fallado</h1>
      <p className="mt-1 text-ink-soft">Puede ser la conexión. Vuelve a intentarlo.</p>
      <button type="button" onClick={reset} className="btn-primary mt-4">
        Reintentar
      </button>
    </div>
  );
}
