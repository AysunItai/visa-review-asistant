import { z } from "zod";
import {
  applicationSchema,
  declarations,
  type Application,
} from "./validation.ts";
import { narrativeSchema, narrativeFields } from "./narratives.ts";
import { dayNumber } from "./dates.ts";

// Explicit allowlist: reference, reviewer notes, and applicant profile stay local.
const shape = applicationSchema.shape;
export const contextSchema = z
  .strictObject({
    destination: shape.destination,
    purpose: shape.purpose,
    departure: shape.departure.max(10),
    returnDate: shape.returnDate.max(10),
    currency: shape.currency,
    budget: shape.budget.max(20),
    estimatedCost: shape.estimatedCost.max(20),
    stays: shape.stays.max(20),
    declarations: shape.declarations.strict(),
  })
  .superRefine((data, ctx) => {
    if (dayNumber(data.returnDate) < dayNumber(data.departure))
      ctx.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Dönüş gidişten önce olamaz.",
      });
  });
export const aiRequestSchema = z.strictObject({
  context: contextSchema,
  narratives: narrativeSchema,
  anonymized: z.literal(true),
});
export type AIRequest = z.infer<typeof aiRequestSchema>;
export function toAIRequest(application: Application): AIRequest {
  return {
    context: {
      destination: application.destination,
      purpose: application.purpose,
      departure: application.departure,
      returnDate: application.returnDate,
      currency: application.currency,
      budget: application.budget,
      estimatedCost: application.estimatedCost,
      stays: application.stays.map(({ type, checkIn, checkOut }) => ({
        type,
        checkIn,
        checkOut,
      })),
      declarations: {
        identity: application.declarations.identity,
        itinerary: application.declarations.itinerary,
        budget: application.declarations.budget,
        accommodation: application.declarations.accommodation,
      },
    },
    narratives: {
      travelPurpose: application.narratives.travelPurpose,
      funding: application.narratives.funding,
      accommodation: application.narratives.accommodation,
      fictionalExcerpts: application.narratives.fictionalExcerpts,
    },
    anonymized: true,
  };
}

export interface EvidenceSource {
  fieldId: string;
  label: string;
  value: string;
}
export function evidenceSources(input: AIRequest): EvidenceSource[] {
  const c = input.context;
  const sources: EvidenceSource[] = [
    {
      fieldId: "destination",
      label: "Gidilecek ülke (yalnızca bağlam)",
      value: c.destination,
    },
    { fieldId: "purpose", label: "Seyahat amacı", value: c.purpose },
    { fieldId: "departure", label: "Gidiş tarihi", value: c.departure },
    { fieldId: "returnDate", label: "Dönüş tarihi", value: c.returnDate },
    { fieldId: "currency", label: "Para birimi", value: c.currency },
    { fieldId: "budget", label: "Beyan edilen bütçe", value: c.budget },
    {
      fieldId: "estimatedCost",
      label: "Kullanıcının maliyet tahmini",
      value: c.estimatedCost,
    },
    {
      fieldId: "stays",
      label: "Girilen konaklama kayıtları",
      value: JSON.stringify(c.stays),
    },
  ];
  c.stays.forEach((stay, index) => {
    for (const [key, label] of [
      ["type", "Tür"],
      ["checkIn", "Giriş"],
      ["checkOut", "Çıkış"],
    ] as const)
      sources.push({
        fieldId: `stays.${index}.${key}`,
        label: `Konaklama ${index + 1} · ${label}`,
        value: stay[key],
      });
  });
  for (const [key, value] of Object.entries(c.declarations))
    sources.push({
      fieldId: `declarations.${key}`,
      label: declarations[key as keyof typeof declarations],
      value: value ? "İşaretli" : "İşaretlenmedi",
    });
  for (const key of Object.keys(
    narrativeFields
  ) as (keyof typeof narrativeFields)[])
    sources.push({
      fieldId: `narratives.${key}`,
      label: narrativeFields[key].label,
      value: input.narratives[key],
    });
  return sources;
}

export const aiOutputSchema = z.strictObject({
  observations: z
    .array(
      z.strictObject({
        category: z.enum(["Çelişki", "Eksik açıklama", "Belirsizlik"]),
        title: z.string().min(1).max(160),
        explanation: z.string().min(1).max(800),
        evidence: z
          .array(
            z.strictObject({
              fieldId: z.string().min(1).max(100),
              quote: z.string().max(500),
            })
          )
          .min(1)
          .max(5),
        question: z.string().min(1).max(350),
      })
    )
    .max(8),
});
export type AIOutput = z.infer<typeof aiOutputSchema>;

/** Fail closed on invented field references, quotations or overt personal judgments. */
export function validateAIOutput(
  raw: unknown,
  input: AIRequest
): AIOutput | null {
  const parsed = aiOutputSchema.safeParse(raw);
  if (!parsed.success) return null;
  const sources = new Map(
    evidenceSources(input).map((s) => [s.fieldId, s.value])
  );
  const prohibited =
    /güvenil(?:ir|mez)|(?:kişisel|başvuru\s*sahibi.{0,25})\s*risk|risk\s*(?:puan|skor)|(?:yüksek|düşük)\s*riskli|vize\s*(?:onay|kabul|ret|red|uygunlu)|kabul\s*(?:olasılı|ihtimal)|(?:approve|reject)\s*(?:the\s*)?(?:visa|applicant|application)|trustworth|personal\s*risk|approval\s*probability/iu;
  for (const observation of parsed.data.observations) {
    if (
      prohibited.test(
        [observation.title, observation.explanation, observation.question].join(
          " "
        )
      )
    )
      return null;
    for (const evidence of observation.evidence) {
      const value = sources.get(evidence.fieldId);
      if (value === undefined) return null;
      if (
        value === ""
          ? evidence.quote !== ""
          : !evidence.quote.trim() || !value.includes(evidence.quote)
      )
        return null;
    }
  }
  return parsed.data;
}

export const aiFailureReasons = [
  "not_configured",
  "timeout",
  "provider_error",
  "invalid_response",
  "invalid_input",
  "privacy",
  "consent_required",
  "cancelled",
  "refused",
] as const;
export type AIFailureReason = (typeof aiFailureReasons)[number];
export const aiResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("success"), result: aiOutputSchema }),
  z.strictObject({
    status: z.literal("unavailable"),
    reason: z.enum(aiFailureReasons),
  }),
]);
export type AIResponse = z.infer<typeof aiResponseSchema>;
export type AIState = AIResponse | { status: "local" } | { status: "loading" };
export const aiFailureMessages: Record<AIFailureReason, string> = {
  consent_required:
    "Harici gönderim onayı verilmedi. AI isteği gönderilmedi; yerel rapor kullanılabilir.",
  not_configured:
    "AI yapılandırılmamış. Sunucuda OPENAI_API_KEY ve OPENAI_MODEL tanımlanmalı. Yerel rapor kullanılabilir.",
  timeout:
    "AI isteği zaman aşımına uğradı. AI sonucu alınamadı; yerel rapor kullanılabilir.",
  provider_error:
    "AI sağlayıcısına erişilemedi veya sağlayıcı isteği kabul etmedi. Yerel rapor kullanılabilir.",
  invalid_response:
    "AI yanıtının biçimi veya dayanakları doğrulanamadı. Yanıt gösterilmedi; yerel rapor kullanılabilir.",
  invalid_input:
    "AI için bilgiler doğrulanamadı. En fazla 20 konaklama kaydı ve belirtilen metin sınırlarını kullanın. Yerel rapor kullanılabilir.",
  privacy:
    "Açıklamalarda kişisel tanımlayıcı olabilecek bilgi bulundu. Bu bilgileri kaldırın. Sağlayıcıya gönderilmedi; yerel rapor kullanılabilir.",
  cancelled:
    "Bilgiler değiştiği için AI isteği iptal edildi. Güncel rapor için yeniden analiz edin.",
  refused:
    "Sağlayıcı bu istek için analiz üretmedi. AI gözlemi yok; yerel rapor kullanılabilir.",
};
export function aiStatusLabel(state: AIState): string {
  return state.status === "success"
    ? "Yerel kontroller + yapay zekâ gözlemleri"
    : state.status === "loading"
    ? "Yerel rapor hazır · AI bekleniyor"
    : "Demo — kural tabanlı analiz";
}
export function aiReportText(state: AIState, input: AIRequest): string {
  if (state.status === "local")
    return "AI kullanılmadı. Yalnızca yerel kontroller çalıştırıldı.";
  if (state.status === "loading")
    return "AI isteği sürüyor; bu kopyada AI sonucu yok.";
  if (state.status === "unavailable") return aiFailureMessages[state.reason];
  const sources = new Map(
    evidenceSources(input).map((s) => [s.fieldId, s.label])
  );
  return [
    "Yapay zekâ gözlemleri — OpenAI",
    "İnsan tarafından doğrulanmalıdır. Yerel kural bulgularından ayrıdır.",
    ...(state.result.observations.length
      ? state.result.observations.flatMap((o, i) => [
          `AI-${i + 1} · ${o.category}: ${o.title}`,
          o.explanation,
          ...o.evidence.map(
            (e) =>
              `Dayanak [${e.fieldId}] ${sources.get(e.fieldId)}: ${
                e.quote || "Alan boş bırakıldı."
              }`
          ),
          `Netleştirme sorusu: ${o.question}`,
          "",
        ])
      : [
          "Sağlayıcı ek gözlem bildirmedi. Bu, bilgilerin doğrulandığı anlamına gelmez.",
        ]),
  ].join("\n");
}
