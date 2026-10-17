# Live-run remediation — 2026-10-17

Observed failures: organization-name collision, rapid HTTP 429 retries, and provisional reports with missing completion checks.

Changes:
- Researcher receives the full objective and must explicitly confirm organization relevance before captured sources enter report evidence. Unconfirmed sources remain in the saved task for review. This is a model assessment, not independent authentication.
- HTTP 429 pauses the entire mission without immediate retries. Retry-After seconds/date is preserved with a minimum 60-second cooldown. Resume during cooldown makes no provider request; successful searches are reused after cooldown.
- Provisional reports have an explicit failed completion check. Legacy reports missing checks display a review warning. Resume is shown only for blocked missions.

Validation: 27 offline tests, typecheck, and eve build passed. Tests include company mismatch quarantine, workflow pause/cooldown/resume, captured-search reuse, Retry-After handling, provisional report persistence, and DOM rendering of missing completion checks. No new live provider calls, production deployment, or submission performed. Fresh live validation remains pending. Old reports are historical and are not retroactively corrected.

## Report quality and bounded finalization remediation

Observed live run: all three initial tasks completed after the founder reported a provider quota increase. Two recursive follow-ups failed the global relevance gate; final review timed out and its retry encountered the existing 14-attempt cap. This was not a newly observed 429. Historical mission exports remain unchanged.

Changes:
- Every accepted finding is visibly attributed to its cited source and classified as a source claim (or warning), not independently verified product performance. Review instructions avoid endorsing marketing guarantees.
- Researcher must assess relevance and official status separately for each zero-based source index. Missing, duplicate, and uncertain assessments fail closed. Objectives mentioning official sources use only results marked both relevant and official. This classification remains a model assessment, not independent authentication.
- Optional recursion needs room for a worker attempt and three final-review attempts. The original model, search, and token limits are unchanged.
- Budget exhaustion finalizes an explicitly incomplete needs_review report without further provider calls. Bounded final-review failures retain prior quotation-checked findings with an explicit failed final-review check; incomplete tasks remain listed.

Validation: 36 offline tests, typecheck, and eve build passed. New regressions cover mixed-company/third-party results, absent and duplicate source assessments, attribution and idempotent revalidation, final-review reservation, exhausted saved runs with zero provider calls, and bounded review timeouts. No live provider request or deployment was performed for this patch. Fresh live validation is required; offline contracts cannot establish classification accuracy or report quality on live sources.
