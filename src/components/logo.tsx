export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icon.svg" alt="" width={32} height={32} className="rounded-lg" />
      {!compact && (
        <span className="font-display text-xl leading-none font-extrabold tracking-tight uppercase">
          Neumáticos <span className="text-accent">IA</span>
        </span>
      )}
    </span>
  );
}
