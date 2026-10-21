import {
  aiRequestSchema,
  aiResponseSchema,
  validateAIOutput,
  type AIRequest,
  type AIResponse,
} from "./ai-contract.ts";
import { hasIdentifierLikeText } from "./narratives.ts";

export async function requestAI(
  input: AIRequest,
  signal: AbortSignal,
  transport: typeof fetch = fetch
): Promise<AIResponse> {
  if (signal.aborted) return { status: "unavailable", reason: "cancelled" };
  if (!aiRequestSchema.safeParse(input).success)
    return { status: "unavailable", reason: "invalid_input" };
  if (Object.values(input.narratives).some(hasIdentifierLikeText))
    return { status: "unavailable", reason: "privacy" };
  const deadline = AbortSignal.timeout(30_000);
  try {
    const response = await transport("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
      signal: AbortSignal.any([signal, deadline]),
      cache: "no-store",
    });
    const parsed = aiResponseSchema.safeParse(await response.json());
    if (!parsed.success)
      return { status: "unavailable", reason: "invalid_response" };
    if (
      parsed.data.status === "success" &&
      (!response.ok || !validateAIOutput(parsed.data.result, input))
    )
      return { status: "unavailable", reason: "invalid_response" };
    return parsed.data;
  } catch (error: unknown) {
    return {
      status: "unavailable",
      reason: signal.aborted
        ? "cancelled"
        : deadline.aborted
        ? "timeout"
        : error instanceof SyntaxError
        ? "invalid_response"
        : "provider_error",
    };
  }
}
