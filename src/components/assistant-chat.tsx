"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { TireCard } from "@/components/tire-card";
import type { AssistantEvent, RecommendedTire } from "@/lib/types";
import { useLiveTires } from "@/lib/use-live-tires";
import { speak, useSpeechRecognition } from "@/lib/use-speech";

interface Turn {
  id: number;
  role: "user" | "assistant";
  content: string;
  tireIds?: string[];
  status?: string | null;
  error?: string | null;
  pending?: boolean;
}

const EXAMPLES = [
  "Me acaba de entrar un Audi A3 de 2018",
  "¿Qué tengo en 205/55 R16?",
  "Golf del 2015, lo más barato que haya en stock",
];

const STORAGE_KEY = "neumaticos:speak";

export function AssistantChat({
  workshopId,
  workshopName,
  emptyCatalog,
  isOwner,
}: {
  workshopId: string;
  workshopName: string;
  emptyCatalog: boolean;
  isOwner: boolean;
}) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [readAloud, setReadAloud] = useState(false);
  const [recommended, setRecommended] = useState<RecommendedTire[]>([]);
  const nextId = useRef(1);
  const abortRef = useRef<AbortController | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { tires: liveTires, changed } = useLiveTires(workshopId, recommended);
  const tireById = useMemo(() => new Map(liveTires.map((t) => [t.id, t])), [liveTires]);

  const speech = useSpeechRecognition((text) => send(text));

  useEffect(() => {
    try {
      setReadAloud(localStorage.getItem(STORAGE_KEY) === "1");
    } catch {
      /* almacenamiento no disponible */
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [turns]);

  function toggleReadAloud() {
    const v = !readAloud;
    setReadAloud(v);
    try {
      localStorage.setItem(STORAGE_KEY, v ? "1" : "0");
    } catch {
      /* ignorar */
    }
  }

  function updateTurn(id: number, fn: (t: Turn) => Turn) {
    setTurns((list) => list.map((t) => (t.id === id ? fn(t) : t)));
  }

  async function send(raw: string) {
    const text = raw.trim();
    if (!text || busy) return;
    setInput("");
    setBusy(true);

    const userTurn: Turn = { id: nextId.current++, role: "user", content: text };
    const assistantTurn: Turn = { id: nextId.current++, role: "assistant", content: "", pending: true, status: "Pensando…" };
    const history = [...turns, userTurn]
      .filter((t) => !t.error && t.content)
      .slice(-9)
      .map((t) => ({ role: t.role, content: t.content }));
    while (history.length && history[0].role !== "user") history.shift();
    setTurns((list) => [...list, userTurn, assistantTurn]);

    const controller = new AbortController();
    abortRef.current = controller;
    let answer = "";
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workshopId, messages: history }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "No se pudo contactar con el asistente.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as AssistantEvent;
          if (event.type === "text") {
            answer += event.delta;
            updateTurn(assistantTurn.id, (t) => ({ ...t, content: t.content + event.delta, status: null }));
          } else if (event.type === "status") {
            updateTurn(assistantTurn.id, (t) => ({ ...t, status: event.message }));
          } else if (event.type === "tires") {
            setRecommended((prev) => {
              const map = new Map(prev.map((p) => [p.id, p]));
              for (const tire of event.tires) map.set(tire.id, tire);
              return [...map.values()];
            });
            updateTurn(assistantTurn.id, (t) => ({ ...t, tireIds: event.tires.map((x) => x.id) }));
          } else if (event.type === "error") {
            updateTurn(assistantTurn.id, (t) => ({ ...t, error: event.message }));
          }
        }
      }
      updateTurn(assistantTurn.id, (t) => ({ ...t, pending: false, status: null }));
      if (readAloud && answer.trim()) speak(answer);
    } catch (err) {
      if (controller.signal.aborted) {
        updateTurn(assistantTurn.id, (t) => ({ ...t, pending: false, status: null, content: t.content || "Cancelado." }));
      } else {
        const message = err instanceof Error ? err.message : "Error de conexión.";
        updateTurn(assistantTurn.id, (t) => ({ ...t, pending: false, status: null, error: message }));
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-8.5rem)] flex-col">
      {emptyCatalog && (
        <div className="card mb-4 border-accent/50 p-4">
          <p className="font-semibold">Tu catálogo está vacío.</p>
          <p className="text-sm text-ink-soft">
            {isOwner ? (
              <>
                Importa la tarifa de tu proveedor o carga el catálogo de demostración en{" "}
                <Link href="/app/catalogo" className="font-semibold text-ink underline">
                  Catálogo
                </Link>
                .
              </>
            ) : (
              "Pide al dueño del taller que importe el catálogo de neumáticos."
            )}
          </p>
        </div>
      )}

      <div className="flex-1 space-y-4" aria-live="polite">
        {turns.length === 0 && (
          <section className="py-6 text-center">
            <h1 className="font-display text-4xl font-extrabold uppercase">¿Qué coche ha entrado?</h1>
            <p className="mt-1 text-ink-soft">Pulsa el micrófono y dilo como se lo dirías a un compañero.</p>
            <div className="mt-5 flex flex-col items-stretch gap-2">
              {EXAMPLES.map((e) => (
                <button key={e} type="button" onClick={() => send(e)} className="btn-ghost justify-start text-left">
                  “{e}”
                </button>
              ))}
            </div>
          </section>
        )}

        {turns.map((t) =>
          t.role === "user" ? (
            <p key={t.id} className="ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-ink px-4 py-2.5 text-bg">
              {t.content}
            </p>
          ) : (
            <div key={t.id} className="space-y-3" data-testid="assistant-turn">
              {(t.content || t.status) && (
                <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-line bg-surface px-4 py-3">
                  {t.content && <p className="whitespace-pre-line">{t.content}</p>}
                  {t.status && <p className="animate-pulse text-sm text-ink-soft">{t.status}</p>}
                </div>
              )}
              {t.error && (
                <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-3 py-2 text-sm text-danger">
                  {t.error}
                </p>
              )}
              {t.tireIds?.map((id, i) => {
                const tire = tireById.get(id);
                return tire ? (
                  <TireCard key={id} tire={tire} workshopName={workshopName} highlight={changed.has(id)} rank={i + 1} />
                ) : null;
              })}
            </div>
          ),
        )}
        <div ref={bottomRef} />
      </div>

      <div className="sticky bottom-0 -mx-4 mt-4 border-t border-line bg-bg/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        {(speech.interim || speech.error) && (
          <p className={`mb-2 text-sm ${speech.error ? "text-danger" : "text-ink-soft italic"}`}>
            {speech.error ?? speech.interim}
          </p>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
          className="flex items-center gap-2"
        >
          {speech.supported && (
            <button
              type="button"
              onClick={speech.listening ? speech.stop : speech.start}
              disabled={busy}
              aria-label={speech.listening ? "Dejar de escuchar" : "Hablar"}
              aria-pressed={speech.listening}
              className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-accent-ink transition disabled:opacity-50 ${
                speech.listening ? "listening bg-danger text-white" : "bg-accent"
              }`}
            >
              <MicIcon />
            </button>
          )}
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={speech.supported ? "O escribe aquí…" : "Escribe el coche o la medida…"}
            aria-label="Consulta"
            maxLength={2000}
            className="input h-14"
            disabled={busy}
          />
          {busy ? (
            <button type="button" onClick={() => abortRef.current?.abort()} className="btn-ghost h-14">
              Parar
            </button>
          ) : (
            <button type="submit" disabled={!input.trim()} className="btn-primary h-14">
              Enviar
            </button>
          )}
        </form>
        <label className="mt-2 flex items-center gap-2 text-xs text-ink-soft">
          <input type="checkbox" checked={readAloud} onChange={toggleReadAloud} className="accent-[var(--accent)]" />
          Leer las respuestas en voz alta
        </label>
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </svg>
  );
}
