import { z } from "zod";
import { applicationSchema, type Application } from "./validation.ts";
import { personalProfileSchema, financialProfileSchema } from "./applicant-profile.ts";
import { narrativeSchema } from "./narratives.ts";
import { dayNumber } from "./dates.ts";

export const applicationSteps = [
  "Başvuru ve seyahat",
  "Kişisel bilgiler ve seyahat geçmişi",
  "Finansman, konaklama ve belgeler",
  "Açıklamalar ve inceleme",
] as const;
const shape = applicationSchema.shape;
const stepSchemas = [
  z.object({
    reference: shape.reference, destination: shape.destination, purpose: shape.purpose,
    departure: shape.departure, returnDate: shape.returnDate,
    narratives: narrativeSchema.pick({ travelPurpose: true }).strip(),
  }).superRefine((data, ctx) => {
    if (dayNumber(data.returnDate) < dayNumber(data.departure))
      ctx.addIssue({ code: "custom", path: ["returnDate"], message: "Dönüş tarihi gidiş tarihinden önce olamaz." });
  }),
  z.object({ profile: personalProfileSchema }),
  z.object({
    currency: shape.currency, budget: shape.budget, estimatedCost: shape.estimatedCost,
    profile: financialProfileSchema, stays: shape.stays, declarations: shape.declarations,
    narratives: narrativeSchema.pick({ funding: true, accommodation: true }).strip(),
  }),
  z.object({ notes: shape.notes, narratives: narrativeSchema.pick({ fictionalExcerpts: true }).strip() }),
] as const;

export function validateStep(data: Application, step: number) {
  return stepSchemas[step].safeParse(data);
}

export function stepForField(path: string): number {
  if (/^profile\.(hasAssets|assets|fundingMethods)(\.|$)/.test(path)) return 2;
  if (path.startsWith("profile")) return 1;
  if (path === "notes" || path === "narratives.fictionalExcerpts") return 3;
  if (/^(currency|budget|estimatedCost|stays|declarations)(\.|$)/.test(path) ||
      path === "narratives.funding" || path === "narratives.accommodation") return 2;
  return 0;
}
