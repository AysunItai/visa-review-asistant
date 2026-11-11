import { z } from "zod";
import { applicationSchema, type Application } from "./validation.ts";
import { toAIRequest, validateAIOutput, type ActiveApplication, type AIOutput, type AIFailureReason, type AIResponse, type AIState } from "./ai-contract.ts";
import { reviewApplication, type Review } from "./review.ts";

export const statusLabels = {
  pending: "İnceleme bekliyor", reviewing: "İnceleniyor", information_requested: "Ek bilgi gerekli",
  approved: "Onaylandı", rejected: "Reddedildi",
} as const;
export type CaseStatus = keyof typeof statusLabels;
export const decisionLabels = { approve: "Onayla", reject: "Reddet", request_information: "Ek bilgi iste" } as const;
export const decisionSchema = z.object({
  action: z.enum(["approve", "reject", "request_information"]),
  reason: z.string().trim().max(2000, "Gerekçe en fazla 2.000 karakter olabilir."),
}).superRefine((data, ctx) => {
  if (data.action !== "approve" && data.reason.length < 5)
    ctx.addIssue({ code: "custom", path: ["reason"], message: "En az 5 karakterlik kısa bir gerekçe yazın." });
});
export type DecisionInput = z.infer<typeof decisionSchema>;
export type HumanDecision = DecisionInput & { decidedAt: string };
export type CaseAI =
  | { status: "not_started" }
  | { status: "loading"; requestId: string }
  | { status: "successful"; result: AIOutput }
  | { status: "failed"; reason: AIFailureReason };
export interface DemoCase {
  readonly id: string;
  readonly draftId: string;
  readonly reference: string;
  readonly submittedAt: string;
  readonly application: ActiveApplication;
  readonly acknowledgment: { readonly accepted: true; readonly at: string };
  readonly local: Review;
  readonly source: "applicant" | "demo";
  status: CaseStatus;
  ai: CaseAI;
  reviewerNote: string;
  decision: HumanDecision | null;
}

function freezeDeep<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.values(value).forEach(freezeDeep);
    Object.freeze(value);
  }
  return value;
}

/** Validate, normalize and detach the snapshot from mutable form state. Legacy
 * reviewer-only fields remain empty; internal notes never enter model evidence. */
export function createCase(input: Application, acknowledged: boolean, metadata: {
  id: string; draftId: string; submittedAt: string; source?: DemoCase["source"];
}): DemoCase {
  if (!acknowledged) throw new Error("Gönderim onayı gerekli.");
  const validated = applicationSchema.parse({ ...input, notes: "", narratives: { ...input.narratives, fictionalExcerpts: "" } });
  const application = freezeDeep(toAIRequest(validated).application);
  return {
    ...metadata, source: metadata.source ?? "applicant", reference: application.reference,
    application, acknowledgment: Object.freeze({ accepted: true, at: metadata.submittedAt }),
    local: freezeDeep(reviewApplication(validated)), status: "pending", ai: { status: "not_started" },
    reviewerNote: "", decision: null,
  };
}

export interface DemoState {
  role: "applicant" | "admin" | null;
  cases: DemoCase[];
}
export const initialDemoState: DemoState = { role: null, cases: [] };
export type DemoAction =
  | { type: "role"; role: DemoState["role"] }
  | { type: "submit"; entry: DemoCase }
  | { type: "open"; id: string }
  | { type: "note"; id: string; note: string }
  | { type: "decision"; id: string; input: DecisionInput; at: string }
  | { type: "ai-start"; id: string; requestId: string }
  | { type: "ai-finish"; id: string; requestId: string; response: AIResponse };

export function demoReducer(state: DemoState, action: DemoAction): DemoState {
  if (action.type === "role") return { ...state, role: action.role };
  if (action.type === "submit") {
    // Idempotent per draft, never deduplicate on the applicant's reference.
    if (state.cases.some((entry) => entry.id === action.entry.id || entry.draftId === action.entry.draftId)) return state;
    return { ...state, cases: [...state.cases, action.entry] };
  }
  return { ...state, cases: state.cases.map((entry) => {
    if (entry.id !== action.id) return entry;
    switch (action.type) {
      case "open": return entry.status === "pending" ? { ...entry, status: "reviewing" } : entry;
      case "note": return { ...entry, reviewerNote: action.note.slice(0, 2000) };
      case "decision": {
        const parsed = decisionSchema.safeParse(action.input);
        if (!parsed.success) return entry;
        const statuses = { approve: "approved", reject: "rejected", request_information: "information_requested" } as const;
        return { ...entry, status: statuses[parsed.data.action], decision: { ...parsed.data, decidedAt: action.at } };
      }
      case "ai-start":
        if (entry.ai.status === "loading" || !entry.acknowledgment.accepted) return entry;
        return { ...entry, status: entry.status === "pending" ? "reviewing" : entry.status, ai: { status: "loading", requestId: action.requestId } };
      case "ai-finish": {
        if (entry.ai.status !== "loading" || entry.ai.requestId !== action.requestId) return entry;
        if (action.response.status === "unavailable") return { ...entry, ai: { status: "failed", reason: action.response.reason } };
        const result = validateAIOutput(action.response.result, caseAIRequest(entry));
        return { ...entry, ai: result ? { status: "successful", result } : { status: "failed", reason: "invalid_response" } };
      }
    }
  }) };
}

export function caseAIRequest(entry: DemoCase) {
  if (!entry.acknowledgment.accepted) throw new Error("Gönderim onayı gerekli.");
  return toAIRequest(applicationSchema.parse(entry.application));
}
export function reportAIState(ai: CaseAI): AIState {
  if (ai.status === "not_started") return { status: "local" };
  if (ai.status === "loading") return { status: "loading" };
  if (ai.status === "failed") return { status: "unavailable", reason: ai.reason };
  return { status: "success", result: ai.result };
}

/** The applicant receives a deliberately limited projection, never the case. */
export function applicantReceipt(entry: DemoCase) {
  return { id: entry.id, reference: entry.reference, destination: entry.application.destination,
    submittedAt: entry.submittedAt, status: entry.status, decisionAt: entry.decision?.decidedAt ?? null };
}
export type ApplicantReceipt = ReturnType<typeof applicantReceipt>;

export function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}
