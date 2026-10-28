import { dayNumber, formatDate, formatMoney, formatNumber } from "./dates.ts";
import { profileEntries } from "./applicant-profile.ts";
import {
  applicationSchema,
  declarations,
  toAmount,
  type Application,
} from "./validation.ts";

export type FindingCategory =
  | "Eksik bilgi"
  | "Tutarsızlık"
  | "İncelenecek bilgi";
export interface Finding {
  ruleId: string;
  category: FindingCategory;
  title: string;
  explanation: string;
  evidence: string;
  question: string;
}
export interface Review {
  application: Application;
  nights: number;
  coveredNights: number;
  uncoveredNights: number;
  overlapNights: number;
  findings: Finding[];
  summary: string;
}
export const SCOPE_NOTE =
  "Bu rapor yalnızca girilen bilgilerdeki eksikleri ve tutarsızlıkları gösterir. Güncel ülke mevzuatını veya belge gerçekliğini doğrulamaz. Kabul/red kararı vermez; son değerlendirme insana aittir.";

type Interval = [number, number];
function unionLength(intervals: Interval[]): number {
  const sorted = [...intervals]
    .filter(([a, b]) => b > a)
    .sort((a, b) => a[0] - b[0]);
  let total = 0;
  let end = -Infinity;
  for (const [a, b] of sorted) {
    total += Math.max(0, b - Math.max(a, end));
    end = Math.max(end, b);
  }
  return total;
}

/** Pure authoritative engine. Invalid input throws before any report is generated. */
export function reviewApplication(input: Application): Review {
  const application = applicationSchema.parse(input);
  const start = dayNumber(application.departure);
  const end = dayNumber(application.returnDate);
  const nights = end - start;
  const intervals: Interval[] = application.stays.map((stay) => [
    dayNumber(stay.checkIn),
    dayNumber(stay.checkOut),
  ]);
  const clipped: Interval[] = intervals
    .map(([a, b]): Interval => [Math.max(a, start), Math.min(b, end)])
    .filter(([a, b]) => b > a);
  const coveredNights = unionLength(clipped);
  // Union of pairwise intersections counts each overlapping night just once, even for 3+ stays.
  const intersections: Interval[] = [];
  for (let i = 0; i < intervals.length; i++)
    for (let j = i + 1; j < intervals.length; j++)
      intersections.push([
        Math.max(intervals[i][0], intervals[j][0]),
        Math.min(intervals[i][1], intervals[j][1]),
      ]);
  const overlapNights = unionLength(intersections);
  const uncoveredNights = nights - coveredNights;
  const findings: Finding[] = [];
  if (!application.stays.length && nights > 0)
    findings.push({
      ruleId: "accommodation.missing",
      category: "Eksik bilgi",
      title: "Konaklama bilgisi henüz girilmedi",
      explanation:
        "Gecelemeli seyahat için konaklama kapsamı karşılaştırılamadı. Bu durum tek başına bir olumsuzluk göstergesi değildir.",
      evidence: `${formatNumber(
        nights
      )} gecelik seyahat için konaklama kaydı bulunmuyor.`,
      question: "Seyahat boyunca konaklama planınızı paylaşabilir misiniz?",
    });
  else if (uncoveredNights > 0)
    findings.push({
      ruleId: "accommodation.coverage",
      category: "Eksik bilgi",
      title: "Konaklama açıklaması seyahatin tamamını kapsamıyor",
      explanation:
        "Girilen konaklama aralıkları seyahat tarihleri içinde birleştirildi. Çıkış günü gecelemeye dahil edilmedi.",
      evidence: `${formatNumber(nights)} gecelik seyahatin ${formatNumber(
        coveredNights
      )} gecesi için konaklama bilgisi girildi.`,
      question: `Kalan ${formatNumber(
        uncoveredNights
      )} gece için konaklama planınız nedir?`,
    });
  if (overlapNights > 0)
    findings.push({
      ruleId: "accommodation.overlap",
      category: "İncelenecek bilgi",
      title: "Konaklama tarihleri birbiriyle örtüşüyor",
      explanation:
        "Örtüşen kayıtlar alternatif planları gösterebilir. Kapsam hesabında aynı gece yalnızca bir kez sayıldı.",
      evidence: `Girilen konaklama kayıtlarında ${formatNumber(
        overlapNights
      )} gece birden fazla kayıtta yer alıyor.`,
      question: "Örtüşen tarihlerde hangi konaklama planı geçerlidir?",
    });
  const outside = application.stays.filter(
    (_, i) => intervals[i][0] < start || intervals[i][1] > end
  );
  if (outside.length)
    findings.push({
      ruleId: "accommodation.outside",
      category: "Tutarsızlık",
      title: "Konaklama tarihleri seyahat aralığının dışına taşıyor",
      explanation:
        "Seyahat dışındaki geceler konaklama kapsamına dahil edilmedi.",
      evidence: outside
        .map(
          (stay) =>
            `${stay.type}: ${formatDate(stay.checkIn)} – ${formatDate(
              stay.checkOut
            )}`
        )
        .join("; "),
      question:
        "Seyahat tarihlerini veya bu konaklama kayıtlarını netleştirebilir misiniz?",
    });
  const budget = toAmount(application.budget);
  const cost = toAmount(application.estimatedCost);
  if (budget < cost)
    findings.push({
      ruleId: "budget.shortfall",
      category: "Tutarsızlık",
      title: "Beyan edilen bütçe, tahmini maliyetin altında",
      explanation:
        "Bu karşılaştırma yalnızca sizin girdiğiniz maliyet tahminine dayanır; resmî bir mali yeterlilik koşulu değildir.",
      evidence: `Beyan edilen bütçe ${formatMoney(
        budget,
        application.currency
      )}, tahmini maliyet ${formatMoney(
        cost,
        application.currency
      )}. Fark: ${formatMoney(
        Math.round((cost - budget) * 100) / 100,
        application.currency
      )}.`,
      question:
        "Bütçe ile maliyet tahmini arasındaki farkı nasıl açıklarsınız?",
    });
  for (const key of Object.keys(
    declarations
  ) as (keyof Application["declarations"])[]) {
    if (!application.declarations[key])
      findings.push({
        ruleId: `declaration.${key}`,
        category: "Eksik bilgi",
        title: declarations[key].replace(" beyan edildi", " beyanı eksik"),
        explanation:
          "İlgili beyan kutusu işaretlenmedi. Bu kontrol, belgenin mevcut veya gerçek olup olmadığını göstermez.",
        evidence: `“${declarations[key]}” beyanı işaretlenmedi.`,
        question:
          "Bu başlıkla ilgili bilgiyi veya açıklamanızı paylaşabilir misiniz?",
      });
  }
  const summary = findings.length
    ? `Girilen bilgilerde açıklama gerektiren ${formatNumber(
        findings.length
      )} konu belirlendi. Aşağıdaki bulgular, insan incelemesinde netleştirilebilecek bilgileri ve dayanaklarını gösterir.`
    : "Bu sınırlı kontroller kapsamında girilen bilgilerde eksiklik veya tutarsızlık tespit edilmedi. Bu sonuç, vize uygunluğu veya başvurunun sonucu hakkında bir değerlendirme değildir.";
  return {
    application,
    nights,
    coveredNights,
    uncoveredNights,
    overlapNights,
    findings,
    summary,
  };
}

export function reportText(report: Review): string {
  const a = report.application;
  return [
    "VizeLens — Ön inceleme raporu",
    "Demo — kural tabanlı analiz",
    `Başvuru: ${a.reference || "Referans belirtilmedi"}`,
    `${a.destination} · ${a.purpose}`,
    `${formatDate(a.departure)} – ${formatDate(a.returnDate)}`,
    "",
    report.summary,
    `Seyahat süresi: ${formatNumber(report.nights)} gece`,
    `Konaklama kapsamı: ${formatNumber(report.coveredNights)} / ${formatNumber(
      report.nights
    )} gece`,
    `Açıklama gerektiren konu sayısı: ${formatNumber(report.findings.length)}`,
    ...report.findings.flatMap((f) => [
      "",
      `[${f.ruleId}] ${f.category}: ${f.title}`,
      f.explanation,
      `Dayanak: ${f.evidence}`,
      `İnceleme sorusu: ${f.question}`,
    ]),
    "",
    "Kullanılan bilgiler",
    `Bütçe: ${formatMoney(
      toAmount(a.budget),
      a.currency
    )} · Kullanıcı maliyet tahmini: ${formatMoney(
      toAmount(a.estimatedCost),
      a.currency
    )}`,
    `Konaklama kaydı: ${formatNumber(a.stays.length)} · İşaretlenen beyan: ${
      Object.values(a.declarations).filter(Boolean).length
    } / 4`,
    "Tarihler, konaklama aralıkları, bütçe ve beyan işaretleri kontrol edildi. Ülke yalnızca bağlamdır; serbest açıklama kurallarda değerlendirilmez.",
    ...(profileEntries(a.profile).length ? [
      "",
      "Ek başvuru bilgileri — başvuru sahibinin beyanı",
      "İnsan incelemesi içindir; otomatik değerlendirmede kullanılmaz ve OpenAI’a gönderilmez.",
      ...profileEntries(a.profile).map(([label, value]) => `${label}: ${value}`),
    ] : []),
    "",
    SCOPE_NOTE,
  ].join("\n");
}
