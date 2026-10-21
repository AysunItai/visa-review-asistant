import { z } from "zod";

export const narrativeFields = {
  travelPurpose: { label: "Seyahat amacı açıklaması", limit: 2000 },
  funding: { label: "Finansman açıklaması", limit: 2000 },
  accommodation: { label: "Konaklama açıklaması", limit: 2000 },
  fictionalExcerpts: { label: "Kurgusal belge alıntıları", limit: 3000 },
} as const;
export const narrativeSchema = z.strictObject({
  travelPurpose: z.string().max(2000, "En fazla 2.000 karakter girin."),
  funding: z.string().max(2000, "En fazla 2.000 karakter girin."),
  accommodation: z.string().max(2000, "En fazla 2.000 karakter girin."),
  fictionalExcerpts: z.string().max(3000, "En fazla 3.000 karakter girin."),
});
export const emptyNarratives = () => ({
  travelPurpose: "",
  funding: "",
  accommodation: "",
  fictionalExcerpts: "",
});
export interface AnalysisOptions {
  useAI: boolean;
  anonymized: boolean;
}

/** Conservative backstop, not a complete personal-information detector. */
export function hasIdentifierLikeText(text: string): boolean {
  return /[\w.+-]+@[\w.-]+\.[a-z]{2,}|\b(?:[A-Z]{1,2}\d{6,9}|\d{9,})\b|(?:\+\d[\d ()-]{8,}\d)|(?:ad\s*soyad|full\s*name|passport\s*(?:no|number)|pasaport\s*(?:no|numarası))\s*[:=]\s*\S/iu.test(
    text
  );
}
