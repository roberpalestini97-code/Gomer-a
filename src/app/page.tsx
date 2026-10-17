import Link from "next/link";
import { Logo } from "@/components/logo";

const STEPS = [
  {
    title: "Pregunta por voz",
    body: "«Me ha entrado un Audi A3 del 2018». El asistente deduce la medida y busca en tu catálogo.",
  },
  {
    title: "Stock en tiempo real",
    body: "Actualizas el stock desde el móvil y todo el taller lo ve al instante. Sin ERP, sin CRM.",
  },
  {
    title: "Pide por WhatsApp",
    body: "¿No queda? Un botón abre el chat del comercial con el pedido ya escrito.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-3xl flex-col px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-10">
      <header className="flex items-center justify-between py-3">
        <Logo />
        <Link href="/login" className="btn-ghost">
          Entrar
        </Link>
      </header>

      <section className="tread card mt-6 overflow-hidden p-6 sm:p-10">
        <p className="label">Para talleres pequeños</p>
        <h1 className="font-display text-5xl leading-[0.95] font-extrabold tracking-tight uppercase sm:text-6xl">
          Tu catálogo de neumáticos,
          <br />
          <span className="text-accent">a un comando de voz</span>
        </h1>
        <p className="mt-4 max-w-xl text-lg text-ink-soft">
          Un asistente con IA que conoce tus neumáticos, tus precios y tu stock. Tus mecánicos preguntan desde el móvil y
          tienen la respuesta en segundos.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Crear mi taller
          </Link>
          <Link href="/login" className="btn-ghost px-6 py-3 text-base">
            Ya tengo cuenta
          </Link>
        </div>
      </section>

      <ol className="mt-6 grid gap-3 sm:grid-cols-3">
        {STEPS.map((s, i) => (
          <li key={s.title} className="card p-5">
            <span className="size-tag text-accent">0{i + 1}</span>
            <h2 className="font-display mt-1 text-2xl font-bold uppercase">{s.title}</h2>
            <p className="mt-1 text-ink-soft">{s.body}</p>
          </li>
        ))}
      </ol>
    </main>
  );
}
