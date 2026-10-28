import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyProfile, profileSchema } from "../src/lib/applicant-profile.ts";
import { applicationSchema } from "../src/lib/validation.ts";
import { getSample } from "../src/lib/samples.ts";
import { reviewApplication, reportText } from "../src/lib/review.ts";
import { aiRequestSchema, toAIRequest } from "../src/lib/ai-contract.ts";

test("profile is optional to fill, but supplied numbers and selections must be valid", () => {
  const profile = emptyProfile();
  assert.ok(profileSchema.safeParse(profile).success);
  for (const [key, values] of [
    ["age", ["-1", "1.5", "121", "abc"]],
    ["visitedCountryCount", ["-1", "1.5", "251", "abc"]],
    ["employmentStartYear", ["1899", "20", String(new Date().getFullYear() + 1)]] ,
    ["employmentSector", ["invalid"]],
    ["occupation", ["a".repeat(201)]],
  ] as const) {
    for (const value of values)
      assert.equal(profileSchema.safeParse({ ...profile, [key]: value }).success, false, `${key}: ${value}`);
  }
  assert.ok(profileSchema.safeParse({ ...profile, age: "0", visitedCountryCount: "0", employmentStartYear: String(new Date().getFullYear()) }).success);
  assert.equal(profileSchema.safeParse({ ...profile, visitedCountryCount: "0", travelRegions: ["ABD"] }).success, false);
});

test("yes answers require details and hidden answers cannot enter the report", () => {
  for (const key of ["hasValidVisaOrResidence", "hasVisaRefusal", "hasForeignLanguages", "hasAssets"] as const) {
    assert.equal(profileSchema.safeParse({ ...emptyProfile(), [key]: "Evet" }).success, false, key);
  }
  const application = getSample("consistent");
  application.profile.hasValidVisaOrResidence = "Hayır";
  application.profile.hasVisaRefusal = "Hayır";
  application.profile.visaRefusalCountries = "Japonya";
  application.profile.hasForeignLanguages = "";
  application.profile.hasAssets = "Hayır";
  const parsed = applicationSchema.parse(application);
  assert.equal(parsed.profile.visaOrResidenceCountries, "");
  assert.equal(parsed.profile.visaRefusalCountries, "");
  assert.equal(parsed.profile.foreignLanguages, "");
  assert.deepEqual(parsed.profile.assets, []);
  assert.ok(!reportText(reviewApplication(parsed)).includes("Japonya"));
});

test("profile survives review and copy without affecting findings or AI requests", () => {
  const sample = getSample("consistent");
  const baseline = { ...sample, profile: emptyProfile() };
  const report = reviewApplication(sample);
  assert.deepEqual(report.application.profile, sample.profile);
  assert.deepEqual(report.findings, reviewApplication(baseline).findings);
  assert.match(reportText(report), /Mesleğiniz: Yazılım geliştirici/);
  assert.match(reportText(report), /Varlık türleri: Ev, Araba/);
  assert.deepEqual(toAIRequest(sample), toAIRequest(baseline));
  assert.ok(aiRequestSchema.safeParse(toAIRequest(sample)).success);
  assert.equal(aiRequestSchema.safeParse({ ...toAIRequest(sample), profile: sample.profile }).success, false);
});
