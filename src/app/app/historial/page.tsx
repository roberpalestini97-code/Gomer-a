import type { Metadata } from "next";
import { requireOwner } from "@/lib/workshop";

export const metadata: Metadata = { title: "Historial" };

const TOOL_LABEL: Record<string, string> = {
  lookup_vehicle_tire_size: "medida",
  search_tires: "búsqueda",
  recommend_tires: "recomendación",
};

export default async function HistoryPage() {
  const { supabase, active } = await requireOwner();
  const { data, error } = await supabase
    .from("chat_logs")
    .select("id, query, answer, tools_used, error, created_at")
    .eq("workshop_id", active.workshop_id)
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw new Error(error.message);

  const fmt = new Intl.DateTimeFormat("es-ES", { dateStyle: "short", timeStyle: "short", timeZone: "Europe/Madrid" });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-3xl font-extrabold uppercase">Historial</h1>
        <p className="text-sm text-ink-soft">Últimas 100 consultas al asistente. Útil para ver qué piden y qué falta.</p>
      </div>
      {(data ?? []).length === 0 ? (
        <p className="card p-6 text-center text-ink-soft">Todavía no hay consultas.</p>
      ) : (
        <ul className="space-y-2">
          {data!.map((log) => (
            <li key={log.id} className="card space-y-1 p-4">
              <p className="text-xs text-ink-soft">
                {fmt.format(new Date(log.created_at))}
                {(log.tools_used as string[]).length > 0 &&
                  ` · ${[...new Set(log.tools_used as string[])].map((t) => TOOL_LABEL[t] ?? t).join(", ")}`}
              </p>
              <p className="font-semibold">{log.query}</p>
              {log.answer && <p className="text-sm whitespace-pre-line text-ink-soft">{log.answer}</p>}
              {log.error && <p className="text-sm text-danger">{log.error}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
