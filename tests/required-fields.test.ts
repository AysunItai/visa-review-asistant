import { test } from "node:test";
import assert from "node:assert/strict";
import { applicationSchema, type Application } from "../src/lib/validation.ts";
import { validateStep, stepForField } from "../src/lib/application-steps.ts";
import { getSample } from "../src/lib/samples.ts";

function completeApplication() {
  const application = getSample("consistent");
  Object.assign(application.profile, {
    hasVisaRefusal: "Evet", visaRefusalCountries: "Fransa", refusalExplanation: "Kurgusal ret açıklaması.",
    hasRelativesAtDestination: "Evet", relativeRelationship: "Kuzen", relativesDetails: "Bir günlük ziyaret.",
  });
  return application;
}

test("each required field blocks its step and final submission when cleared", () => {
  const complete = completeApplication();
  assert.ok(applicationSchema.safeParse(complete).success);
  for (let step = 0; step < 4; step++) assert.ok(validateStep(complete, step).success);

  const cases: [string, (application: Application) => void][] = [];
  for (const key of ["reference", "departure", "returnDate", "budget", "estimatedCost", "notes"] as const)
    cases.push([key, (application) => { application[key] = ""; }]);
  for (const key of Object.keys(complete.narratives) as (keyof Application["narratives"])[])
    cases.push([`narratives.${key}`, (application) => { application.narratives[key] = " \n "; }]);
  for (const key of Object.keys(complete.profile) as (keyof Application["profile"])[])
    cases.push([`profile.${key}`, (application) => { Object.assign(application.profile, { [key]: Array.isArray(application.profile[key]) ? [] : "" }); }]);
  for (const key of Object.keys(complete.declarations) as (keyof Application["declarations"])[])
    cases.push([`declarations.${key}`, (application) => { application.declarations[key] = false; }]);
  cases.push(["stays", (application) => { application.stays = []; }]);
  for (const key of ["checkIn", "checkOut"] as const)
    cases.push([`stays.0.${key}`, (application) => { application.stays[0][key] = ""; }]);

  for (const [path, clear] of cases) {
    const application = structuredClone(complete);
    clear(application);
    for (const result of [applicationSchema.safeParse(application), validateStep(application, stepForField(path))]) {
      assert.equal(result.success, false, path);
      if (!result.success) assert.ok(result.error.issues.some((issue) => issue.path.join(".") === path), path);
    }
  }
});

test("whitespace-only required text fails and inactive answers stay optional", () => {
  const application = completeApplication();
  for (const key of ["reference", "notes"] as const)
    assert.equal(applicationSchema.safeParse({ ...application, [key]: " \n " }).success, false);
  for (const key of ["occupation", "birthCountry", "visaOrResidenceCountries", "visaRefusalCountries", "refusalExplanation", "foreignLanguages", "relativeRelationship", "relativesDetails"] as const)
    assert.equal(applicationSchema.safeParse({ ...application, profile: { ...application.profile, [key]: " \n " } }).success, false, key);

  Object.assign(application.profile, {
    visitedCountryCount: "0", hasValidVisaOrResidence: "Hayır", hasVisaRefusal: "Hayır",
    hasForeignLanguages: "Hayır", hasRelativesAtDestination: "Hayır", hasAssets: "Hayır",
  });
  application.returnDate = application.departure;
  application.stays = [];
  const parsed = applicationSchema.parse(application);
  assert.deepEqual(parsed.profile.travelRegions, []);
  assert.deepEqual(parsed.profile.assets, []);
  for (const key of ["visaOrResidenceCountries", "visaRefusalCountries", "refusalExplanation", "foreignLanguages", "relativeRelationship", "relativesDetails"] as const)
    assert.equal(parsed.profile[key], "", key);
  for (let step = 0; step < 4; step++) assert.ok(validateStep(application, step).success);
});
