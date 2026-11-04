"use client";

import { useWatch, type UseFormReturn } from "react-hook-form";
import { ChevronDown } from "lucide-react";
import { FormField } from "@/components/form-field";
import { Input } from "@/components/ui/input";
import type { Application } from "@/lib/validation";
import {
  assetTypes, educationLevels, employmentSectors, fundingMethods, maritalStatuses,
  profileLabels, travelRegions, type ApplicantProfile,
} from "@/lib/applicant-profile";

export function ApplicantProfileFields({ form, group }: {
  form: UseFormReturn<Application>;
  group: "personal" | "travel" | "financial";
}) {
  const profile = useWatch({ control: form.control, name: "profile" });
  const error = (key: keyof ApplicantProfile) => form.getFieldState(`profile.${key}`, form.formState).error?.message;
  const accessible = (key: keyof ApplicantProfile, hint?: string) => ({
    id: `profile.${key}`,
    "aria-invalid": Boolean(error(key)),
    "aria-describedby": [hint && `profile.${key}-hint`, error(key) && `profile.${key}-error`].filter(Boolean).join(" ") || undefined,
  });
  function select(key: keyof ApplicantProfile, options: readonly string[]) {
    return (
      <FormField key={key} id={`profile.${key}`} label={profileLabels[key]} error={error(key)}>
        <div className="select-wrap">
          <select required {...form.register(`profile.${key}`)} {...accessible(key)} className="field-control">
            <option value="">Seçin</option>
            {options.map((option) => <option key={option}>{option}</option>)}
          </select>
          <ChevronDown />
        </div>
      </FormField>
    );
  }
  function input(key: keyof ApplicantProfile, options: { numeric?: boolean; max?: number; hint?: string } = {}) {
    return (
      <FormField key={key} id={`profile.${key}`} label={profileLabels[key]} error={error(key)} hint={options.hint}>
        {options.max === 1000 ? <textarea {...form.register(`profile.${key}`)} {...accessible(key, options.hint)}
          required rows={3} maxLength={1000} className="field-control min-h-24 resize-y" /> : <Input {...form.register(`profile.${key}`)} {...accessible(key, options.hint)}
          inputMode={options.numeric ? "numeric" : "text"} maxLength={options.max ?? 200}
          autoComplete="off" required />}
      </FormField>
    );
  }
  function choices(key: "travelRegions" | "assets" | "fundingMethods", options: readonly string[]) {
    return (
      <fieldset className="min-w-0 space-y-2" aria-describedby={error(key) ? `profile.${key}-error` : undefined}>
        <legend className="text-sm font-semibold">{profileLabels[key]} <span className="font-normal text-muted-foreground">Zorunlu</span></legend>
        <p className="text-sm text-muted-foreground">En az bir seçenek işaretleyin. Birden fazla seçenek seçebilirsiniz.</p>
        <div className="form-grid">
          {options.map((option) => (
            <label key={option} className="choice-label flex cursor-pointer items-center gap-3 rounded-md py-2 text-sm">
              <input type="checkbox" value={option} {...form.register(`profile.${key}`)}
                aria-invalid={Boolean(error(key))} aria-describedby={error(key) ? `profile.${key}-error` : undefined}
                className="size-5 shrink-0 accent-accent" />
              {option}
            </label>
          ))}
        </div>
        {error(key) && <p id={`profile.${key}-error`} role="alert" className="text-sm text-red-700">{error(key)}</p>}
      </fieldset>
    );
  }
  if (group === "personal") return (
    <>
      <p className="text-sm leading-6 text-muted-foreground">
        Bu bilgiler zorunludur ve insan incelemesi için rapora eklenir; OpenAI’a gönderilmez.
      </p>
      <div className="form-grid">
        {select("employmentSector", employmentSectors)}
        {input("occupation")}
        {input("employmentStartYear", { numeric: true, max: 4, hint: "Örn. 2018." })}
        {select("maritalStatus", maritalStatuses)}
        {input("age", { numeric: true, max: 3 })}
        {input("birthCountry")}
        {select("education", educationLevels)}
      </div>
    </>
  );
  if (group === "travel") return (
    <>
      {input("visitedCountryCount", { numeric: true, max: 3, hint: "Her ülkeyi bir kez sayın. Yurt dışına çıkmadıysanız 0 girin." })}
      {Number(profile.visitedCountryCount) > 0 && choices("travelRegions", travelRegions)}
      {select("hasValidVisaOrResidence", ["Evet", "Hayır"])}
      {profile.hasValidVisaOrResidence === "Evet" && input("visaOrResidenceCountries", { max: 500, hint: "Ülkeleri virgülle ayırın. Vize veya oturum izni olduğunu belirtebilirsiniz." })}
      {select("hasVisaRefusal", ["Evet", "Hayır"])}
      {profile.hasVisaRefusal === "Evet" && input("visaRefusalCountries", { max: 500, hint: "Ülkeleri virgülle ayırın." })}
      {profile.hasVisaRefusal === "Evet" && input("refusalExplanation", { max: 1000, hint: "Ret gerekçesini veya açıklamanızı yazın. Bu bilgi yalnızca yerel rapora eklenir." })}
      {select("hasForeignLanguages", ["Evet", "Hayır"])}
      {profile.hasForeignLanguages === "Evet" && input("foreignLanguages", { hint: "Örn. İngilizce, Almanca." })}
      {select("hasRelativesAtDestination", ["Evet", "Hayır"])}
      {profile.hasRelativesAtDestination === "Evet" && input("relativeRelationship", { hint: "Örn. kardeş, kuzen. Kişi adı yazmayın." })}
      {profile.hasRelativesAtDestination === "Evet" && input("relativesDetails", { max: 1000, hint: "Ziyaret planıyla ilgili ek bilgi yazın; adres veya iletişim bilgisi eklemeyin." })}
    </>
  );
  return (
    <>
      {select("hasAssets", ["Evet", "Hayır"])}
      {profile.hasAssets === "Evet" && choices("assets", assetTypes)}
      {choices("fundingMethods", fundingMethods)}
      <p className="text-sm leading-6 text-muted-foreground">Varlık ve ödeme yöntemi bilgileri insan incelemesi için rapora eklenir.</p>
    </>
  );
}
