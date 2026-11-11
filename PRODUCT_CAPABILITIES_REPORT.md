# VizeLens — Current Product Capabilities

Review date: **2026-11-11**  
Repository revision reviewed: **`c31783e`**  
Product version: **0.1.0**  
Basis: current application code, validation schemas, tests, and repository documentation.

## Product overview

VizeLens is a Turkish-language visa application pre-review prototype. A user can enter one application's details, check them for specific inconsistencies, optionally request an AI assessment, and copy or print the resulting report for human review.

The product currently supports a complete **in-session intake → analysis → report → edit and re-analyze** flow. It does not save applications, submit visa applications, determine official eligibility, or record a reviewer's approval.

Local checks work without AI credentials. The optional AI path is implemented and covered by mocked integration tests; its live availability depends on server configuration and the external provider.

## Capability summary

| Capability | Current behavior |
| --- | --- |
| Guided application intake | Four steps with required fields, conditional questions, validation, and an editable summary. |
| Applicant profile | Collects personal, employment, education, travel, visa/refusal, language, family, asset, and funding information. |
| Local consistency review | Calculates trip duration and accommodation coverage; identifies gaps, overlapping stays, stays outside the trip, and a budget below the user's estimated cost. |
| Optional AI assessment | Reviews applicable submitted answers and explanations, returning structured findings, evidence, clarification questions, consistent points, and limitations. |
| Report presentation | Displays local findings and AI assessment separately, with source values and review questions. |
| Report export | Copies report text to the clipboard and opens browser printing with a dedicated print layout. |
| Editing and retry | Preserves form values, marks old reports stale after edits, and supports retrying an unsuccessful consented AI request. |
| Demonstrations | Five fictional sample applications are available. |
| Responsive interface | Responsive styles and browser test scenarios exist for phone, tablet, and desktop layouts. |
| Saved cases, accounts, approvals | Not implemented. |
| Uploaded document analysis | Not implemented; document-related inputs are declarations and fictional text excerpts. |
| Official visa requirements or outcome prediction | Not implemented; explicitly outside the current review scope. |

## 1. What a user can enter

### Application and travel

- An application reference, rather than a full name.
- Destination: **United States, Canada, Türkiye, or Germany**.
- Purpose: **tourism, business travel, or visiting family/friends**.
- Departure and return dates, plus a travel-purpose explanation.
- A live duration display in nights and inclusive calendar days. A same-day trip is zero nights and one calendar day.

Destination is context for the report and AI assessment. Selecting a country does not activate a country-specific visa checklist.

### Personal profile and travel history

- Employment sector: public, private, or independent; occupation; employment start year.
- Marital status, age, birth country, and education level.
- Number of countries visited and applicable travel regions: Schengen Area, United States, and other countries.
- Whether the applicant holds a valid foreign visa or residence permit, with countries when applicable.
- Previous visa refusals, with countries and an explanation when applicable.
- Foreign languages, relatives at the destination, relationship, and additional family-related explanation when applicable.

These answers appear in the report and are included in an AI request when applicable and consented. They do not change the deterministic local findings.

### Funding, accommodation, and declarations

- Available budget and estimated total cost in **EUR, USD, or TRY**.
- One or more funding methods: loan, credit card, or cash.
- Asset ownership and applicable types: house, car, agricultural land, or plot.
- Funding and accommodation explanations.
- Up to **20 accommodation records**, each containing a type, check-in date, and check-out date. Types are hotel, staying with family/friends, or other.
- Four required declaration checkboxes covering identity/passport information, itinerary, budget explanation, and accommodation explanation.

The product compares two amounts in the same selected currency. It does not convert currencies or independently estimate travel costs. The declaration checkboxes do not upload, inspect, or authenticate documents.

### Final review

The final step shows a summary of the earlier steps, with buttons to return to the relevant section. It also requires a review note and fictional document excerpts, and lets the user select local-only analysis or local checks plus AI.

Sources: [application form](src/components/application-form.tsx), [profile fields](src/components/applicant-profile-fields.tsx), [application schema](src/lib/validation.ts), [profile schema](src/lib/applicant-profile.ts), [summary](src/components/application-summary.tsx).

## 2. Validation and workflow behavior

The form checks the current step before advancing and checks the complete active application before generating a report. It shows field errors and moves focus to the first relevant invalid field. Returning to earlier steps preserves entered values.

Current validation includes:

- Required text cannot be blank or whitespace-only. Reference, profile fields, explanations, review note, fictional excerpts, and all four declarations are mandatory where applicable.
- Yes/no questions require an explicit answer. A “Yes” answer makes the associated detail fields required.
- Hidden conditional answers remain in form memory for toggling back, but are removed or normalized before validation and excluded from reports and AI evidence when inactive.
- Travel regions are required when the visited-country count is greater than zero.
- Overnight trips require at least one accommodation record; same-day trips do not.
- Return cannot precede departure, and accommodation check-out must follow check-in.
- Amounts must be nonnegative, have at most two decimal places, and be at most one trillion. A comma or period can be used as the decimal separator; thousands separators are not supported.
- Age must be an integer from 0–120; visited-country count from 0–250; employment start year from 1900 through the current year.
- Reference length is limited to 80 characters; the three travel/funding/accommodation explanations and review note to 2,000 each; fictional excerpts to 3,000. Profile fields have additional limits.

**Missing required information is usually a blocking form error, not a generated report finding.** The shared calculation function contains missing-stay and missing-declaration finding branches, but the normal validated submission flow prevents those inputs from reaching report generation. Partial accommodation coverage can still produce a report and a finding.

Sources: [step validation](src/lib/application-steps.ts), [application schema](src/lib/validation.ts), [profile normalization](src/lib/applicant-profile.ts), [narrative limits](src/lib/narratives.ts), [required-field tests](tests/required-fields.test.ts).

## 3. What local analysis can detect

Local analysis runs in the browser and does not send application answers to the analysis API. It is deterministic: the same validated input produces the same findings.

| Check | Result available to the user |
| --- | --- |
| Trip duration | Number of nights between departure and return. |
| Accommodation coverage | Covered and uncovered nights within the trip. Stay intervals are combined so a night is not counted twice. |
| Incomplete accommodation coverage | A finding stating the number of uncovered nights and asking for the remaining plan. |
| Overlapping accommodation | A finding identifying nights that appear in multiple stay records and asking which plan applies. |
| Accommodation outside the trip | A finding listing records that extend beyond the entered travel dates. Out-of-trip nights do not count toward coverage. |
| Budget shortfall | A finding when the entered available budget is lower than the entered estimated cost, including the monetary difference. |

Each finding includes a stable rule identifier, category, title, explanation, evidence, and a clarification question. Categories distinguish missing information, inconsistency, and information requiring review.

Date arithmetic uses UTC date-only values, including tests across daylight-saving changes. Accommodation coverage treats check-out as exclusive. Overlap detection examines the entered stay intervals, including overlaps outside the trip; coverage itself is clipped to the trip.

Local rules do **not** interpret prose, judge the applicant's profile, check official financial thresholds, or determine whether a stated travel purpose is credible. A report with zero local findings only means these limited checks found no discrepancy.

Sources: [review engine](src/lib/review.ts), [date utilities](src/lib/dates.ts), [review tests](tests/review.test.ts).

## 4. What optional AI review can do

Local-only analysis is the default. AI review requires both selecting the AI option and giving separate permission to send the applicable answers. Choosing AI without consent still produces the local report and explains that no AI request was sent.

With consent, the browser sends an explicitly constructed payload to `POST /api/analyze`. The payload includes the reference, travel details, finances, stays, declarations, applicable profile answers, review note, and all four narrative fields. Inactive conditional details are excluded. The server validates the application again and uses the OpenAI SDK's Responses API with structured output.

The AI is instructed to review internal contradictions, unclear funding, inconsistencies between the stated purpose and explanations, accommodation/itinerary gaps, and supporting information that needs clarification. The resulting report can include:

- One overall assessment: **no material concern identified**, **clarification required**, **significant concerns identified**, or **insufficient information**.
- A Turkish summary.
- Up to **12 findings**, with category, low/medium/high clarification priority, explanation, evidence, and a question.
- Up to **8 evidence-supported consistent points**.
- Limitations, including fixed product limitations added to the displayed and copied result.

AI categories cover contradictions, funding, travel purpose, accommodation/travel plan, supporting information, and uncertainty. Findings are displayed in priority order. Priority describes the need for clarification, not a person's risk or visa approval probability.

Both client and server validate the output structure and match cited evidence to submitted fields. Exact values are required for numeric, date, selection, and list evidence; supported prose fields may use verbatim excerpts. The validator also rejects certain inconsistent assessment/priority combinations, duplicate category/title findings, findings supported only by demographic fields, and AI findings based only on local date/budget calculation fields.

These controls provide structural safeguards; they do not prove that the model's reasoning is correct. Broader restrictions, such as avoiding invented visa requirements, also depend on model instructions and partial output screening. There is no reviewed visa-criteria dataset or verified document collection behind the assessment.

Sources: [AI payload and validation](src/lib/ai-contract.ts), [server handler and instructions](src/server/analyze.ts), [AI presentation](src/components/ai-observations.tsx), [AI tests](tests/ai.test.ts).

## 5. Reports, editing, and failure handling

After valid submission, the product immediately opens a local report. If AI was requested, its result loads separately without replacing the local findings.

The report contains application context, travel dates, local summary, duration and coverage metrics, findings and evidence, applicant-profile answers, budget information, and scope limitations. The AI section distinguishes not requested, loading, failed, and successful states.

Users can:

- Return to the application, edit it, and regenerate the report.
- Reopen the last report while editing. Once information changes, it is marked stale.
- Copy the current report as plain text, including the AI result or current AI status. Clipboard success/failure is shown in the interface.
- Print through the browser using an A4-oriented report stylesheet. Saving as PDF depends on the browser's print dialog; there is no dedicated PDF-generation service.
- Clear the form and report or load another fictional sample.
- Retry an unavailable AI assessment when the previous request had consent and the report remains current.

Copying and printing through the report controls are disabled when the report is stale. Print styles also hide stale report content during direct browser printing. The export is a review report, not a full raw application export: it does not automatically reproduce every narrative or every stay record unless included in findings or evidence.

If AI fails, the local report and form remain available. Failure states cover missing configuration, timeout, provider errors, invalid input/output, identifier-pattern screening, missing consent, cancellation, and provider refusal. The provider timeout is 25 seconds and the client timeout is 30 seconds, with no automatic retries. Pending requests are cancelled on relevant edits, clearing, or returning to edit; late responses are ignored, and duplicate in-flight submissions are guarded against.

Sources: [workspace state](src/components/workspace.tsx), [report component](src/components/review-report.tsx), [text export](src/lib/review.ts), [AI client](src/lib/ai-client.ts), [print styles](src/app/globals.css).

## 6. Demonstrations and interface support

Five samples generate fictional trips starting 30 days after the current date:

| Sample | Expected behavior |
| --- | --- |
| Accommodation mismatch | A 10-night trip with six nights covered and a budget below estimated cost produces two local findings. |
| Consistent application | Complete accommodation coverage and sufficient entered budget produce zero local findings. |
| Missing information | Required profile, narrative, stay, and declaration information must be completed before review. |
| Reversed travel dates | Advancement is blocked until the return date is corrected. |
| Purpose/explanation conflict | Tourism is selected while the explanation describes business meetings; interpretation is left to optional AI review. |

Loading a sample resets prior results, errors, AI selection, and consent. It does not automatically generate a report. There is also a “How it works” view explaining the approach and limits.

The interface includes Turkish labels and formatting, responsive layouts, a skip link, field labels and error associations, keyboard focus handling, live status announcements, and reduced-motion styles. Playwright projects target widths of 320, 375, 390, 768, 1024, and 1440 pixels using installed Google Chrome. This is implemented support and test coverage, not a claim of accessibility certification or verification on every physical device.

Sources: [samples](src/lib/samples.ts), [help view](src/components/how-it-works.tsx), [layout](src/app/layout.tsx), [browser tests](tests/browser), [Playwright configuration](playwright.config.ts).

## 7. Data handling and operating requirements

Application and report state live in React memory. Refreshing the page or clearing it removes that state. There is no application database, localStorage persistence, saved history, or cross-device continuation.

For optional AI, the code reads `OPENAI_API_KEY` and `OPENAI_MODEL` on the server. It sets `store: false`, disables SDK logging and automatic retries, and returns analysis responses with `Cache-Control: no-store`. These implementation settings do not establish a complete external-provider data-retention guarantee.

The AI boundary applies an identifier-like text check, requires a consent flag, limits request bodies to 64 KiB while reading them, validates JSON content and schemas, and rejects a mismatched Origin header when present. Identifier detection is a basic pattern check rather than comprehensive personal-data detection. There is no authentication, per-user authorization, rate limiter, or production spending quota in the repository.

The application uses Next.js App Router, React, TypeScript, Tailwind CSS, React Hook Form, Zod, and the OpenAI SDK. The documented runtime requirement is **Node.js 22.13 or newer**. Standard scripts support development, production build/start, linting, type checking, unit/integration tests, and browser tests.

Sources: [package manifest](package.json), [environment template](.env.example), [API route](src/app/api/analyze/route.ts), [request handler](src/server/analyze.ts), [identifier screening](src/lib/narratives.ts).

## 8. Current product boundaries

The following capabilities are absent from the current implementation:

| Area | What is missing |
| --- | --- |
| Case management | Saved applications, resumable drafts, case lists/search, persisted report versions, and analysis history. |
| Multi-user operation | Accounts, applicant/reviewer/admin roles, case ownership, assignment, and shared review. |
| Human sign-off | Approval/rejection actions, reviewer identity, saved decisions, and an audit trail. Human review currently happens outside an enforced product workflow. |
| Document processing | File uploads, OCR, passport extraction, bank-statement parsing, and document authenticity checks. |
| Visa-policy assessment | Sourced country-specific rules, visa-type requirements, nationality/residence-based eligibility, and official financial thresholds. |
| External application operations | Embassy/consulate submission, appointments, application-status tracking, and notifications. |
| Durable AI operations | Background jobs, persisted task status, and analysis that can be resumed after closing the page. |
| Language and profile coverage | Language switching and comprehensive applicant categories. Employment sector, occupation, and start year are mandatory, with no dedicated unemployed, retired, or student branch. |

Numeric visa-risk scoring, approval/refusal probabilities, and automated visa decisions are also outside the current behavior. The AI is instructed not to produce them.

The required fictional-excerpt field and restricted profile choices reinforce the current prototype/demo scope. A user cannot simply submit a minimal incomplete case and receive a complete missing-document checklist.

## 9. Verification performed for this report

| Check | Result from this review |
| --- | --- |
| Source review | Inspected the form, profile/step validation, local engine, report/export flow, AI contract/client/server, styles, samples, and test coverage. |
| `npm run lint` | Passed. |
| `npm run typecheck` | Passed. |
| `npm test` under Node 22.21.0 | **33 passed, 0 failed.** |
| `npm run build` under Node 22.21.0 | Passed; production output includes the main page and dynamic `/api/analyze` endpoint. |
| Playwright browser suite | Present and inspected, but not rerun during this review. |
| Live AI/provider call | Not performed during this review. AI test results use mocked transport and do not establish current live-provider availability. |

The shell initially selected Node 18.20.2, causing the test command to fail because that runtime does not support `--experimental-strip-types`. Re-running with the already installed Node 22.21.0 passed all tests; the production build also used Node 22.21.0. This is an environment requirement, not a failing application test.

The README records earlier browser and live-provider checks from November 4, 2026. Those historical results are not counted as fresh verification here. No deployed environment or physical-device behavior was verified for this report.

### Documentation discrepancy

[IMPLEMENTATION_AUDIT.md](IMPLEMENTATION_AUDIT.md) describes an older revision and says applicant-profile answers are excluded from AI requests. That is no longer accurate: the current [AI request builder](src/lib/ai-contract.ts) includes every applicable profile answer, the review note, and the narratives. The current AI contract also supports overall assessment states and clarification priorities. This report follows the current source and tests wherever older documentation differs.
