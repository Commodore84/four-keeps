# Four Keeps release checks

For new-chat handoffs and recovery from GitHub clone/DNS failures, first read [CONTINUATION.md](CONTINUATION.md). A failed clone alone does not establish that GitHub connector access or another executable environment is unavailable.

GitHub Actions minutes are limited. The full CI workflow in `.github/workflows/ci.yml` runs **only when explicitly requested**, not on development commits or foundation fast-forwards. A one-time `verify/*` branch push triggers the full suite; `workflow_dispatch` is also available once the workflow is registered on GitHub's default branch (`main`).

## Current release policy — risk-based tiers (approved 2026-11-28)

**This section is authoritative for all future Four Keeps sessions and supersedes older blanket language below or in historical feature notes that says every UI change requires full-suite CI.** Always classify the actual diff by risk before selecting tests. Do not spend the full release-gate time on a routine visual tweak.

### Tier 1: routine, low-risk UI changes

Typical scope: text and icon changes; cosmetic spacing, typography, and color; rearranging an existing menu; and local-only presentation preferences (such as hamburger-menu order) that do not change campaign state, saved gameplay, backend data, security, or rules.

1. Use an isolated branch/worktree and preserve unrelated work.
2. Run TypeScript, one production build, affected Vitest tests, and a small number of focused iPhone Playwright tests. Inspect one relevant mobile screenshot when visual changes matter. Avoid running unrelated tests.
3. Require a READY preview deployment for the *exact candidate SHA*. Review any failure and escalate to Tier 2 if the change has broader effects or tests expose unexpected coupling.
4. **Tier 1 can be published to `feat/clean-app-shell` after the targeted checks and exact-SHA READY preview, without creating a `verify/*` ref or running the full 1,000+-unit/180+-browser suite.** Verify ancestry is zero-behind and perform a non-forced, expected-SHA protected fast-forward. Confirm the published SHA. Do not pretend a full suite ran.
5. Prefer batching several routine cosmetic tweaks into one coherent small release rather than separate CI/deploy cycles.

### Tier 2: significant or uncertain-risk changes

Always use the complete exact-SHA release gate below for combat and encounter logic, class/D&D rules, inventory/merchant purchases/currency, equipment/consumables, campaign save/load or migrations, DM/server/API integration, generated world/scene persistence, security/permissions, or changes that significantly alter behavior or touch multiple coupled systems. A small-looking change that affects these systems is Tier 2. If the impact cannot be confidently bounded, default to Tier 2.

Tier 2 requires full Vitest, entire iPhone Chromium Playwright suite and uploaded artifacts, production build/TypeScript, relevant screenshot inspection, exact-SHA Vercel READY, and protected foundation fast-forward. A failed gate never authorizes publication.

### Documentation-only/process changes

Documentation that changes no application behavior requires review for internal consistency and a protected non-forced foundation update, **not** a redundant application build or full suite.

### Periodic integration verification

After several grouped Tier 1 updates or ahead of a major playtest/milestone, run one complete exact-SHA Tier 2-style integration sweep, even if the individual changes were low risk. If full integration tests uncover regressions, stop further promotion and fix them. Do not repeatedly poll unchanged CI; check at meaningful completion boundaries.

## During development

Batch coherent changes on an isolated feature branch. Run targeted Vitest/Playwright checks in an executable development environment while iterating; do not make one GitHub commit per small edit just to get a CI run. Tier 2 changes to combat, inventory, merchants, persistence, server integration, and rules still require full release verification before publication.

## Tier 2 — full release verification (required for significant changes)

1. Finish the candidate branch. Record its exact HEAD SHA; avoid pushing more changes after verification starts.
2. **Reliable explicit trigger (works before the default branch is updated):** create a fresh `verify/<release-name>` branch **directly from the exact candidate commit SHA**, without additional commits. Its one-time branch push triggers the full workflow. For example, `gh api repos/Commodore84/four-keeps/git/refs -f ref='refs/heads/verify/v19-shop-release' -f sha='<candidate-sha>'`. Verify the ref resolves to the candidate SHA. Do not keep developing on the verify branch.
   **Alternative after the workflow exists on `main`:** GitHub **Actions → Full release verification → Run workflow**, select the candidate feature branch; or `gh workflow run ci.yml --ref <candidate-branch>`.
3. **Run discovery:** The GitHub connector `fetch_commit_workflow_runs` only returns PR-triggered runs. For `verify/*` pushes use the public GitHub Actions REST API from the Vercel sandbox: `https://api.github.com/repos/Commodore84/four-keeps/actions/runs?branch=<URL-encoded-verify-branch>&per_page=10`. Inspect the exact-SHA run and `/actions/runs/<run-id>/jobs`; require success for build, Vitest, iPhone Playwright and artifact upload. GitHub Actions runs with zero jobs and failure indicate invalid workflow YAML. Do not change a working workflow to work around the connector. Do not write truncated tool-log output into source files.
4. Confirm the completed run's **head SHA matches the candidate SHA**, and that production build/TypeScript, **all Vitest**, **all iPhone-emulated Chromium Playwright**, and artifact upload succeeded. Inspect relevant screenshots for UI changes. A successful run for an older SHA does not authorize publication.
4. Recheck `feat/clean-app-shell` HEAD and compare ancestry: candidate must be ahead and **zero behind**. Fast-forward with non-forced, expected-SHA protection. Do not merge or force-push divergent history.
5. Verify an exact-SHA Vercel deployment is **READY**. A new foundation deployment may take additional time; an identical-SHA READY feature deployment can be used for testing.
6. If the candidate SHA changes, rerun full verification. Never treat a partial/failed/cancelled run as a release pass.

**Bootstrap:** GitHub registers `workflow_dispatch` from its default branch (`main`). Until the default branch has this workflow, use the `verify/*` trigger instead. For this workflow-only migration, create a `verify/*` ref pointing to the candidate SHA, run the full gate, and only then publish the verified SHA to the foundation.

## Costs and reliability

- No automatic full runs on development `feat/**`, `main`, pull requests or foundation fast-forwards. Only a deliberate `verify/*` branch creation (or registered manual dispatch) starts the suite.
- The workflow uses `npm ci` and `setup-node` npm cache; cached packages are not a substitute for lockfile verification.
- A newer run for the **same branch** cancels an older one, preventing overlapping obsolete full runs.
- A 60-minute job timeout caps a hung runner. The full browser suite remains intact.
- GitHub's **Actions budget** is a separate account setting; a $0 overage budget can block charges, but may also prevent new runs after included minutes are exhausted.

## Vercel BLOCKED deployments: pre-build gate

A deployment marked `BLOCKED` immediately, with no build events, has not reached Vite, TypeScript or application tests. Do not retry unchanged deployments or claim a release is READY.

1. Inspect exact deployment ID, project/team, commit SHA and build events. Compare with the last READY SHA. Check the dashboard error overlay, account notices, email, plan/quota status, policy restrictions, Git contributor permissions and Vercel status.
2. If authorized, try one exact-SHA deployment via Vercel API. If it is also BLOCKED, do not assume that changing application code will resolve the platform gate. Try a project-linked, authenticated Vercel CLI only if credentials are available.
3. Preserve the candidate on its isolated branch. If Vercel exposes no reason, escalate with deployment IDs and the absence of build events; the account owner may need to act.
4. Once the gate clears, recheck the exact SHA and full GitHub CI, then require an exact-SHA Vercel READY before protected fast-forward or announcing a release.

2026-11-23 incident: project `prj_PRQK3pVlCo8qWquhwJ94zOiGzZQc`, team `team_sUlSKPlHlLYM9o1eS7GG4H7p`. Deployments `dpl_22zAR28ckreH1k34aVobshz3UPxt` and `dpl_E9eP6iXXpLVGqpzFsrxD5NuEnNVN` were BLOCKED before build. Direct Git-source API deployment was also BLOCKED. Last confirmed READY: `dpl_EkXL9KUThfYRDmzxbG4ZJLrDKPoU`, SHA `79a9ad3ab64d709272956b61249d7ece7d34623d`. Root cause is unconfirmed.

## Faster development and release workflow (2026-11-25)

**Keep the exact-SHA full release gate for Tier 2. Use the targeted Tier 1 process for routine UI changes.** The previous build script ran the entire Vitest suite as part of 'npm run build' and the GitHub workflow independently ran 'npm test', executing all unit tests twice per release. The build script is now only 'tsc -b && vite build'. Full release CI explicitly runs 'npm test' **once**, followed by the production TypeScript/Vite build, the complete iPhone Chromium Playwright suite and evidence upload. The Playwright Chromium browser download is cached by OS and dependency lockfile; 'playwright install --with-deps chromium' still verifies browser and system dependencies on every run. The cache is an optimization, not proof of browser compatibility.

### During development — run only relevant checks, in one sandbox

1. Recover 'four-keeps-m1-b2', verify HEAD and the test runner, preserve the dirty checkout, and use a fresh isolated worktree based on the current verified foundation. Link or reuse compatible installed 'node_modules' where appropriate; use 'npm ci' when a dependency or lockfile changes. Reuse the already-available Chromium binary, and avoid starting overlapping Playwright processes that contend for port 4173.
2. Implement a **coherent batch** (instead of releasing after each small code adjustment). Run 'npx tsc -b --pretty false', 'npx vitest run <affected-test-files>', and 'CI=1 npx playwright test <affected-e2e-specs> -g <relevant-scenarios> --workers=1 --reporter=line'. These are scoped diagnostics and **do not replace** the full gate.
3. If an interaction is timing-sensitive, stress the affected browser test ('--repeat-each=3 --workers=2') **before** committing a release candidate. Prefer resilient real-user interaction timing in tests, and validate camera visibility/virtualization instead of clicking intentionally unmounted DOM cells.
4. Inspect affected iPhone screenshots. For non-UI changes, skip screenshot collection unless it helps diagnose a failure. Run 'npm run build' locally **once** after finalizing the batch; do not also run a local full Vitest/browser suite just before GitHub's identical full CI.
5. Commit an exact candidate SHA, push a fresh one-time 'verify/*' ref, and let the single authoritative GitHub Actions run exercise the **entire** unit suite and iPhone browser suite. Vercel READY may build in parallel; recheck both before fast-forwarding the foundation. A failed full gate requires a fix and a fresh exact-SHA verify branch; never promote on partial results.
6. Avoid wasteful repeated polling and duplicate CI runs. Check the status at meaningful stage boundaries; when a stage is still running, do not recreate or manually rerun its tests on another runner. Keep explicit final reports of source SHA, actual CI totals, screenshots for UI work, deployment state and remaining limitations.

**Do not claim a promised duration.** Small UI fixes will often be shorter because work is tested in focused batches and Vitest is no longer duplicated, but CI runner load, true regressions and Vercel deployment times still vary. Never weaken the Tier 2 full release gate to hit an artificial time estimate; equally, do not apply it to every Tier 1 change.
