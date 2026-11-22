# Four Keeps release checks

For new-chat handoffs and recovery from GitHub clone/DNS failures, first read [CONTINUATION.md](CONTINUATION.md). A failed clone alone does not establish that GitHub connector access or another executable environment is unavailable.

GitHub Actions minutes are limited. The full CI workflow in `.github/workflows/ci.yml` runs **only when explicitly requested**, not on development commits or foundation fast-forwards. A one-time `verify/*` branch push triggers the full suite; `workflow_dispatch` is also available once the workflow is registered on GitHub's default branch (`main`).

## During development

Batch coherent changes on an isolated feature branch. Run targeted Vitest/Playwright checks in an executable development environment while iterating; do not make one GitHub commit per small edit just to get a CI run. Code changes to combat, inventory, merchants, persistence, and rules still require full release verification before publication.

## Release verification (required)

1. Finish the candidate branch. Record its exact HEAD SHA; avoid pushing more changes after verification starts.
2. **Reliable explicit trigger (works before the default branch is updated):** create a fresh `verify/<release-name>` branch **directly from the exact candidate commit SHA**, without additional commits. Its one-time branch push triggers the full workflow. For example, `gh api repos/Commodore84/four-keeps/git/refs -f ref='refs/heads/verify/v19-shop-release' -f sha='<candidate-sha>'`. Verify the ref resolves to the candidate SHA. Do not keep developing on the verify branch.
   **Alternative after the workflow exists on `main`:** GitHub **Actions → Full release verification → Run workflow**, select the candidate feature branch; or `gh workflow run ci.yml --ref <candidate-branch>`.
3. Confirm the completed run's **head SHA matches the candidate SHA**, and that production build/TypeScript, **all Vitest**, **all iPhone-emulated Chromium Playwright**, and artifact upload succeeded. Inspect relevant screenshots for UI changes. A successful run for an older SHA does not authorize publication.
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
