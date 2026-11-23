# Four Keeps release checks

For new-chat handoffs and recovery from GitHub clone/DNS failures, first read [CONTINUATION.md](CONTINUATION.md). A failed clone alone does not establish that GitHub connector access or another executable environment is unavailable.

GitHub Actions minutes are limited. The full CI workflow in `.github/workflows/ci.yml` runs **only when explicitly requested**, not on development commits or foundation fast-forwards. A one-time `verify/*` branch push triggers the full suite; `workflow_dispatch` is also available once the workflow is registered on GitHub's default branch (`main`).

## During development

Batch coherent changes on an isolated feature branch. Run targeted Vitest/Playwright checks in an executable development environment while iterating; do not make one GitHub commit per small edit just to get a CI run. Code changes to combat, inventory, merchants, persistence, and rules still require full release verification before publication.

## Release verification (required)

1. Finish the candidate branch. Record its exact HEAD SHA; avoid pushing more changes after verification starts.
2. **Reliable explicit trigger (works before the default branch is updated):** create a fresh `verify/<release-name>` branch **directly from the exact candidate commit SHA**, without additional commits. Its one-time branch push triggers the full workflow. For example, `gh api repos/Commodore84/four-keeps/git/refs -f ref='refs/heads/verify/v19-shop-release' -f sha='<candidate-sha>'`. Verify the ref resolves to the candidate SHA. Do not keep developing on the verify branch.
   **Alternative after the workflow exists on `main`:** GitHub **Actions → Full release verification → Run workflow**, select the candidate feature branch; or `gh workflow run ci.yml --ref <candidate-branch>`.
3. **Connector-readable verification:** The workflow writes `Four-Keeps/full-release` to GitHub commit statuses on the exact SHA (pending at start, success or failure at end). Quer...[truncated]