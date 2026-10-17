# Bounded rate-limit recovery

Live HTTP 429 now permits at most two automatic retries within the existing operation and mission budgets. Waits are at least 60 then 120 seconds and honor provider Retry-After. A provider deadline beyond the bounded wait pauses for manual review instead. Retry waits are visible recovery events; stop requests prevent subsequent requests after the wait. Search captures are retained. No infinite retry, automatic model switch, budget increase, or live reliability guarantee.

Validation: 40 Node tests passed offline, including recovery, attempt accounting, long cooldown, stop, budget, and persistent-block diagnostics. No live provider request was made by this engineering verification. Founder live acceptance remains pending.
