# Live-run remediation — 2026-10-17

Observed failures: organization-name collision, rapid HTTP 429 retries, and provisional reports with missing completion checks.

Changes:
- Researcher receives the full objective and must explicitly confirm organization relevance before captured sources enter report evidence. Unconfirmed sources remain in the saved task for review. This is a model assessment, not independent authentication.
- HTTP 429 pauses the entire mission without immediate retries. Retry-After seconds/date is preserved with a minimum 60-second cooldown. Resume during cooldown makes no provider request; successful searches are reused after cooldown.
- Provisional reports have an explicit failed completion check. Legacy reports missing checks display a review warning. Resume is shown only for blocked missions.

Validation: 27 offline tests, typecheck, and eve build passed. Tests include company mismatch quarantine, workflow pause/cooldown/resume, captured-search reuse, Retry-After handling, provisional report persistence, and DOM rendering of missing completion checks. No new live provider calls, production deployment, or submission performed. Fresh live validation remains pending. Old reports are historical and are not retroactively corrected.
