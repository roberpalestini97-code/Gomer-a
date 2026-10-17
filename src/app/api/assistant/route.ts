import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { runAssistant } from "@/lib/ai/assistant";
import { checkRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import type { AssistantEvent } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BodySchema = z.object({
  workshopId: z.string().uuid(),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) }))
    .min(1)
    .max(12)
    .refine((m) => m[0].role === "user" && m[m.length - 1].role === "user", "La conversación debe empezar y acabar con el usuario"),
});

function json(status: number, message: string) {
  return Response.json({ error: message }, { status });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return json(401, "Sesión caducada. Vuelve a entrar.");

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json(400, "Petición inválida.");
  const { workshopId, messages } = parsed.data;

  const { data: membership } = await supabase
    .from("memberships")
    .select("role, workshop:workshops(name)")
    .eq("user_id", user.id)
    .eq("workshop_id", workshopId)
    .maybeSingle();
  if (!membership) return json(403, "No perteneces a este taller.");
  const workshopName = (membership.workshop as unknown as { name: string } | null)?.name ?? "tu taller";

  const limited = await checkRateLimit(supabase, user.id);
  if (limited) return json(429, limited);

  if (!process.env.ANTHROPIC_API_KEY) return json(503, "El asistente no está configurado (falta ANTHROPIC_API_KEY).");

  const query = messages[messages.length - 1].content;
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const emit = (event: AssistantEvent) => controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
      let answer = "";
      let toolsUsed: string[] = [];
      let errorMessage: string | null = null;
      try {
        const result = await runAssistant({
          ctx: { supabase, workshopId, recommended: [] },
          workshopName,
          history: messages,
          emit,
          signal: request.signal,
        });
        answer = result.answer;
        toolsUsed = result.toolsUsed;
      } catch (err) {
        errorMessage = friendlyError(err);
        console.error("assistant error", err);
        emit({ type: "error", message: errorMessage });
      }
      await supabase.from("chat_logs").insert({
        workshop_id: workshopId,
        user_id: user.id,
        query,
        answer: answer || null,
        tools_used: toolsUsed,
        error: errorMessage,
      });
      emit({ type: "done" });
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Accel-Buffering": "no",
    },
  });
}

function friendlyError(err: unknown): string {
  if (err instanceof Anthropic.RateLimitError) return "El asistente está saturado. Prueba de nuevo en unos segundos.";
  if (err instanceof Anthropic.AuthenticationError) return "La clave de la IA no es válida. Avisa al administrador.";
  if (err instanceof Anthropic.APIConnectionError) return "No hay conexión con el asistente. Revisa la cobertura.";
  if (err instanceof Anthropic.APIError) return "El asistente ha fallado. Prueba de nuevo.";
  return "Algo ha ido mal. Prueba de nuevo.";
}
