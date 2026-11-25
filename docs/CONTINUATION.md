# Four Keeps continuation and environment recovery

Read this document **before starting any continuation task**. Also read [RELEASE_CHECKS.md](RELEASE_CHECKS.md).

## Mandatory continuation prompt preamble

**Copy this block verbatim into every new Four Keeps continuation prompt or Proceed button, before the feature request:**

> Continue Four Keeps in `Commodore84/four-keeps`. FIRST use the GitHub connection to read `docs/CONTINUATION.md` and `docs/RELEASE_CHECKS.md` from the current working branch. Recover the existing Vercel sandbox `four-keeps-m1-b2` using `get_named_sandbox(resume:true)`; verify its `/vercel/four-keeps` checkout, GitHub connectivity, and available test runner. A local container error such as `Could not resolve host: github.com` is NOT a reason to stop or demand another chat. Preserve dirty work; create an isolated worktree from the verified candidate SHA. If the sandbox is unavailable, investigate alternate Vercel sessions and GitHub-connected execution before reporting a specific blocker. Verify current foundation/candidate SHAs rather than assuming old ones. Run the full required release checks and only publish after exact-SHA CI and Vercel READY. Do not ask me to start another chat because one execution environment failed.

**Handoff generator rule:** Never produce a Four Keeps Proceed button or new-chat continuation prompt that omits the preamble above. Keep the exact feature requirements after it. This file is a repository convention; it cannot automatically inject text into ChatGPT messages, so the continuation author must include it explicitly.

## Recover the actual state
1. Query GitHub for the current HEAD of `feat/clean-app-shell`; never assume a SHA copied from an earlier chat is still current.
2. Check existing isolated development branches, open PRs, relevant CI runs, and deployment status before creating new work. Distinguish the latest **published/verified foundation** from the latest **unfinished candidate**. Do not overwrite unfinished work.
3. Read the requested feature's existing code, tests, and relevant docs before editing. Preserve campaigns, rules, merchants, persistence, and Anchamida canon unless specifically requested otherwise.

## Verified executable recovery route (2026-11-22)
- The persistent Vercel sandbox **four-keeps-m1-b2** belongs to the Vercel **four-keeps** project. It was successfully resumed through the Vercel connection with `get_named_sandbox(resume:true)`, then commands ran through `run_session_command`.
- The sandbox's `/vercel/four-keeps` checkout can resolve and fetch from `github.com`, even when the separate ChatGPT local container cannot. **Do not treat the local container DNS failure as a blocker until this route is checked.**
- The original checkout can contain unfinished changes. Preserve it. Create a separate worktree from the exact verified candidate SHA (for example `/vercel/four-keeps-v20`), then run `npm ci`, TypeScript, Vitest, and Playwright there.
- Read command output with `get_session_command_logs`; a command response alone may omit stdout/stderr. If a long command returns a tool error, check for an already-running process before retrying, to avoid accidentally starting duplicate browser suites.
- This route is a recovery method, not a permanent guarantee of sandbox availability; check its live status and snapshots every time. Never claim execution without evidence.

## Recover execution when GitHub cloning fails
A `Could not resolve host: github.com` error from one shell is **not** proof that all development is blocked.
1. Check whether the environment already has a repository checkout, and verify its remote, branch, clean/dirty state, and HEAD.
2. Try another available executable environment, including an existing development sandbox when accessible. Verify that it can run the project's tests before relying on it.
3. Use the connected GitHub API/connector for branch discovery, file reads, isolated branch creation, and Git object writes if direct clone/network access fails. Connector access is **not** a substitute for actually running tests.
4. Check whether an authorized GitHub Actions runner can execute the exact candidate commit and produce browser artifacts. Never assert local tests or screenshot inspection occurred unless they actually did.
5. Do not claim a Vercel sandbox, GitHub Actions run, or cloud computer is accessible without checking. If no executable test environment exists, report the specific blocker and leave the foundation untouched.

## Development and publication
- Work on an isolated branch. Audit relevant source, tests and rules once, then implement related changes in substantial batches.
- Reuse the recovered environment, dependencies, rules research and fixtures. Add regression tests during implementation and run them together with TypeScript after the batch. Retest affected checks when fixing a concrete failure.
- Use the **full exact-SHA release gate** in RELEASE_CHECKS.md for final regression coverage. Use the authoritative CI run for the full suite and avoid duplicating it locally. Inspect relevant mobile evidence when the UI changes.
- Diagnose any failed release check before retrying. Keep the branch isolated and continue through verification and publication. Resolve routine implementation decisions independently.
- Create only one fresh `verify/*` ref from the finished candidate SHA for a release attempt; inspect full CI, including iPhone Playwright artifacts.
- Publish by protected, non-forced fast-forward only after successful verification; confirm exact-SHA Vercel READY.
- Never use a documentation-only GitHub API edit as evidence that runtime behavior has been implemented.
- If any required check is unavailable or fails, keep changes isolated and report what is done, unverified, and blocked.

## Continuation handoff format
Every new-chat handoff should include:
- Repository, foundation branch, last **verified** foundation SHA (as a reference, not assumed current), and any unfinished branch/SHA.
- The exact user-requested behavior and acceptance tests.
- A directive to read this file and RELEASE_CHECKS.md.
- The environment-recovery sequence above; do **not** stop after the first GitHub DNS failure.
- The release gates and requirement to report actual execution evidence, SHA, deployment, and remaining blockers.

## Current merchant UX intent (v20)
Shopping is conversational: no dedicated Shop/Browse Shop button. Natural browse requests and affirmative replies to merchant offers should open the existing catalog immediately in the same DM turn, without lengthy inventory narration or redundant confirmation. Ordinary conversation must remain ordinary conversation. Preserve the existing catalog, subgroups, full descriptions, magic item rules, cart, checkout, persistence, and campaigns. Validate the Dasahi merchant flow with deterministic tests and iPhone-emulated Playwright before claiming implementation.

### Dynamic battlefield work (2026-11-25)
See [DYNAMIC_BATTLEFIELDS.md](DYNAMIC_BATTLEFIELDS.md) for the isolated candidate, local verification, scope and remaining work. Check live exact-SHA CI and Vercel status before any publication.
