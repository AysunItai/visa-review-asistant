import { profileLabels } from "./applicant-profile.ts";
import { declarations } from "./validation.ts";
import { reportText } from "./review.ts";
import { aiReportText } from "./ai-contract.ts";
import { caseAIRequest, reportAIState, statusLabels, formatTimestamp, type DemoCase } from "./demo-cases.ts";

export interface AnswerEntry { id: string; label: string; value: string }
export interface AnswerSection { title: string; entries: AnswerEntry[] }
/** Shared by the complete submitted-answers view and the admin text export. */
export function submittedSections(entry: DemoCase): AnswerSection[] {
  const a = entry.application;
  const field = (id: string, label: string, value: string): AnswerEntry => ({ id, label, value });
  const financial = new Set(["hasAssets", "assets", "fundingMethods"]);
  const profile = Object.entries(a.profile).map(([key, value]) => field(`profile.${key}`, profileLabels[key as keyof typeof profileLabels], Array.isArray(value) ? value.join(", ") : value));
  return [
    { title: "Başvuru ve seyahat", entries: [
      field("reference", "Başvuru referansı", a.reference), field("destination", "Gidilecek ülke", a.destination),
      field("purpose", "Seyahat amacı", a.purpose), field("departure", "Gidiş tarihi", a.departure), field("returnDate", "Dönüş tarihi", a.returnDate),
      field("narratives.travelPurpose", "Seyahat amacı açıklaması", a.narratives.travelPurpose),
    ] },
    { title: "Kişisel bilgiler ve seyahat geçmişi", entries: profile.filter((p) => !financial.has(p.id.slice(8))) },
    { title: "Finansman ve varlıklar", entries: [
      field("currency", "Para birimi", a.currency), field("budget", "Kullanılabilir seyahat bütçesi", a.budget), field("estimatedCost", "Tahmini toplam maliyet", a.estimatedCost),
      ...profile.filter((p) => financial.has(p.id.slice(8))), field("narratives.funding", "Finansman açıklaması", a.narratives.funding),
    ] },
    { title: "Konaklama ve belge beyanları", entries: [
      ...a.stays.flatMap((stay, i) => [field(`stays.${i}.type`, `Konaklama ${i + 1} · Tür`, stay.type), field(`stays.${i}.checkIn`, `Konaklama ${i + 1} · Giriş`, stay.checkIn), field(`stays.${i}.checkOut`, `Konaklama ${i + 1} · Çıkış`, stay.checkOut)]),
      ...(!a.stays.length ? [field("stays", "Konaklama kayıtları", "Kayıt yok · Aynı gün dönüş")] : []),
      field("narratives.accommodation", "Konaklama açıklaması", a.narratives.accommodation),
      ...Object.entries(a.declarations).map(([key, value]) => field(`declarations.${key}`, declarations[key as keyof typeof declarations], value ? "Evet" : "Hayır")),
      ...(a.narratives.fictionalExcerpts ? [field("narratives.fictionalExcerpts", "Kurgusal belge alıntıları (doğrulanmış belge değildir)", a.narratives.fictionalExcerpts)] : []),
      ...(a.notes ? [field("notes", "Önceki formdan gelen not", a.notes)] : []),
    ] },
    { title: "Gönderim onayı", entries: [field("acknowledgment", "OpenAI ile ön inceleme bilgilendirmesi", `Kabul edildi · ${formatTimestamp(entry.acknowledgment.at)}`)] },
  ];
}

export function caseReportText(entry: DemoCase): string {
  return [
    "VizeLens — Yönetici inceleme raporu", "Demo ortamı · Yalnızca kurgusal başvuru",
    `Gönderim: ${formatTimestamp(entry.submittedAt)}`, `Durum: ${statusLabels[entry.status]}`,
    "", "GÖNDERİLEN BAŞVURU YANITLARI",
    ...submittedSections(entry).flatMap((section) => ["", section.title, ...section.entries.map((item) => `${item.label}: ${item.value}`)]),
    "", "YEREL KONTROLLER", reportText(entry.local),
    "", "AI ÖN DEĞERLENDİRMESİ", aiReportText(reportAIState(entry.ai), caseAIRequest(entry)),
    "", "İNSAN DEĞERLENDİRMESİ — SİMÜLE KARAR",
    `İç inceleme notu: ${entry.reviewerNote || "Not eklenmedi."}`,
    ...(entry.decision ? [`Karar: ${statusLabels[entry.status]}`, `Gerekçe: ${entry.decision.reason || "Belirtilmedi."}`, `Karar tarihi: ${formatTimestamp(entry.decision.decidedAt)}`] : ["Henüz karar kaydedilmedi."]),
    "Bu karar yalnızca sınıf demosuna aittir. Bir elçiliğe başvuru göndermez veya vize vermez.",
  ].join("\n");
}
