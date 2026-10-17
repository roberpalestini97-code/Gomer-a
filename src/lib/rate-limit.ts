import type { SupabaseClient } from "@supabase/supabase-js";

export const LIMITS = {
  perMinute: Number(process.env.ASSISTANT_LIMIT_PER_MINUTE ?? 8),
  perDay: Number(process.env.ASSISTANT_LIMIT_PER_DAY ?? 300),
};

export function limitMessage(lastMinute: number, lastDay: number, limits = LIMITS): string | null {
  if (lastMinute >= limits.perMinute) return "Demasiadas consultas seguidas. Espera un minuto y vuelve a probar.";
  if (lastDay >= limits.perDay) return "Has alcanzado el límite diario de consultas al asistente.";
  return null;
}

/** Límite por usuario basado en chat_logs (sin infraestructura extra). */
export async function checkRateLimit(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();
  const count = async (ms: number) => {
    const { count, error } = await supabase
      .from("chat_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .gte("created_at", since(ms));
    if (error) throw new Error(error.message);
    return count ?? 0;
  };
  const [minute, day] = await Promise.all([count(60_000), count(86_400_000)]);
  return limitMessage(minute, day);
}
