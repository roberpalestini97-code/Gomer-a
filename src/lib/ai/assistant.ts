import { TOOLS, runTool, type ToolCall, type ToolContext, type ToolResultMessage } from "./tools";
import type { AssistantEvent } from "@/lib/types";

/** API compatible con OpenAI (por defecto NVIDIA NIM: build.nvidia.com). */
export const DEFAULT_BASE_URL = "https://integrate.api.nvidia.com/v1";
export const DEFAULT_MODEL = "openai/gpt-oss-20b";
export const DEFAULT_FALLBACK_MODEL = "nvidia/nemotron-3-super-120b-a12b";

const MAX_ROUNDS = 6;
/** Si el modelo no empieza a responder en este tiempo, se pasa al de respaldo. */
const FIRST_BYTE_TIMEOUT_MS = Number(process.env.LLM_FIRST_BYTE_TIMEOUT_MS ?? 20_000);

export function systemPrompt(workshopName: string) {
  return `Eres el asistente de neumáticos del taller "${workshopName}". Hablas con mecánicos que están trabajando, a menudo por voz desde el móvil.

Cómo trabajas:
- Si te dicen un vehículo sin medida, usa lookup_vehicle_tire_size. Si hay varias medidas posibles, busca en todas las que tengan sentido y di cuál depende de la llanta montada.
- Con la medida, usa search_tires. Todo precio, stock o proveedor que menciones debe salir de las herramientas: nunca lo inventes.
- Cuando tengas candidatos, llama a recommend_tires con los mejores (primero los que hay en stock; si no hay ninguno, los que se pueden pedir al proveedor) y después responde.
- Si no hay stock de lo recomendado, dilo claro: en la tarjeta aparecerá el botón para pedirlo por WhatsApp al comercial.
- Recuerda confirmar la medida en el flanco del neumático cuando la hayas deducido del modelo de coche.

Estilo: español, frases cortas y directas, sin tablas ni markdown (se lee en el móvil y puede leerse en voz alta). Máximo 5 líneas.`;
}

export type ChatTurn = { role: "user" | "assistant"; content: string };

type ChatMessage =
  | { role: "system" | "user"; content: string }
  | {
      role: "assistant";
      content: string | null;
      tool_calls?: { id: string; type: "function"; function: { name: string; arguments: string } }[];
    }
  | ToolResultMessage;

/** Error de la API del modelo, con el código HTTP si lo hay. */
export class LlmError extends Error {
  constructor(
    message: string,
    readonly status?: number,
  ) {
    super(message);
    this.name = "LlmError";
  }
}

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
  model: string;
}

interface Completion {
  content: string;
  toolCalls: ToolCall[];
  finishReason: string | null;
}

function config() {
  const apiKey = process.env.LLM_API_KEY || process.env.NVIDIA_API_KEY;
  if (!apiKey) throw new LlmError("Falta la clave de la IA (NVIDIA_API_KEY).", 503);
  const models = [process.env.LLM_MODEL || DEFAULT_MODEL, process.env.LLM_FALLBACK_MODEL ?? DEFAULT_FALLBACK_MODEL]
    .map((m) => m.trim())
    .filter((m, i, all) => m && all.indexOf(m) === i);
  return { apiKey, baseUrl: (process.env.LLM_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, ""), models };
}

/**
 * Una petición en streaming. Reenvía el texto a la UI a medida que llega y acumula las llamadas a herramientas.
 * Lanza LlmError si no llega nada en FIRST_BYTE_TIMEOUT_MS (para poder cambiar de modelo).
 */
async function streamCompletion(
  cfg: ReturnType<typeof config>,
  model: string,
  messages: ChatMessage[],
  onText: (delta: string) => void,
  signal?: AbortSignal,
): Promise<Completion> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort);
  let gotFirstByte = false;
  const timer = setTimeout(() => {
    if (!gotFirstByte) controller.abort();
  }, FIRST_BYTE_TIMEOUT_MS);

  try {
    let res: Response;
    try {
      res = await fetch(`${cfg.baseUrl}/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${cfg.apiKey}` },
        body: JSON.stringify({
          model,
          messages,
          tools: TOOLS,
          tool_choice: "auto",
          temperature: 0.2,
          max_tokens: 1500,
          stream: true,
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (signal?.aborted) throw err;
      throw new LlmError(gotFirstByte ? "Conexión cortada con la IA." : `El modelo ${model} no responde.`);
    }
    if (!res.ok || !res.body) {
      const detail = await res.text().catch(() => "");
      throw new LlmError(`La IA respondió ${res.status}: ${detail.slice(0, 200)}`, res.status);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let content = "";
    let finishReason: string | null = null;
    const calls = new Map<number, ToolCall>();

    for (;;) {
      let chunk: ReadableStreamReadResult<Uint8Array>;
      try {
        chunk = await reader.read();
      } catch (err) {
        if (signal?.aborted) throw err;
        throw new LlmError(gotFirstByte ? "Conexión cortada con la IA." : `El modelo ${model} no responde.`);
      }
      if (chunk.done) break;
      gotFirstByte = true;
      buffer += decoder.decode(chunk.value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const raw of lines) {
        const line = raw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data || data === "[DONE]") continue;
        let parsed: {
          choices?: {
            delta?: {
              content?: string | null;
              tool_calls?: { index?: number; id?: string; function?: { name?: string; arguments?: string } }[];
            };
            finish_reason?: string | null;
          }[];
        };
        try {
          parsed = JSON.parse(data);
        } catch {
          continue;
        }
        const choice = parsed.choices?.[0];
        if (!choice) continue;
        const delta = choice.delta ?? {};
        if (delta.content) {
          content += delta.content;
          onText(delta.content);
        }
        for (const tc of delta.tool_calls ?? []) {
          const index = tc.index ?? 0;
          const current = calls.get(index) ?? { id: "", name: "", arguments: "" };
          if (tc.id) current.id = tc.id;
          if (tc.function?.name) current.name += tc.function.name;
          if (tc.function?.arguments) current.arguments += tc.function.arguments;
          calls.set(index, current);
        }
        if (choice.finish_reason) finishReason = choice.finish_reason;
      }
    }

    const toolCalls = [...calls.values()]
      .filter((c) => c.name)
      .map((c, i) => ({ ...c, id: c.id || `call_${Date.now()}_${i}` }));
    return { content, toolCalls, finishReason };
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
  }
}

/**
 * Bucle de tool use: llama al modelo, ejecuta las herramientas contra Supabase (con la sesión del usuario)
 * y repite hasta que el modelo responde sin pedir herramientas.
 * Si el modelo principal no responde o falla antes de emitir texto, se usa el de respaldo.
 */
export async function runAssistant({ ctx, workshopName, history, emit, signal }: RunOptions): Promise<RunResult> {
  const cfg = config();
  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt(workshopName) },
    ...history.map((t) => ({ role: t.role, content: t.content }) as ChatMessage),
  ];
  const toolsUsed: string[] = [];
  let answer = "";
  let modelIndex = 0;

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const model = cfg.models[modelIndex];
    let emitted = false;
    let completion: Completion;
    try {
      completion = await streamCompletion(
        cfg,
        model,
        messages,
        (delta) => {
          emitted = true;
          answer += delta;
          emit({ type: "text", delta });
        },
        signal,
      );
    } catch (err) {
      // Cambia al modelo de respaldo si aún no se ha mostrado nada de esta ronda.
      const retriable = err instanceof LlmError && (err.status == null || err.status === 429 || err.status >= 500);
      if (!signal?.aborted && retriable && !emitted && modelIndex < cfg.models.length - 1) {
        modelIndex++;
        console.warn(`LLM ${model} falló (${(err as Error).message}); usando ${cfg.models[modelIndex]}`);
        emit({ type: "status", message: "Cambiando a un modelo más rápido…" });
        round--;
        continue;
      }
      throw err;
    }

    if (completion.toolCalls.length === 0) break;

    messages.push({
      role: "assistant",
      content: completion.content || null,
      tool_calls: completion.toolCalls.map((c) => ({
        id: c.id,
        type: "function" as const,
        function: { name: c.name, arguments: c.arguments },
      })),
    });

    emit({ type: "status", message: statusFor(completion.toolCalls[0].name) });
    const results = await Promise.all(
      completion.toolCalls.map((call) => {
        toolsUsed.push(call.name);
        return runTool(ctx, call);
      }),
    );
    if (ctx.recommended.length > 0) emit({ type: "tires", tires: ctx.recommended });
    messages.push(...results);

    if (answer && !answer.endsWith("\n")) {
      answer += "\n";
      emit({ type: "text", delta: "\n" });
    }
  }

  return { answer: answer.trim(), toolsUsed, model: cfg.models[modelIndex] };
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
