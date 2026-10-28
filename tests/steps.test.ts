import { test } from "node:test";
import assert from "node:assert/strict";
import { emptyApplication, applicationSchema } from "../src/lib/validation.ts";
import { validateStep, stepForField } from "../src/lib/application-steps.ts";
import { getSample } from "../src/lib/samples.ts";
import { profileSchema } from "../src/lib/applicant-profile.ts";
import { toAIRequest } from "../src/lib/ai-contract.ts";
import { reportText, reviewApplication } from "../src/lib/review.ts";

test("step validation only checks the active step and does not mutate raw answers", () => {
  const data = emptyApplication();
  Object.assign(data, { departure: "2026-11-10", returnDate: "2026-11-12" });
  data.profile.age = "invalid";
  data.notes = "a".repeat(2001);
  const snapshot = structuredClone(data);
  assert.ok(validateStep(data, 0).success);
  assert.equal(validateStep(data, 1).success, false);
  assert.equal(validateStep(data, 2).success, false);
  assert.equal(validateStep(data, 3).success, false);
  assert.deepEqual(data, snapshot);
  data.returnDate = "2026-11-09";
  assert.equal(validateStep(data, 0).success, false);
  assert.equal(applicationSchema.safeParse(data).success, false);
});

test("inactive malformed and oversized details are excluded before validation and export", () => {
  const data = getSample("consistent");
  Object.assign(data.profile, {
    hasValidVisaOrResidence: "", visaOrResidenceCountries: "a".repeat(501),
    hasVisaRefusal: "Hayır", visaRefusalCountries: "a".repeat(501), refusalExplanation: "a".repeat(1001),
    hasForeignLanguages: "Hayır", foreignLanguages: "a".repeat(201),
    hasRelativesAtDestination: "", relativeRelationship: "a".repeat(201), relativesDetails: "a".repeat(1001),
    hasAssets: "Hayır", assets: ["invalid"],
  });
  const original = structuredClone(data);
  const result = applicationSchema.parse(data);
  assert.equal(result.profile.visaOrResidenceCountries, "");
  assert.equal(result.profile.refusalExplanation, "");
  assert.equal(result.profile.relativesDetails, "");
  assert.deepEqual(result.profile.assets, []);
  assert.ok(validateStep(data, 1).success);
  assert.ok(validateStep(data, 2).success);
  assert.deepEqual(data, original);
  assert.ok(!reportText(reviewApplication(data)).includes("a".repeat(201)));
  assert.deepEqual(toAIRequest(data), toAIRequest(result));
  data.profile.hasVisaRefusal = "Evet";
  assert.equal(profileSchema.safeParse(data.profile).success, false);
});

test("blocking conditional/year errors map to their step, while examples keep clarification findings", () => {
  const data = getSample("consistent");
  for (const status of ["hasVisaRefusal", "hasValidVisaOrResidence"] as const) {
    const profile = { ...data.profile, [status]: "Evet", visaRefusalCountries: "", visaOrResidenceCountries: "" };
    assert.equal(validateStep({ ...data, profile }, 1).success, false);
  }
  for (const sector of ["Kamu", "Özel sektör", "Bağımsız"] as const) {
    const profile = { ...data.profile, employmentSector: sector, employmentStartYear: String(new Date().getFullYear() + 1) };
    assert.equal(validateStep({ ...data, profile }, 1).success, false);
  }
  assert.equal(stepForField("returnDate"), 0);
  assert.equal(stepForField("profile.refusalExplanation"), 1);
  assert.equal(stepForField("profile.assets.0"), 2);
  assert.equal(stepForField("narratives.funding"), 2);
  assert.equal(stepForField("narratives.fictionalExcerpts"), 3);
  assert.equal(applicationSchema.safeParse(getSample("dateConflict")).success, false);
  assert.throws(() => reviewApplication(getSample("dateConflict")));
  assert.ok(reviewApplication(getSample("clarification")).findings.some((f) => f.ruleId === "accommodation.coverage"));
  const conflict = getSample("purposeConflict");
  assert.equal(conflict.purpose, "Turizm");
  assert.match(conflict.narratives.travelPurpose, /iş toplantılarına/);
  assert.ok(applicationSchema.safeParse(conflict).success);
  assert.deepEqual(Object.keys(toAIRequest(conflict)).sort(), ["anonymized", "context", "narratives"]);
  Object.assign(conflict.narratives, { hiddenProfile: "local-only" });
  Object.assign(conflict.declarations, { hiddenProfile: "local-only" });
  assert.ok(!JSON.stringify(toAIRequest(conflict)).includes("local-only"));
});
