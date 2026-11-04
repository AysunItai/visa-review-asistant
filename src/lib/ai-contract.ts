import { z } from "zod";
import { applicationSchema, declarations, type Application } from "./validation.ts";
import { profileLabels, type ApplicantProfile } from "./applicant-profile.ts";
import { narrativeFields, hasIdentifierLikeText } from "./narratives.ts";
import { reviewValidatedContext } from "./review.ts";

type ConditionalProfileKey = "travelRegions" | "visaOrResidenceCountries" | "visaRefusalCountries" |
  "refusalExplanation" | "foreignLanguages" | "relativeRelationship" | "relativesDetails" | "assets";
export type ActiveApplication = Omit<Application, "profile"> & {
  profile: Omit<ApplicantProfile, ConditionalProfileKey> & Partial<Pick<ApplicantProfile, ConditionalProfileKey>>;
};

// Explicit allowlist. Do not spread React state or add fields without updating disclosure/tests.
function activeApplication(a: Application): ActiveApplication {
  const p = a.profile;
  return {
    reference: a.reference, destination: a.destination, purpose: a.purpose,
    departure: a.departure, returnDate: a.returnDate, currency: a.currency,
    budget: a.budget, estimatedCost: a.estimatedCost,
    stays: a.stays.map(({ type, checkIn, checkOut }) => ({ type, checkIn, checkOut })),
    declarations: {
      identity: a.declarations.identity, itinerary: a.declarations.itinerary,
      budget: a.declarations.budget, accommodation: a.declarations.accommodation,
    },
    notes: a.notes,
    narratives: {
      travelPurpose: a.narratives.travelPurpose, funding: a.narratives.funding,
      accommodation: a.narratives.accommodation, fictionalExcerpts: a.narratives.fictionalExcerpts,
    },
    profile: {
      employmentSector: p.employmentSector, occupation: p.occupation,
      employmentStartYear: p.employmentStartYear, maritalStatus: p.maritalStatus,
      age: p.age, birthCountry: p.birthCountry, education: p.education,
      visitedCountryCount: p.visitedCountryCount,
      ...(Number(p.visitedCountryCount) > 0 ? { travelRegions: [...p.travelRegions] } : {}),
      hasValidVisaOrResidence: p.hasValidVisaOrResidence,
      ...(p.hasValidVisaOrResidence === "Evet" ? { visaOrResidenceCountries: p.visaOrResidenceCountries } : {}),
      hasVisaRefusal: p.hasVisaRefusal,
      ...(p.hasVisaRefusal === "Evet" ? { visaRefusalCountries: p.visaRefusalCountries, refusalExplanation: p.refusalExplanation } : {}),
      hasForeignLanguages: p.hasForeignLanguages,
      ...(p.hasForeignLanguages === "Evet" ? { foreignLanguages: p.foreignLanguages } : {}),
      hasRelativesAtDestination: p.hasRelativesAtDestination,
      ...(p.hasRelativesAtDestination === "Evet" ? { relativeRelationship: p.relativeRelationship, relativesDetails: p.relativesDetails } : {}),
      hasAssets: p.hasAssets,
      ...(p.hasAssets === "Evet" ? { assets: [...p.assets] } : {}),
      fundingMethods: [...p.fundingMethods],
    },
  };
}
export const aiRequestSchema = z.strictObject({
  application: applicationSchema.strict(),
  consent: z.literal(true),
}).transform(({ application, consent }) => ({ application: activeApplication(application), consent }));
export type AIRequest = z.infer<typeof aiRequestSchema>;
export function toAIRequest(application: Application): AIRequest {
  return { application: activeApplication(applicationSchema.parse(application)), consent: true };
}

export interface EvidenceSource { fieldId: string; label: string; value: string }
export function evidenceSources(input: AIRequest): EvidenceSource[] {
  const a = input.application;
  const labels = {
    reference: "Başvuru referansı", destination: "Gidilecek ülke", purpose: "Seyahat amacı",
    departure: "Gidiş tarihi", returnDate: "Dönüş tarihi", currency: "Para birimi",
    budget: "Beyan edilen bütçe", estimatedCost: "Kullanıcının maliyet tahmini", notes: "İnceleme notu",
  } as const;
  const sources: EvidenceSource[] = Object.entries(labels).map(([key, label]) => ({
    fieldId: key, label, value: a[key as keyof typeof labels],
  }));
  a.stays.forEach((stay, index) => {
    for (const [key, label] of [["type", "Tür"], ["checkIn", "Giriş"], ["checkOut", "Çıkış"]] as const)
      sources.push({ fieldId: `stays.${index}.${key}`, label: `Konaklama ${index + 1} · ${label}`, value: stay[key] });
  });
  for (const key of Object.keys(declarations) as (keyof typeof declarations)[])
    sources.push({ fieldId: `declarations.${key}`, label: declarations[key], value: a.declarations[key] ? "İşaretli" : "İşaretlenmedi" });
  for (const key of Object.keys(narrativeFields) as (keyof typeof narrativeFields)[])
    sources.push({ fieldId: `narratives.${key}`, label: narrativeFields[key].label, value: a.narratives[key] });
  for (const key of Object.keys(profileLabels) as (keyof ApplicantProfile)[]) {
    const value = a.profile[key];
    if (value !== undefined) sources.push({ fieldId: `profile.${key}`, label: profileLabels[key], value: Array.isArray(value) ? value.join(", ") : value });
  }
  return sources;
}
export function containsIdentifierLikeText(input: AIRequest): boolean {
  return evidenceSources(input).some(({ value }) => hasIdentifierLikeText(value));
}

export const assessmentLabels = {
  no_material_concern_identified: "Önemli bir sorun tespit edilmedi",
  clarification_required: "Açıklama gerekiyor",
  significant_concerns_identified: "Önemli açıklama gerektiren konular belirlendi",
  insufficient_information: "Değerlendirme için bilgi yetersiz",
} as const;
export const priorityLabels = { low: "Düşük öncelik", medium: "Orta öncelik", high: "Yüksek öncelik" } as const;
const evidenceSchema = z.array(z.strictObject({
  fieldId: z.string().min(1).max(100), value: z.string().min(1).max(1000),
})).min(1).max(6);
export const aiOutputSchema = z.strictObject({
  overallAssessment: z.enum(["no_material_concern_identified", "clarification_required", "significant_concerns_identified", "insufficient_information"]),
  summary: z.string().trim().min(1).max(1200),
  findings: z.array(z.strictObject({
    category: z.enum(["Çelişki", "Finansman", "Seyahat amacı", "Konaklama ve seyahat planı", "Destekleyici bilgi", "Belirsizlik"]),
    priority: z.enum(["low", "medium", "high"]),
    title: z.string().trim().min(1).max(160),
    explanation: z.string().trim().min(1).max(1000),
    evidence: evidenceSchema,
    clarificationQuestion: z.string().trim().min(1).max(400),
  })).max(12),
  consistentPoints: z.array(z.strictObject({
    explanation: z.string().trim().min(1).max(600), evidence: evidenceSchema,
  })).max(8),
  limitations: z.array(z.string().trim().min(1).max(700)).min(1).max(10),
});
export type AIOutput = z.infer<typeof aiOutputSchema>;
export type AIFinding = AIOutput["findings"][number];
export const REQUIRED_LIMITATIONS = [
  "Projede incelenmiş, kaynaklı vize kriterleri bulunmuyor. Bu incelemeyle resmî vize uygunluğu belirlenemez; ülkeye özgü kural veya finansal eşik uygulanmadı.",
  "Tüm bilgiler başvuru sahibinin beyanıdır. Belge kutuları bilgi beyanını gösterir; belgenin mevcut olduğu, incelendiği veya doğrulandığı anlamına gelmez. Kurgusal alıntılar gerçek belge kanıtı değildir; hiçbir belge doğrulanmadı.",
  "Bu ön değerlendirme resmî vize kararı, kabul/ret tahmini veya olasılık puanı değildir. Önemli bir sorun bulunmaması vize uygunluğunu doğrulamaz.",
] as const;
export function assessmentLimitations(result: AIOutput): string[] {
  return [...new Set([...REQUIRED_LIMITATIONS, ...result.limitations])];
}
export function orderedFindings(result: AIOutput): AIFinding[] {
  const order = { high: 0, medium: 1, low: 2 };
  return [...result.findings].sort((a, b) => order[a.priority] - order[b.priority]);
}

/** Structural evidence checks are a backstop, not proof of semantic correctness. */
export function validateAIOutput(raw: unknown, input: AIRequest): AIOutput | null {
  const parsed = aiOutputSchema.safeParse(raw);
  if (!parsed.success) return null;
  const result = parsed.data;
  const sources = new Map(evidenceSources(input).map((s) => [s.fieldId, s.value]));
  const local = reviewValidatedContext(input.application);
  if (result.overallAssessment === "no_material_concern_identified" && (local.findings.length || result.findings.length)) return null;
  if (result.overallAssessment === "significant_concerns_identified" && !result.findings.some((f) => f.priority === "high")) return null;
  if (result.overallAssessment === "clarification_required" && !result.findings.length && !local.findings.length) return null;
  if (result.findings.some((f) => f.priority === "high") && result.overallAssessment !== "significant_concerns_identified" && result.overallAssessment !== "insufficient_information") return null;
  // Reject obvious personal judgments/predictions without rejecting statements that eligibility cannot be established.
  const prohibited = /güvenilmez|trustworth|(?:risk\s*(?:puan|skor)|(?:kabul|ret|onay)\s*(?:olasılı|ihtimal)|approval\s*probability).{0,20}\d|(?:%\s*\d|\d\s*%).{0,40}(?:vize|onay|ret|kabul)|(?:vize|onay|ret|kabul).{0,40}(?:%\s*\d|\d\s*%)|vize(?:niz)?\s+(?:onaylanacak|reddedilecek|onaylanır|reddedilir)|belgeler(?:iniz)?\s+(?:doğrulandı|onaylandı)/iu;
  const text = [result.summary, ...result.limitations, ...result.consistentPoints.map((p) => p.explanation), ...result.findings.flatMap((f) => [f.title, f.explanation, f.clarificationQuestion])].join("\n");
  if (prohibited.test(text)) return null;
  for (const item of [...result.findings, ...result.consistentPoints]) {
    for (const evidence of item.evidence) {
      const value = sources.get(evidence.fieldId);
      if (value === undefined || !evidence.value.trim() || !value.includes(evidence.value)) return null;
      // Short quotations are allowed only from prose. Numeric, date, enum and list values must match exactly.
      if (!/^(narratives\.|notes$|profile\.(occupation|visaOrResidenceCountries|visaRefusalCountries|refusalExplanation|foreignLanguages|relativeRelationship|relativesDetails)$)/.test(evidence.fieldId) && value !== evidence.value) return null;
    }
  }
  const demographicOnly = /^profile\.(age|maritalStatus|birthCountry|hasForeignLanguages|foreignLanguages|hasAssets|assets|visitedCountryCount|travelRegions)$/;
  if (result.findings.some((f) => f.evidence.every((e) => demographicOnly.test(e.fieldId)))) return null;
  // Pure date/budget findings belong to the deterministic section, never a second model-generated calculation.
  const deterministicField = (id: string) => /^(departure|returnDate|budget|estimatedCost|currency)$|^stays\.\d+\.(checkIn|checkOut|type)$/.test(id);
  if (result.findings.some((f) => f.evidence.every((e) => deterministicField(e.fieldId)))) return null;
  // Prevent positive claims based solely on numeric inputs already contradicted by the rules.
  if (result.consistentPoints.some((p) =>
    (local.findings.some((f) => f.ruleId === "budget.shortfall") && p.evidence.every((e) => /^(budget|estimatedCost|currency)$/.test(e.fieldId))) ||
    (local.findings.some((f) => f.ruleId.startsWith("accommodation.")) && p.evidence.every((e) => /^(departure|returnDate)$|^stays\./.test(e.fieldId)))
  )) return null;
  const signatures = new Set<string>();
  for (const f of result.findings) {
    const signature = `${f.category}:${f.title.toLocaleLowerCase("tr-TR")}`;
    if (signatures.has(signature)) return null;
    signatures.add(signature);
  }
  return result;
}

export const aiFailureReasons = ["not_configured", "timeout", "provider_error", "invalid_response", "invalid_input", "privacy", "consent_required", "cancelled", "refused"] as const;
export type AIFailureReason = (typeof aiFailureReasons)[number];
export const aiResponseSchema = z.discriminatedUnion("status", [
  z.strictObject({ status: z.literal("success"), result: aiOutputSchema }),
  z.strictObject({ status: z.literal("unavailable"), reason: z.enum(aiFailureReasons) }),
]);
export type AIResponse = z.infer<typeof aiResponseSchema>;
export type AIState = AIResponse | { status: "local" } | { status: "loading" };
export const aiFailureMessages: Record<AIFailureReason, string> = {
  consent_required: "Harici gönderim onayı verilmedi. AI isteği gönderilmedi; yerel rapor kullanılabilir.",
  not_configured: "AI yapılandırılmamış. Sunucuda OPENAI_API_KEY ve OPENAI_MODEL tanımlanmalı. Bilgileriniz korundu; yapılandırma sonrası yeniden deneyin.",
  timeout: "AI isteği zaman aşımına uğradı. Bilgileriniz korundu; yeniden deneyebilirsiniz. Yerel rapor kullanılabilir.",
  provider_error: "AI sağlayıcısına erişilemedi veya sağlayıcı isteği kabul etmedi. Bilgileriniz korundu; yeniden deneyebilirsiniz.",
  invalid_response: "AI yanıtının biçimi veya dayanakları doğrulanamadı. Yanıt gösterilmedi. Bilgileriniz korundu; yeniden deneyebilirsiniz.",
  invalid_input: "AI için bilgiler doğrulanamadı. Zorunlu alanları, en fazla 20 konaklama kaydını ve metin sınırlarını kontrol edin. Bilgileriniz korundu.",
  privacy: "Yanıtlarda kimlik veya iletişim bilgisi olabilecek metin bulundu. İlgisiz tanımlayıcıları kaldırıp yeniden deneyin. Bilgileriniz korundu; sağlayıcıya gönderilmedi.",
  cancelled: "Bilgiler değiştiği için AI isteği iptal edildi. Güncel rapor için yeniden analiz edin.",
  refused: "Sağlayıcı bu istek için değerlendirme üretmedi. Yerel rapor kullanılabilir; bilgileri gözden geçirip yeniden deneyebilirsiniz.",
};
export function aiStatusLabel(state: AIState): string {
  return state.status === "success" ? "Yerel kontroller + AI Ön Değerlendirme" : state.status === "loading" ? "Yerel rapor hazır · AI bekleniyor" : "Yalnızca yerel kontroller";
}
export function aiReportText(state: AIState, input: AIRequest): string {
  if (state.status === "local") return "AI kullanılmadı. Yalnızca yerel kontroller çalıştırıldı.";
  if (state.status === "loading") return "AI isteği sürüyor; bu kopyada AI sonucu yok.";
  if (state.status === "unavailable") return aiFailureMessages[state.reason];
  const result = state.result;
  const sources = new Map(evidenceSources(input).map((s) => [s.fieldId, s.label]));
  const evidenceText = (evidence: AIFinding["evidence"]) => evidence.map((e) => `Dayanak [${e.fieldId}] ${sources.get(e.fieldId)}: ${e.value}`);
  return [
    "AI Ön Değerlendirme — OpenAI", assessmentLabels[result.overallAssessment], result.summary,
    "Yerel kural bulguları önceki bölümde yer alır. Aşağıdakiler AI tarafından belirlenen ek konulardır.",
    ...orderedFindings(result).flatMap((f, i) => [`AI-${i + 1} · ${priorityLabels[f.priority]} · ${f.category}: ${f.title}`, f.explanation, ...evidenceText(f.evidence), `Netleştirme sorusu: ${f.clarificationQuestion}`, ""]),
    "Tutarlı noktalar", ...result.consistentPoints.flatMap((p) => [p.explanation, ...evidenceText(p.evidence)]),
    "Değerlendirme sınırları", ...assessmentLimitations(result),
  ].join("\n");
}
