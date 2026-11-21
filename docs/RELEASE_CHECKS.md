# Four Keeps release checks

GitHub Actions minutes are limited. The full CI workflow in `.github/workflows/ci.yml` is **manual**, not triggered by each development commit or by fast-forwarding `feat/clean-app-shell`.

## During development

Batch coherent changes on an isolated feature branch. Run targeted Vitest/Playwright checks in an executable development environment while iterating; do not make one GitHub commit per small edit just to get a CI run. Code changes to combat, inventory, merchants, persistence, and rules still require full release verification before publication.

## Release verification (required)

1. Finish the candidate branch. Record its exact HEAD SHA; avoid pushing more changes after verification starts.
2. In GitHub, open **Actions → Full release verification → Run workflow**, choose the candidate feature branch and click **Run workflow**. Or use `gh workflow run ci.yml --ref <candidate-branch>` once this workflow is registered on the repository default branch.
3. Confirm the completed run's **head SHA matches the candidate SHA**, and that production build/TypeScript, **all Vitest**, **all iPhone-emulated Chromium Playwright**, and artifact upload succeeded. Inspect relevant screenshots for UI changes. A successful run for an older SHA does not authorize publication.
4. Recheck `feat/clean-app-shell` HEAD and compare ancestry: candidate must be ahead and **zero behind**. Fast-forward with non-forced, expected-SHA protection. Do not merge or force-push divergent history.
5. Verify an exact-SHA Vercel deployment is **READY**. A new foundation deployment may take additional time; an identical-SHA READY feature deployment can be used for testing.
6. If the candidate SHA changes, rerun full verification. Never treat a partial/failed/cancelled run as a release pass.

**Bootstrap exception for this workflow-only migration:** GitHub may not offer a newly added `workflow_dispatch` workflow until the file exists on the default branch. This migration changes only CI configuration and this guide; the application remains at the previously green tested SHA. Review the YAML and diff before the one-time publication. All subsequent code releases require the manual full CI check above.

## Costs and reliability

- No automatic full runs on `feat/**`, `main`, pull requests or foundation fast-forwards.
- The workflow uses `npm ci` and `setup-node` npm cache; cached packages are not a substitute for lockfile verification.
- A newer run for the **same branch** cancels an older one, preventing overlapping obsolete full runs.
- A 60-minute job timeout caps a hung runner. The full browser suite remains intact.
- GitHub's **Actions budget** is a separate account setting; a $0 overage budget can block charges, but may also prevent new runs after included minutes are exhausted.
