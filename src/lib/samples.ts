import { addDays, todayDate } from "./dates.ts";
import { emptyApplication, type Application } from "./validation.ts";

export const sampleLabels = {
  clarification: "Konaklama süresi uyuşmayan başvuru",
  consistent: "Bilgileri tutarlı başvuru",
  missing: "Eksik bilgi içeren başvuru",
  dateConflict: "Tarihleri düzeltilmesi gereken başvuru",
  purposeConflict: "Seyahat amacı ile açıklaması çelişen başvuru",
} as const;
export type SampleKey = keyof typeof sampleLabels;
export const sampleDescriptions: Record<SampleKey, string> = {
  clarification: "10 gecelik seyahat için 6 gece konaklama girilmiştir. Bütçe de netleştirme gerektirir.",
  consistent: "Seyahat tarihleri, konaklama kapsamı ve bütçesi birbiriyle uyumlu kurgusal örnek.",
  missing: "Kişisel bilgiler, açıklamalar, konaklama ve bazı beyanlar eksiktir. Devam etmek için zorunlu alanları tamamlayın.",
  dateConflict: "Dönüş tarihi gidişten öncedir. İlk adımda düzeltmeden ilerlenemez.",
  purposeConflict: "Turizm seçilmiştir; açıklama yalnızca iş toplantılarını anlatır. Bu metin çelişkisi isteğe bağlı yapay zekâ incelemesinde ele alınabilir; yerel kurallar serbest metni yorumlamaz.",
};
export function getSample(key: SampleKey, today = todayDate()): Application {
  const departure = addDays(today, 30);
  const returnDate = addDays(departure, 10);
  const base: Application = {
    ...emptyApplication(),
    reference: "ÖRNEK-001",
    notes: "Kurgusal başvurunun tarih, bütçe ve konaklama bilgilerini kontrol edin.",
    departure,
    returnDate,
    budget: "1800",
    estimatedCost: "2400",
    profile: {
      ...emptyApplication().profile,
      employmentSector: "Özel sektör",
      occupation: "Yazılım geliştirici",
      employmentStartYear: "2018",
      maritalStatus: "Bekar",
      age: "32",
      birthCountry: "Türkiye",
      education: "Lisans",
      visitedCountryCount: "4",
      travelRegions: ["Schengen Alanı", "Diğer ülkeler"],
      hasValidVisaOrResidence: "Evet",
      visaOrResidenceCountries: "Kanada (vize)",
      hasVisaRefusal: "Hayır",
      hasForeignLanguages: "Evet",
      foreignLanguages: "İngilizce, Almanca",
      hasRelativesAtDestination: "Hayır",
      hasAssets: "Evet",
      assets: ["Ev", "Araba"],
      fundingMethods: ["Nakit", "Kredi kartı"],
    },
    narratives: {
      travelPurpose:
        "Müzeleri ve şehir merkezini gezmek için turistik bir seyahat planlıyorum.",
      funding:
        "Seyahat giderlerini kendi birikimimden karşılamayı planlıyorum.",
      accommodation: "Tüm seyahat boyunca aynı otelde kalmayı planlıyorum.",
      fictionalExcerpts: "Kurgusal otel özeti: Konaklama süresi 6 gecedir.",
    },
    declarations: {
      identity: true,
      itinerary: true,
      budget: true,
      accommodation: true,
    },
    stays: [
      { type: "Otel", checkIn: departure, checkOut: addDays(departure, 6) },
    ],
  };
  if (key === "dateConflict") return {
    ...getSample("consistent", today), reference: "ÖRNEK-004", returnDate: addDays(departure, -2),
  };
  if (key === "purposeConflict") {
    const consistent = getSample("consistent", today);
    return {
      ...consistent, reference: "ÖRNEK-005", purpose: "Turizm",
      narratives: { ...consistent.narratives, travelPurpose: "Seyahatimin tek amacı iş toplantılarına katılmak. Turistik gezi planlamıyorum." },
    };
  }
  if (key === "consistent")
    return {
      ...base,
      reference: "ÖRNEK-002",
      destination: "Kanada",
      budget: "3200",
      currency: "USD",
      narratives: {
        ...base.narratives,
        fictionalExcerpts: "Kurgusal otel özeti: Konaklama süresi 10 gecedir.",
      },
      declarations: {
        identity: true,
        itinerary: true,
        budget: true,
        accommodation: true,
      },
      stays: [{ type: "Otel", checkIn: departure, checkOut: returnDate }],
    };
  if (key === "missing")
    return {
      ...base,
      reference: "ÖRNEK-003",
      profile: emptyApplication().profile,
      destination: "Türkiye",
      currency: "TRY",
      budget: "45000",
      estimatedCost: "40000",
      stays: [],
      narratives: {
        travelPurpose: "Turistik gezi planlıyorum.",
        funding: "",
        accommodation: "",
        fictionalExcerpts: "",
      },
      declarations: {
        identity: true,
        itinerary: false,
        budget: false,
        accommodation: false,
      },
    };
  return base;
}
