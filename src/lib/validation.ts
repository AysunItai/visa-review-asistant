import { z } from "zod";
import { dayNumber } from "./dates.ts";
import { narrativeSchema, emptyNarratives } from "./narratives.ts";

export const destinations = ["ABD", "Kanada", "Türkiye", "Almanya"] as const;
export const purposes = [
  "Turizm",
  "İş seyahati",
  "Aile/arkadaş ziyareti",
] as const;
export const currencies = ["EUR", "USD", "TRY"] as const;
export const stayTypes = ["Otel", "Aile/arkadaş yanında", "Diğer"] as const;
export const declarations = {
  identity: "Kimlik/pasaport bilgisi beyan edildi",
  itinerary: "Seyahat planı beyan edildi",
  budget: "Bütçe açıklaması beyan edildi",
  accommodation: "Konaklama açıklaması beyan edildi",
} as const;

const date = z
  .string()
  .refine(
    (value) => Number.isFinite(dayNumber(value)),
    "Geçerli bir tarih girin."
  );
const amount = z
  .string()
  .min(1, "Bir tutar girin.")
  .refine(
    (value) =>
      /^\d+(?:[.,]\d{1,2})?$/.test(value) &&
      Number.isFinite(Number(value.replace(",", "."))) &&
      Number(value.replace(",", ".")) <= 1_000_000_000_000,
    "0 veya daha büyük, en fazla iki ondalıklı geçerli bir tutar girin (en fazla 1 trilyon)."
  );
export const toAmount = (value: string) => Number(value.replace(",", "."));

export const applicationSchema = z
  .object({
    reference: z.string().max(80, "Referans en fazla 80 karakter olabilir."),
    destination: z.enum(destinations),
    purpose: z.enum(purposes),
    departure: date,
    returnDate: date,
    currency: z.enum(currencies),
    budget: amount,
    estimatedCost: amount,
    stays: z.array(
      z
        .object({ type: z.enum(stayTypes), checkIn: date, checkOut: date })
        .superRefine((stay, ctx) => {
          if (dayNumber(stay.checkOut) <= dayNumber(stay.checkIn))
            ctx.addIssue({
              code: "custom",
              path: ["checkOut"],
              message: "Çıkış tarihi giriş tarihinden sonra olmalı.",
            });
        })
    ),
    declarations: z.object({
      identity: z.boolean(),
      itinerary: z.boolean(),
      budget: z.boolean(),
      accommodation: z.boolean(),
    }),
    notes: z.string().max(2000, "Açıklama en fazla 2.000 karakter olabilir."),
    narratives: narrativeSchema,
  })
  .superRefine((data, ctx) => {
    if (dayNumber(data.returnDate) < dayNumber(data.departure))
      ctx.addIssue({
        code: "custom",
        path: ["returnDate"],
        message: "Dönüş tarihi gidiş tarihinden önce olamaz.",
      });
  });

export type Application = z.infer<typeof applicationSchema>;
export function emptyApplication(): Application {
  return {
    reference: "",
    destination: "Almanya",
    purpose: "Turizm",
    departure: "",
    returnDate: "",
    currency: "EUR",
    budget: "",
    estimatedCost: "",
    stays: [],
    declarations: {
      identity: false,
      itinerary: false,
      budget: false,
      accommodation: false,
    },
    notes: "",
    narratives: emptyNarratives(),
  };
}
