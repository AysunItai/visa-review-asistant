import type { AIOutput } from "../../src/lib/ai-contract.ts";

// Synthetic results for automated tests only; never used by application code.
export function assessmentFixture(overrides: Partial<AIOutput> = {}): AIOutput {
  const status = overrides.overallAssessment ?? "no_material_concern_identified";
  const summaries = {
    no_material_concern_identified: "Girilen bilgilerde bu sınırlı inceleme kapsamında önemli bir sorun tespit edilmedi.",
    clarification_required: "Bazı açıklamaların ayrıntılandırılması gerekiyor.",
    significant_concerns_identified: "Öncelikle açıklanması gereken önemli konular belirlendi.",
    insufficient_information: "Mevcut açıklamalar anlamlı bir değerlendirme için yetersiz.",
  };
  return {
    concernLevel: status === "insufficient_information" ? "unable_to_assess" : status === "no_material_concern_identified" ? "low" : "medium",
    evidenceSufficiency: status === "insufficient_information" ? "insufficient" : "sufficient",
    concernExplanation: "Gönderilen seyahat açıklaması üzerinden sınırlı ön inceleme yapıldı.",
    concernEvidence: [{ fieldId: "narratives.travelPurpose", value: "Müzeleri" }],
    overallAssessment: "no_material_concern_identified",
    summary: summaries[status],
    findings: [], consistentPoints: [{ explanation: "Seyahat açıklaması turistik gezi planını belirtiyor.", evidence: [{ fieldId: "narratives.travelPurpose", value: "Müzeleri" }] }],
    limitations: ["Belgeler doğrulanmadı. Resmî vize uygunluğu belirlenemez."],
    ...overrides,
  };
}
