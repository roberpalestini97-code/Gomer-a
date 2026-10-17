import Anthropic from "@anthropic-ai/sdk";
import { TOOLS, runTool, type ToolContext } from "./tools";
import type { AssistantEvent } from "@/lib/types";

export const DEFAULT_MODEL = "claude-sonnet-5-5";
const MAX_ROUNDS = 6;

export function systemPrompt(workshopName: string) {
  return `Eres el asistente de neumáticos del taller "${workshopName}". Hablas con mecánicos que están trabajando, a menudo por voz desde el móvil.

Cómo trabajas:
- Si te dicen un vehículo sin medida, usa lookup_vehicle_tire_size. Si hay varias medidas posibles, busca en todas las que tengan sentido y di cuál depende de la llanta montada.
- Con la medida, usa search_tires. Todo precio, stock o proveedor que menciones debe salir de las herramientas: nunca lo inventes.
- Cuando tengas candidatos, llama a recommend_tires con los mejores (primero los que hay en stock; si no hay ninguno, los que se pueden pedir al proveedor) y después responde.
- Si no hay stock de lo recomendado, dilo claro: en la tarjeta aparecerá el botón para pedirlo por WhatsApp al comercial.
- Recuerda confirmar la medida en el flanco del neumático cuando la hayas deducido del modelo de coche.

Estilo: español de España, frases cortas y directas, sin tablas ni markdown pesado (se lee en el móvil y puede leerse en voz alta). Máximo 5 líneas.`;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

interface RunOptions {
  ctx: ToolContext;
  workshopName: string;
  history: ChatTurn[];
  emit: (event: AssistantEvent) => void;
  signal?: AbortSignal;
}

export interface RunResult {
  answer: string;
  toolsUsed: string[];
}

/**
 * Bucle manual de tool use con streaming: reenvía el texto a la UI a medida que llega
 * y ejecuta las herramientas contra Supabase con la sesión del usuario.
 */
export async function runAssistant({ ctx, workshopName, history, emit, signal }: RunOptions): Promise<RunResult> {
  const client = new Anthropic();
  const model = process.env.ANTHROPIC_MODEL || DEFAULT_MODEL;
  const messages: Anthropic.Beta.BetaMessageParam[] = history.map((t) => ({ role: t.role, content: t.content }));
  const toolsUsed: string[] = [];
  let answer = "";
  let jsonRetries = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = client.beta.messages.stream(
      {
        model,
        max_tokens: 4000,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: [{ type: "text", text: systemPrompt(workshopName), cache_control: { type: "ephemeral" } }],
        tools: TOOLS as Anthropic.Beta.BetaTool[],
        messages,
      },
      { signal },
    );

    stream.on("text", (delta) => {
      answer += delta;
      emit({ type: "text", delta });
    });

    let message: Anthropic.Beta.BetaMessage;
    try {
      message = await stream.finalMessage();
      jsonRetries = 0;
    } catch (err) {
      // Con eager_input_streaming, una entrada de herramienta ilegible rechaza finalMessage().
      // Solo ese caso se reintenta; los errores de la API se propagan.
      if (err instanceof Anthropic.APIError || signal?.aborted || jsonRetries++ >= 2) throw err;
      round--;
      continue;
    }

    if (message.stop_reason === "refusal") {
      const msg = "No puedo ayudar con esa consulta. Pregúntame por neumáticos, medidas o stock.";
      emit({ type: "text", delta: (answer ? "\n" : "") + msg });
      answer += msg;
      break;
    }
    if (message.stop_reason === "pause_turn") {
      messages.push({ role: "assistant", content: message.content });
      continue;
    }

    const toolUses = message.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    // max_tokens con una herramienta a medias también termina aquí: nunca se ejecuta una entrada truncada.
    if (message.stop_reason !== "tool_use" || toolUses.length === 0) break;

    // Se añade el contenido completo (incluidos bloques de thinking) sin modificar.
    messages.push({ role: "assistant", content: message.content });

    emit({ type: "status", message: statusFor(toolUses[0].name) });
    const results = await Promise.all(
      toolUses.map((b) => {
        toolsUsed.push(b.name);
        return runTool(ctx, b as unknown as Anthropic.ToolUseBlock);
      }),
    );
    if (ctx.recommended.length > 0) emit({ type: "tires", tires: ctx.recommended });

    // Todos los resultados en un único mensaje de usuario.
    messages.push({ role: "user", content: results as Anthropic.Beta.BetaToolResultBlockParam[] });
    if (answer && !answer.endsWith("\n")) {
      answer += "\n";
      emit({ type: "text", delta: "\n" });
    }
  }

  return { answer: answer.trim(), toolsUsed };
}

function statusFor(tool: string) {
  switch (tool) {
    case "lookup_vehicle_tire_size":
      return "Buscando la medida del vehículo…";
    case "search_tires":
      return "Consultando el stock…";
    case "recommend_tires":
      return "Preparando recomendaciones…";
    default:
      return "Pensando…";
  }
}
