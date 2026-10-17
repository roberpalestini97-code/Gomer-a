"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Tire } from "@/lib/types";

/**
 * Mantiene una lista de neumáticos sincronizada con Supabase Realtime.
 * Devuelve también los ids que acaban de cambiar, para resaltarlos.
 */
export function useLiveTires<T extends Tire>(workshopId: string, initial: T[]) {
  const [tires, setTires] = useState<T[]>(initial);
  const [changed, setChanged] = useState<Set<string>>(new Set());
  const [connected, setConnected] = useState(false);
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => setTires(initial), [initial]);

  useEffect(() => {
    const supabase = createClient();
    const pending = timers.current;
    const mark = (id: string) => {
      setChanged((s) => new Set(s).add(id));
      clearTimeout(pending.get(id));
      pending.set(
        id,
        setTimeout(() => {
          setChanged((s) => {
            const n = new Set(s);
            n.delete(id);
            return n;
          });
        }, 1500),
      );
    };

    const channel = supabase
      .channel(`tires:${workshopId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "tires", filter: `workshop_id=eq.${workshopId}` },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as Partial<Tire>).id;
            setTires((list) => list.filter((t) => t.id !== id));
            return;
          }
          const row = payload.new as Tire;
          setTires((list) => {
            const idx = list.findIndex((t) => t.id === row.id);
            if (idx === -1) return payload.eventType === "INSERT" ? [...list, row as T] : list;
            const copy = list.slice();
            copy[idx] = { ...copy[idx], ...row };
            return copy;
          });
          mark(row.id);
        },
      )
      .subscribe((status) => setConnected(status === "SUBSCRIBED"));

    return () => {
      pending.forEach(clearTimeout);
      supabase.removeChannel(channel);
    };
  }, [workshopId]);

  /** Actualización optimista local (p. ej. tras pulsar +/-). */
  const patch = (id: string, values: Partial<T>) =>
    setTires((list) => list.map((t) => (t.id === id ? { ...t, ...values } : t)));

  return { tires, changed, connected, patch, setTires };
}
