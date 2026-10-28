import { z } from "zod";

export const employmentSectors = ["Kamu", "Özel sektör", "Bağımsız"] as const;
export const maritalStatuses = ["Evli", "Bekar"] as const;
export const educationLevels = ["İlkokul", "Ortaokul", "Lise", "Ön lisans", "Lisans", "Lisansüstü"] as const;
export const travelRegions = ["Schengen Alanı", "ABD", "Diğer ülkeler"] as const;
export const assetTypes = ["Ev", "Araba", "Tarla", "Arsa"] as const;
export const fundingMethods = ["Kredi", "Kredi kartı", "Nakit"] as const;
const answer = z.enum(["", "Evet", "Hayır"]);
const shortText = z.string().trim().max(200, "En fazla 200 karakter girin.");
const countryList = z.string().trim().max(500, "En fazla 500 karakter girin.");
const wholeNumber = (max: number, message: string) => z.string().refine(
  (value) => value === "" || (/^\d+$/.test(value) && Number(value) <= max), message
);

const profileObject = z.object({
  employmentSector: z.enum(["", ...employmentSectors]),
  occupation: shortText,
  maritalStatus: z.enum(["", ...maritalStatuses]),
  employmentStartYear: z.string().refine(
    (value) => value === "" || (/^\d{4}$/.test(value) && Number(value) >= 1900 && Number(value) <= new Date().getFullYear()),
    "1900 ile içinde bulunduğumuz yıl arasında bir yıl girin."
  ),
  age: wholeNumber(120, "0 ile 120 arasında bir tam yaş girin."),
  birthCountry: shortText,
  education: z.enum(["", ...educationLevels]),
  visitedCountryCount: wholeNumber(250, "0 ile 250 arasında bir tam ülke sayısı girin."),
  travelRegions: z.array(z.enum(travelRegions)).max(travelRegions.length),
  hasValidVisaOrResidence: answer,
  visaOrResidenceCountries: countryList,
  hasVisaRefusal: answer,
  visaRefusalCountries: countryList,
  refusalExplanation: z.string().trim().max(1000, "En fazla 1.000 karakter girin."),
  hasForeignLanguages: answer,
  foreignLanguages: shortText,
  hasRelativesAtDestination: answer,
  relativeRelationship: shortText,
  relativesDetails: z.string().trim().max(1000, "En fazla 1.000 karakter girin."),
  hasAssets: answer,
  assets: z.array(z.enum(assetTypes)).max(assetTypes.length),
  fundingMethods: z.array(z.enum(fundingMethods)).max(fundingMethods.length),
});

// Normalize a copy before validation. Raw answers remain in React Hook Form so
// temporarily hiding a question never loses the user's entry.
export function activeProfile(profile: ApplicantProfile): ApplicantProfile {
  return {
    ...profile,
    visaOrResidenceCountries: profile.hasValidVisaOrResidence === "Evet" ? profile.visaOrResidenceCountries : "",
    visaRefusalCountries: profile.hasVisaRefusal === "Evet" ? profile.visaRefusalCountries : "",
    refusalExplanation: profile.hasVisaRefusal === "Evet" ? profile.refusalExplanation : "",
    foreignLanguages: profile.hasForeignLanguages === "Evet" ? profile.foreignLanguages : "",
    relativeRelationship: profile.hasRelativesAtDestination === "Evet" ? profile.relativeRelationship : "",
    relativesDetails: profile.hasRelativesAtDestination === "Evet" ? profile.relativesDetails : "",
    assets: profile.hasAssets === "Evet" ? profile.assets : [],
  };
}
function normalizeProfile(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return input;
  return activeProfile(input as ApplicantProfile);
}
const financialKeys = { hasAssets: true, assets: true, fundingMethods: true } as const;
const personalObject = profileObject.omit(financialKeys).superRefine((profile, ctx) => {
  for (const [status, detail, message] of [
    ["hasValidVisaOrResidence", "visaOrResidenceCountries", "Geçerli vize veya oturumunuzun bulunduğu ülkeleri belirtin."],
    ["hasVisaRefusal", "visaRefusalCountries", "Vize reddi aldığınız ülkeleri belirtin."],
    ["hasForeignLanguages", "foreignLanguages", "Bildiğiniz yabancı dilleri belirtin."],
    ["hasRelativesAtDestination", "relativeRelationship", "Akrabalık ilişkinizi belirtin."],
  ] as const) {
    if (profile[status] === "Evet" && !profile[detail])
      ctx.addIssue({ code: "custom", path: [detail], message });
  }
  if (profile.visitedCountryCount !== "" && Number(profile.visitedCountryCount) === 0 && profile.travelRegions.length)
    ctx.addIssue({ code: "custom", path: ["travelRegions"], message: "Ülke sayısı 0 ise seyahat bölgesi seçmeyin." });
});
const financialObject = profileObject.pick(financialKeys).superRefine((profile, ctx) => {
  if (profile.hasAssets === "Evet" && !profile.assets.length)
    ctx.addIssue({ code: "custom", path: ["assets"], message: "En az bir varlık türü seçin." });
});
export const personalProfileSchema = z.preprocess(normalizeProfile, personalObject);
export const financialProfileSchema = z.preprocess(normalizeProfile, financialObject);
export const profileSchema = z.preprocess(normalizeProfile, z.intersection(personalObject, financialObject));
export type ApplicantProfile = z.infer<typeof profileObject>;
export function emptyProfile(): ApplicantProfile {
  return {
    employmentSector: "", occupation: "", maritalStatus: "", employmentStartYear: "",
    age: "", birthCountry: "", education: "", visitedCountryCount: "", travelRegions: [],
    hasValidVisaOrResidence: "", visaOrResidenceCountries: "", hasVisaRefusal: "",
    visaRefusalCountries: "", refusalExplanation: "", hasForeignLanguages: "", foreignLanguages: "",
    hasRelativesAtDestination: "", relativeRelationship: "", relativesDetails: "",
    hasAssets: "", assets: [], fundingMethods: [],
  };
}

export const profileLabels: Record<keyof ApplicantProfile, string> = {
  employmentSector: "Çalıştığınız sektör", occupation: "Mesleğiniz", maritalStatus: "Medeni durumunuz",
  employmentStartYear: "Çalışmaya başladığınız yıl", age: "Yaşınız", birthCountry: "Doğduğunuz ülke",
  education: "Eğitim durumunuz", visitedCountryCount: "Seyahat ettiğiniz ülke sayısı",
  travelRegions: "Seyahat ettiğiniz bölgeler",
  hasValidVisaOrResidence: "Geçerli yabancı ülke vizeniz veya oturum izniniz var mı?",
  visaOrResidenceCountries: "Geçerli vize veya oturum izninizin bulunduğu ülkeler",
  hasVisaRefusal: "Daha önce vize reddi aldınız mı?", visaRefusalCountries: "Vize reddi aldığınız ülkeler",
  refusalExplanation: "Vize reddi açıklaması",
  relativeRelationship: "Akrabalık ilişkiniz",
  relativesDetails: "Akrabanızla ilgili ek açıklama",
  hasForeignLanguages: "Bildiğiniz yabancı dil var mı?", foreignLanguages: "Bildiğiniz yabancı diller",
  hasRelativesAtDestination: "Gideceğiniz ülkede akrabanız var mı?",
  hasAssets: "Taşınır veya taşınmaz varlığınız var mı?", assets: "Varlık türleri",
  fundingMethods: "Seyahat masraflarını nasıl karşılayacaksınız?",
};

export function profileEntries(profile: ApplicantProfile): [string, string][] {
  const active = activeProfile(profile);
  return (Object.keys(profileLabels) as (keyof ApplicantProfile)[]).flatMap((key) => {
    const value = active[key];
    const text = Array.isArray(value) ? value.join(", ") : value;
    return text ? [[profileLabels[key], text] as [string, string]] : [];
  });
}
