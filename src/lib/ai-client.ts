import {
  aiRequestSchema,
  aiResponseSchema,
  validateAIOutput,
  containsIdentifierLikeText,
  type AIRequest,
  type AIResponse,
} from "./ai-contract.ts";

export async function requestAI(
  input: AIRequest,
  signal: AbortSignal,
  transport: typeof fetch = fetch
): Promise<AIResponse> {
  if (signal.aborted) return { status: "unavailable", reason: "cancelled" };
  const validated = aiRequestSchema.safeParse(input);
  if (!validated.success)
    return { status: "unavailable", reason: "invalid_input" };
  if (containsIdentifierLikeText(validated.data))
    return { status: "unavailable", reason: "privacy" };
  const deadline = AbortSignal.timeout(30_000);
  try {
    const response = await transport("/api/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated.data),
      signal: AbortSignal.any([signal, deadline]),
      cache: "no-store",
    });
    const parsed = aiResponseSchema.safeParse(await response.json());
    if (!parsed.success)
      return { status: "unavailable", reason: "invalid_response" };
    if (parsed.data.status === "success") {
      const result = response.ok ? validateAIOutput(parsed.data.result, validated.data) : null;
      return result ? { status: "success", result } : { status: "unavailable", reason: "invalid_response" };
    }
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
