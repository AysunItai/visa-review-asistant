import { test } from "node:test";
import assert from "node:assert/strict";
import { getSample } from "../src/lib/samples.ts";
import { createCase, demoReducer, initialDemoState, caseAIRequest, applicantReceipt, decisionSchema, type DemoState } from "../src/lib/demo-cases.ts";
import { submittedSections, caseReportText } from "../src/lib/case-report.ts";
import { evidenceSources } from "../src/lib/ai-contract.ts";
import { assessmentFixture } from "./fixtures/assessment.ts";

const at = "2026-11-11T12:00:00.000Z";
const makeCase = (id = "case-a", draftId = "draft-a") => createCase(getSample("consistent"), true, { id, draftId, submittedAt: at });
const submitted = (): DemoState => demoReducer(initialDemoState, { type: "submit", entry: makeCase() });

test("submission validates and freezes a detached complete applicable snapshot", () => {
  const raw = getSample("consistent");
  Object.assign(raw.profile, { hasVisaRefusal: "Evet", visaRefusalCountries: "Fransa", refusalExplanation: "Kurgusal açıklama", hasRelativesAtDestination: "Evet", relativeRelationship: "Kuzen", relativesDetails: "Kısa ziyaret" });
  const entry = createCase(raw, true, { id: "a", draftId: "draft", submittedAt: at });
  assert.equal(entry.application.profile.refusalExplanation, raw.profile.refusalExplanation);
  assert.equal(entry.application.profile.relativesDetails, raw.profile.relativesDetails);
  assert.equal(entry.application.narratives.funding, raw.narratives.funding);
  assert.deepEqual(entry.application.stays, raw.stays);
  assert.deepEqual(entry.application.declarations, raw.declarations);
  assert.equal(entry.application.notes, "");
  assert.equal(entry.application.narratives.fictionalExcerpts, "");
  const original = JSON.stringify(entry.application);
  raw.profile.occupation = "Changed"; raw.stays[0].type = "Diğer";
  assert.equal(JSON.stringify(entry.application), original);
  assert.throws(() => { entry.application.profile.occupation = "Mutation"; }, TypeError);
  assert.throws(() => { entry.application.stays.push(entry.application.stays[0]); }, TypeError);
  assert.throws(() => createCase(raw, false, { id: "b", draftId: "d", submittedAt: at }));
  raw.profile.occupation = "";
  assert.throws(() => createCase(raw, true, { id: "b", draftId: "d", submittedAt: at }));
});

test("role switching preserves cases, notes, AI state and decisions in the session", () => {
  let state = submitted();
  state = demoReducer(state, { type: "note", id: "case-a", note: "Private reviewer note" });
  state = demoReducer(state, { type: "decision", id: "case-a", input: { action: "approve", reason: "" }, at });
  const cases = state.cases;
  for (const role of ["applicant", "admin", null, "applicant"] as const) {
    state = demoReducer(state, { type: "role", role });
    assert.equal(state.cases, cases);
  }
  assert.deepEqual(Object.keys(applicantReceipt(state.cases[0])).sort(), ["id", "reference", "destination", "submittedAt", "status", "decisionAt"].sort());
  assert.equal(JSON.stringify(applicantReceipt(state.cases[0])).includes("Private"), false);
});

test("duplicate submit actions are idempotent per draft, matching references remain distinct", () => {
  let state = submitted();
  state = demoReducer(state, { type: "submit", entry: makeCase() });
  state = demoReducer(state, { type: "submit", entry: makeCase("new-id", "draft-a") });
  assert.equal(state.cases.length, 1);
  state = demoReducer(state, { type: "submit", entry: makeCase("case-b", "draft-b") });
  assert.equal(state.cases.length, 2);
  assert.equal(state.cases[0].reference, state.cases[1].reference);
  assert.notEqual(state.cases[0].id, state.cases[1].id);
});

test("inactive fields never enter the snapshot, admin answers, export or AI payload", () => {
  const raw = getSample("consistent");
  Object.assign(raw.profile, { visitedCountryCount: "0", hasAssets: "Hayır", hasVisaRefusal: "Hayır", refusalExplanation: "HIDDEN", visaRefusalCountries: "HIDDEN", hasRelativesAtDestination: "Hayır", relativeRelationship: "HIDDEN", relativesDetails: "HIDDEN" });
  const entry = createCase(raw, true, { id: "a", draftId: "d", submittedAt: at });
  for (const key of ["travelRegions", "assets", "refusalExplanation", "visaRefusalCountries", "relativeRelationship", "relativesDetails"]) assert.ok(!(key in entry.application.profile));
  for (const value of [entry.application, submittedSections(entry), caseAIRequest(entry), caseReportText(entry)]) assert.ok(!JSON.stringify(value).includes("HIDDEN"));
});

test("complete admin sections cover every submitted evidence field including all stays and explanations", () => {
  const entry = makeCase();
  const answers = new Map(submittedSections(entry).flatMap((section) => section.entries).map((field) => [field.id, field.value]));
  for (const field of evidenceSources(caseAIRequest(entry))) {
    if (field.value === "") continue; // Optional legacy notes/excerpts have no applicant answer.
    assert.ok(answers.has(field.fieldId), field.fieldId);
    if (!field.fieldId.startsWith("declarations.")) assert.equal(answers.get(field.fieldId), field.value, field.fieldId);
  }
});

test("AI requests use only the exact submitted snapshot and exclude reviewer notes and decisions", () => {
  let state = submitted();
  const before = caseAIRequest(state.cases[0]);
  state = demoReducer(state, { type: "note", id: "case-a", note: "INTERNAL_ONLY" });
  state = demoReducer(state, { type: "decision", id: "case-a", input: { action: "reject", reason: "DECISION_ONLY" }, at });
  assert.deepEqual(caseAIRequest(state.cases[0]), before);
  assert.ok(!JSON.stringify(before).includes("INTERNAL_ONLY"));
});

test("out-of-order AI results stay on their case and stale request IDs are ignored", () => {
  let state = demoReducer(submitted(), { type: "submit", entry: makeCase("case-b", "draft-b") });
  state = demoReducer(state, { type: "ai-start", id: "case-a", requestId: "request-a" });
  state = demoReducer(state, { type: "ai-start", id: "case-a", requestId: "duplicate" });
  assert.deepEqual(state.cases[0].ai, { status: "loading", requestId: "request-a" });
  state = demoReducer(state, { type: "ai-start", id: "case-b", requestId: "request-b" });
  state = demoReducer(state, { type: "ai-finish", id: "case-b", requestId: "request-a", response: { status: "success", result: assessmentFixture() } });
  assert.equal(state.cases[1].ai.status, "loading");
  state = demoReducer(state, { type: "ai-finish", id: "case-a", requestId: "request-a", response: { status: "success", result: assessmentFixture() } });
  assert.equal(state.cases[0].ai.status, "successful");
  assert.equal(state.cases[1].ai.status, "loading");
  assert.equal(state.cases[0].decision, null);
  assert.equal(state.cases[0].status, "reviewing");
});

test("failed AI preserves application, local report and decision; manual retry has a new identity", () => {
  let state = submitted();
  const snapshot = state.cases[0].application;
  const local = state.cases[0].local;
  state = demoReducer(state, { type: "decision", id: "case-a", input: { action: "approve", reason: "" }, at });
  state = demoReducer(state, { type: "ai-start", id: "case-a", requestId: "first" });
  state = demoReducer(state, { type: "ai-finish", id: "case-a", requestId: "first", response: { status: "unavailable", reason: "timeout" } });
  assert.equal(state.cases[0].application, snapshot); assert.equal(state.cases[0].local, local);
  assert.equal(state.cases[0].status, "approved"); assert.equal(state.cases[0].ai.status, "failed");
  state = demoReducer(state, { type: "ai-start", id: "case-a", requestId: "retry" });
  state = demoReducer(state, { type: "ai-finish", id: "case-a", requestId: "first", response: { status: "success", result: assessmentFixture() } });
  assert.equal(state.cases[0].ai.status, "loading");
  state = demoReducer(state, { type: "ai-finish", id: "case-a", requestId: "retry", response: { status: "success", result: assessmentFixture() } });
  assert.equal(state.cases[0].ai.status, "successful"); assert.equal(state.cases[0].decision?.action, "approve");
});

test("case boundary rejects AI evidence belonging to another submission", () => {
  let state = submitted();
  state = demoReducer(state, { type: "ai-start", id: "case-a", requestId: "r" });
  const result = assessmentFixture({ concernEvidence: [{ fieldId: "reference", value: "another-case" }] });
  state = demoReducer(state, { type: "ai-finish", id: "case-a", requestId: "r", response: { status: "success", result } });
  assert.deepEqual(state.cases[0].ai, { status: "failed", reason: "invalid_response" });
});

test("human reasons are required for rejection and information requests; statuses and timestamps update independently", () => {
  let state = submitted();
  for (const action of ["reject", "request_information"] as const) {
    assert.equal(decisionSchema.safeParse({ action, reason: "   " }).success, false);
    state = demoReducer(state, { type: "decision", id: "case-a", input: { action, reason: " " }, at });
    assert.equal(state.cases[0].decision, null);
  }
  for (const [action, status] of [["request_information", "information_requested"], ["reject", "rejected"], ["approve", "approved"]] as const) {
    state = demoReducer(state, { type: "decision", id: "case-a", input: { action, reason: "Açıklama gerekiyor." }, at });
    assert.equal(state.cases[0].status, status); assert.equal(state.cases[0].decision?.decidedAt, at);
    assert.equal(state.cases[0].ai.status, "not_started");
    assert.equal(applicantReceipt(state.cases[0]).status, status);
  }
  const text = caseReportText(state.cases[0]);
  assert.match(text, /GÖNDERİLEN BAŞVURU YANITLARI/); assert.match(text, /İNSAN DEĞERLENDİRMESİ — SİMÜLE KARAR/);
  assert.match(text, /Açıklama gerekiyor/);
});
