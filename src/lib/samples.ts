import { addDays, todayDate } from "./dates.ts";
import { emptyApplication, type Application } from "./validation.ts";

export const sampleLabels = {
  clarification: "Açıklama gereken başvuru",
  consistent: "Bilgileri tutarlı başvuru",
  missing: "Eksik bilgi içeren başvuru",
} as const;
export type SampleKey = keyof typeof sampleLabels;
export function getSample(key: SampleKey, today = todayDate()): Application {
  const departure = addDays(today, 30);
  const returnDate = addDays(departure, 10);
  const base: Application = {
    ...emptyApplication(),
    reference: "ÖRNEK-001",
    departure,
    returnDate,
    budget: "1800",
    estimatedCost: "2400",
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
      budget: false,
      accommodation: true,
    },
    stays: [
      { type: "Otel", checkIn: departure, checkOut: addDays(departure, 6) },
    ],
  };
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
