import { test } from "node:test";
import assert from "node:assert/strict";
import { dayNumber } from "../src/lib/dates.ts";
import { getSample } from "../src/lib/samples.ts";
import { reportText, reviewApplication } from "../src/lib/review.ts";
import { applicationSchema } from "../src/lib/validation.ts";

const full = () => getSample("consistent", "2026-02-01");
test("fully covered trip has ten nights and no findings", () => {
  const result = reviewApplication(full());
  assert.equal(result.nights, 10);
  assert.equal(result.coveredNights, 10);
  assert.equal(result.uncoveredNights, 0);
  assert.deepEqual(result.findings, []);
  assert.match(result.summary, /sınırlı kontroller/);
});
test("partially covered trip reports evidence and remaining nights", () => {
  const result = reviewApplication(getSample("clarification", "2026-02-01"));
  assert.equal(result.nights, 10);
  assert.equal(result.coveredNights, 6);
  assert.equal(result.uncoveredNights, 4);
  assert.match(
    result.findings.find((f) => f.ruleId === "accommodation.coverage")!
      .question,
    /Kalan 4 gece/
  );
});
test("overlapping stays are united without counting a night twice", () => {
  const application = full();
  application.departure = "2026-03-01";
  application.returnDate = "2026-03-11";
  application.stays = [
    { type: "Otel", checkIn: "2026-03-01", checkOut: "2026-03-07" },
    { type: "Otel", checkIn: "2026-03-05", checkOut: "2026-03-09" },
    { type: "Diğer", checkIn: "2026-03-06", checkOut: "2026-03-11" },
  ];
  const result = reviewApplication(application);
  assert.equal(result.coveredNights, 10);
  assert.equal(result.overlapNights, 4);
  assert.equal(result.uncoveredNights, 0);
  assert.ok(result.findings.some((f) => f.ruleId === "accommodation.overlap"));
});
test("adjacent checkout/checkin dates do not overlap", () => {
  const application = full();
  application.departure = "2026-03-01";
  application.returnDate = "2026-03-11";
  application.stays = [
    { type: "Otel", checkIn: "2026-03-01", checkOut: "2026-03-06" },
    { type: "Otel", checkIn: "2026-03-06", checkOut: "2026-03-11" },
  ];
  const result = reviewApplication(application);
  assert.equal(result.coveredNights, 10);
  assert.equal(result.overlapNights, 0);
});
test("partly and wholly outside stays are flagged and clipped to trip", () => {
  const application = full();
  application.departure = "2026-03-01";
  application.returnDate = "2026-03-11";
  application.stays = [
    { type: "Otel", checkIn: "2026-02-27", checkOut: "2026-03-03" },
    { type: "Diğer", checkIn: "2026-04-01", checkOut: "2026-04-04" },
  ];
  const result = reviewApplication(application);
  assert.equal(result.coveredNights, 2);
  assert.equal(result.uncoveredNights, 8);
  assert.match(
    result.findings.find((f) => f.ruleId === "accommodation.outside")!.evidence,
    /Nis/
  );
});
test("same-day trip has zero nights and does not require accommodation", () => {
  const application = full();
  application.returnDate = application.departure;
  application.stays = [];
  const result = reviewApplication(application);
  assert.equal(result.nights, 0);
  assert.equal(result.coveredNights, 0);
  assert.equal(result.uncoveredNights, 0);
  assert.deepEqual(result.findings, []);
});
test("budget compares exclusively against entered estimate", () => {
  const application = full();
  application.budget = "1000,10";
  application.estimatedCost = "1000,30";
  const result = reviewApplication(application);
  assert.match(
    result.findings.find((f) => f.ruleId === "budget.shortfall")!.evidence,
    /0,20/
  );
  application.budget = "1000.30";
  assert.equal(reviewApplication(application).findings.length, 0);
});
test("missing declarations have distinct stable IDs", () => {
  const application = full();
  application.declarations.identity = false;
  application.declarations.budget = false;
  assert.deepEqual(
    reviewApplication(application).findings.map((f) => f.ruleId),
    ["declaration.identity", "declaration.budget"]
  );
});
test("missing accommodation is a missing-information finding, not duplicate coverage", () => {
  const result = reviewApplication(getSample("missing", "2026-02-01"));
  assert.equal(result.findings.length, 4);
  assert.equal(result.findings[0].ruleId, "accommodation.missing");
  assert.equal(result.findings[0].category, "Eksik bilgi");
});
test("date-only arithmetic across spring and fall DST boundaries", () => {
  for (const [start, end] of [
    ["2026-03-27", "2026-03-31"],
    ["2026-10-23", "2026-10-27"],
  ]) {
    const application = full();
    application.departure = start;
    application.returnDate = end;
    application.stays = [{ type: "Otel", checkIn: start, checkOut: end }];
    const result = reviewApplication(application);
    assert.equal(result.nights, 4);
    assert.equal(result.coveredNights, 4);
  }
  assert.equal(dayNumber("2024-03-01") - dayNumber("2024-02-28"), 2);
  assert.ok(Number.isNaN(dayNumber("2026-02-30")));
});
test("validation rejects missing/reversed dates, invalid amounts, and invalid stays", () => {
  const application = full();
  for (const budget of [
    "",
    "-1",
    "NaN",
    "Infinity",
    "1.2.3",
    "1e3",
    "  ",
    "1,234",
    "1000000000001",
  ])
    assert.equal(
      applicationSchema.safeParse({ ...application, budget }).success,
      false,
      budget
    );
  assert.equal(
    applicationSchema.safeParse({ ...application, departure: "" }).success,
    false
  );
  assert.equal(
    applicationSchema.safeParse({ ...application, returnDate: "2025-01-01" })
      .success,
    false
  );
  for (const checkOut of [application.departure, "2025-01-01", ""])
    assert.equal(
      applicationSchema.safeParse({
        ...application,
        stays: [{ type: "Otel", checkIn: application.departure, checkOut }],
      }).success,
      false
    );
  assert.equal(
    applicationSchema.safeParse({ ...application, notes: "a".repeat(2001) })
      .success,
    false
  );
  assert.throws(() => reviewApplication({ ...application, budget: "-1" }));
});
test("engine is deterministic, does not mutate input, and ignores free-text notes", () => {
  const application = full();
  const before = structuredClone(application);
  const first = reviewApplication(application);
  const second = reviewApplication(application);
  assert.deepEqual(first, second);
  assert.deepEqual(application, before);
  application.notes = "Serbest metin denemesi";
  assert.equal(reviewApplication(application).summary, first.summary);
  assert.ok(
    !reportText(reviewApplication(application)).includes(application.notes)
  );
});
test("all fictional samples stay valid relative to today's date", () => {
  for (const key of ["clarification", "consistent", "missing"] as const) {
    const application = getSample(key);
    assert.equal(applicationSchema.safeParse(application).success, true);
    assert.equal(reviewApplication(application).nights, 10);
  }
});
