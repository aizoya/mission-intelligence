# AIZOYA Mission Intelligence

Investigate before you commit. Local development MVP for Recursive Agents Hackathon, October 17, 2026. Founder: Franklyn Rosario, MBA-ITM. Theme: Done Means Done. WE WIN OR WE LEARN.

## Run

Requires Node 24. Run `npm ci`, copy `.env.example` to `.env`, then `npm run app`. Open http://127.0.0.1:3400. Configure provider keys privately. Live calls default to disabled; enabling them requires confirmed credits and an approved spending budget. Never commit keys or saved missions.

## Implemented

Crusoe Chat Completions and You.com Search adapters; coordinator, researcher and challenger roles; conditional follow-up research; exact quotation/source checks; bounded transient retries; labeled failure injection; persisted mission checkpoints; customer stop control; five visible workflow completion checks; JSON report download. The separate eve tool invokes the same engine.

A completed workflow does not establish source truth, semantic entailment, source independence or the safety of an offer. Missing or conflicting evidence requires human review. An in-flight request may finish and incur usage after stop is requested. Limits are operational controls, not a dollar billing cap.

## Verification and limits

17 offline tests, TypeScript checking and eve build passed for the local implementation. Run `npm test`, `npm run typecheck` and `npm run build`. Fixtures are synthetic and are not displayed as live research. GitHub CI has been authored; its actual results must be checked.

Successful live Crusoe and You.com calls, live recursion/recovery, mobile visual QA, deployment, production authentication/security and the submission video remain unverified. This is not a production service.

## Sponsor skill and identity assets

The actual Crusoe Markdown skill was used during development and installed in the private local project. This public code-only tree links to it instead of copying sponsor materials:
https://github.com/crusoecloud/crusoe-developer-hub/blob/main/examples/hackathons/crusoe-cv-recursive-agents-hackathon/crusoe-cv-recursive-agents-hackathon-skill.md

Verified sponsor blob: `ee9b084192ed091ffcce7b4b61b653a97b6d3749`. Consult the live model catalog before choosing IDs; event instructions supersede stale reference details. The skill is documentation, not an automatically provisioned hosted agent.

No company logo or mascot files are included in this public release. Optional private original assets may be added as described in public/brand/README.md. Absent images are hidden; replacements are not invented.

## Submission

The event requires a public code repository and accessible one-minute product/code demo video by 5:00 PM Pacific October 17, 2026, through Cerebral Valley. Show an actual investigation, source evidence, a clearly labeled failure/recovery and relevant code built during the event. Do not claim the video or submission is complete until verified. Include all team members; maximum four.

## License

MIT for original application code and tests; see LICENSE and LICENSE_SCOPE.md. Third-party dependencies retain their licenses. The eve scaffold, dependencies and sponsor reference predate this application. AIZOYA names and marks retain their rights.
