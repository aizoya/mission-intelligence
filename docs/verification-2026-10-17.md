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



## Grace and Errands investigation room — October 17

- Added state-driven character cards for Grace (coordinator), Errands (researcher), and a neutral reviewer symbol (challenger). Authored narration describes saved workflow state, not private reasoning or additional independent agents. No extra model/search calls.
- Activity stops on blocked/cancelled missions or failed UI polling. Task expansions preserve their open state across updates, show real assignments/follow-ups and link included/excluded sources. Source inclusion is a model assessment, not independent authentication.
- Movement can be paused; CSS respects reduced-motion preferences. Responsive layouts are authored; physical-device/browser visual acceptance remains pending.
- Original Grace welcome artwork: AIZOYA branch feature/grace-website-guide-20260927, blob ed4ff013fc94986d5de495ed57e9697d1d6f5e57. Errands greeting: Errands_Offline_Prototype_2026-10-07.zip, SHA-256 701876f3ec0e539f1190ceaa0b1120c29dfcb93fa4827f61f801f6415b307e31 matches the company checkpoint. Logo blob 06fc8cec62d79b5855b6610e6a89d43829c92f7a and wordmark blob 4df52b0104056df589b4964ea067c5fe6b63a5db used unchanged. Artwork stays ignored/excluded from public code.
- Offline tests: 37 passed; typecheck/build passed. Browser checks could not execute: local Chromium absent, its official download failed, cloud browser cannot reach the local preview port. No browser PASS claimed. Live provider completion remains unverified while Crusoe HTTP 429 is unresolved. Zero live provider requests made for this UI work.


## Clue and Prism presentation characters — October 17

Clue replaces the neutral reviewer symbol with the founder-requested original transparent robot detective artwork. Prism adds a fourth visible teammate as a deterministic report presenter, not a fourth model invocation or additional verification stage. He presents counts from the actual saved report and links to the findings; incomplete/legacy/blocked reports retain provisional or needs-review wording. No report means no results. Four-character layout uses two columns on phones. Both assets remain excluded from public code.

37 offline tests pass, including assertions that Prism never claims workflow completion without a complete mission and all completion checks passing, and no character appears working while blocked. Character PNG routes and expected content types were checked locally. Browser/physical-device visual acceptance and live provider end-to-end acceptance remain pending. No live provider calls or budget-limit changes were introduced by these presentation changes.


## Prism at report level — October 17

Moved Prism artwork and report narration into the conditionally visible evidence report. The investigation room retains Grace, Errands, and Clue. Prism remains a deterministic presenter with no additional model call. A complete headline requires complete mission status and nonempty all-passing workflow checks. Provisional, blocked, and legacy reports retain cautious wording. Browser/physical-device visual acceptance remains pending.

## Ergonomic layout pass — October 17

Moved the investigation room into the activity column alongside the question composer on desktop, shortened the introductory hero and character area, added accessible sticky section links, and collapsed detailed workflow checks behind a visible pass-count summary. Evidence citations and unresolved questions remain available. Report navigation appears only when a saved report exists. No automatic scrolling or provider calls. Offline behavior checks are not a substitute for pending browser/device visual acceptance.


## Founder screenshot correction — October 17

Founder photos show the question column squeezed by intrinsic minimum sizing of the investigation content. Set both tracks to minmax(0, fraction), allow child shrink/wrapping, and stack below 1000px. Prism image fallback was visible: artwork installation remains separate from code pull. Screenshot evidence does not establish acceptance of the corrected layout; founder visual recheck required.
