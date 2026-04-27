# GitHub Issue Orchestration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Coordinate an overnight GitHub Issue pass where isolated agents implement independent issues without disturbing the dirty coordinator checkout.

**Architecture:** The coordinator reads GitHub Issues, writes durable context, dispatches one isolated worker per issue, then reviews worker diffs before any integration. Wave 1 is deliberately limited to independent catalog/ability tasks plus one bugfix worker. UI restructuring and current dirty stab work are deferred.

**Tech Stack:** Vanilla JavaScript modules, Three.js, MuJoCo WASM, Node's built-in test runner, GitHub CLI, git branches/worktrees.

**Spec:** `docs/superpowers/specs/2026-04-27-gh-issue-orchestration-design.md`

---

## File Structure

- Create: `docs/superpowers/specs/2026-04-27-gh-issue-orchestration-design.md`
  - Durable orchestration spec, issue allocation rules, review gates, and repo safety constraints.
- Create: `docs/superpowers/plans/2026-04-27-gh-issue-orchestration.md`
  - This executable plan and worker prompts.
- Worker branches/worktrees:
  - Each worker must work from clean `e5f3e3e368a4c96d65c325ee6955292370336e18`.
  - Each worker must avoid the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.

---

## Task 1: Confirm Issue State And Dirty Baseline

**Files:**
- Read-only: GitHub Issues via `gh`
- Read-only: git status and current branch

- [x] **Step 1: Fetch repository and open issues**

Run:

```powershell
gh repo view --json nameWithOwner,defaultBranchRef,url
gh issue list --state open --limit 50 --json number,title,url,labels,assignees,createdAt,updatedAt,body
```

Expected:

- Repo is `rexheng/rexhengweb`.
- Open issues include `#2` through `#11`, excluding a visible `#1`.

- [x] **Step 2: Capture dirty baseline**

Run:

```powershell
git status --short
git rev-parse HEAD
git branch --show-current
```

Expected:

- Branch is `main`.
- HEAD is `e5f3e3e368a4c96d65c325ee6955292370336e18`.
- Dirty files are treated as user/in-flight work and not overwritten.

---

## Task 2: Wave 1 Worker Dispatch

**Files:**
- No direct coordinator edits except this plan/spec.
- Worker-owned files listed per issue below.

Every Wave 1 worker prompt must include this shared safety preamble:

```markdown
Shared safety rules:
- Work only in your isolated worker branch/worktree. Do not edit the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.
- Do not commit, merge, cherry-pick, push, create a PR, close an issue, or change GitHub issue state.
- Before coding, run `git status --short --branch` and verify the worker checkout is clean.
- Refresh the issue with `gh issue view <number> --json number,title,body,comments,url` before implementation.
- Keep changes narrowly scoped to the issue files listed in this prompt.
- If runtime visual verification is not possible for a visual change, return `DONE_WITH_CONCERNS`, not `DONE`.
- For browser or in-game verification, use `docs/IN_GAME_TESTING.md` as the playbook. If you discover a faster or more reliable navigation/testing path, update that guide in your worker branch/worktree and report the section changed. If the file is missing in your isolated branch, create it from the coordinator guide before adding your finding.
```

- [ ] **Step 1: Dispatch Worker #4, ClearPath dotted route**

Use a fresh isolated worker with this prompt:

```markdown
You are implementing GitHub issue #4 in repo `rexheng/rexhengweb`.

Shared safety rules:
- Work only in your isolated worker branch/worktree. Do not edit the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.
- Do not commit, merge, cherry-pick, push, create a PR, close an issue, or change GitHub issue state.
- Before coding, run `git status --short --branch` and verify the worker checkout is clean.
- Refresh the issue with `gh issue view 4 --json number,title,body,comments,url` before implementation.
- Keep changes narrowly scoped to the issue files listed in this prompt.
- If runtime visual verification is not possible for this visual change, return `DONE_WITH_CONCERNS`, not `DONE`.
- For browser or in-game verification, use `docs/IN_GAME_TESTING.md` as the playbook. If you discover a faster or more reliable navigation/testing path, update that guide in your worker branch/worktree and report the section changed. If the file is missing in your isolated branch, create it from the coordinator guide before adding your finding.

Issue:
ClearPath route should be a dotted-line trail, not a single particle.

Goal:
Replace or extend the current ClearPath `dispatch` ability so firing "Route!" shows a dotted/dashed route from the ClearPath sprite to the humanoid centroid. It should feel like a map/NHS pathway route, with sequential fade-in along the path and NHS blue palette. Avoid unrelated refactors.

Branch/worktree:
Work from clean HEAD `e5f3e3e368a4c96d65c325ee6955292370336e18` on an isolated branch named `agent/issue-4-clearpath-dotted-route`.

Likely files:
- `src/projects/abilities/dispatch.js`
- `src/projects/catalog/clearpath/index.js`
- `src/projects/catalog/clearpath/build.js`
- Optional reference only: `src/trails.js`

Constraints:
- Do not edit `src/projects/system.js` unless absolutely required.
- Any scratch meshes/materials created by the ability must be disposed on completion or cancellation.
- Keep the ability bounded in duration.
- Do not change unrelated project catalog behavior.

Verification:
- Run `node --check src/projects/abilities/dispatch.js`.
- If you edit any additional `.js` files, run `node --check` on each.
- If runtime testing is possible, follow `docs/IN_GAME_TESTING.md`, serve with the guide's current server command, and verify ClearPath route visually.

Return:
- Status: DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.
- Branch/worktree path.
- Files changed.
- Verification commands and exit codes.
- Summary of implementation.
- Remaining risks.
```

- [ ] **Step 2: Dispatch Worker #5, Musicity flanking apartments**

Use a fresh isolated worker with this prompt:

```markdown
You are implementing GitHub issue #5 in repo `rexheng/rexhengweb`.

Shared safety rules:
- Work only in your isolated worker branch/worktree. Do not edit the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.
- Do not commit, merge, cherry-pick, push, create a PR, close an issue, or change GitHub issue state.
- Before coding, run `git status --short --branch` and verify the worker checkout is clean.
- Refresh the issue with `gh issue view 5 --json number,title,body,comments,url` before implementation.
- Keep changes narrowly scoped to the issue files listed in this prompt.
- If runtime visual verification is not possible for this visual change, return `DONE_WITH_CONCERNS`, not `DONE`.
- For browser or in-game verification, use `docs/IN_GAME_TESTING.md` as the playbook. If you discover a faster or more reliable navigation/testing path, update that guide in your worker branch/worktree and report the section changed. If the file is missing in your isolated branch, create it from the coordinator guide before adding your finding.

Issue:
Musicity play button should spawn flanking apartments.

Goal:
When Musicity's `chord` ability fires, two smaller voxel apartment meshes should appear to the left and right of the main sprite, matching the existing Musicity proportions and palette. They should animate or react briefly with the ability, then be cleaned up.

Branch/worktree:
Work from clean HEAD `e5f3e3e368a4c96d65c325ee6955292370336e18` on an isolated branch named `agent/issue-5-musicity-flanking-apartments`.

Likely files:
- `src/projects/catalog/musicity/build.js`
- `src/projects/catalog/musicity/proportions.js`
- `src/projects/abilities/chord.js`

Constraints:
- Preserve the existing idle palette cycle behavior.
- Do not clobber material state restored by `chord.js`.
- Dispose all geometries/materials created for temporary flanking apartments.
- Keep the ability bounded in duration.

Verification:
- Run `node --check src/projects/abilities/chord.js`.
- Run `node --check src/projects/catalog/musicity/build.js` if edited.
- If runtime testing is possible, follow `docs/IN_GAME_TESTING.md`, serve with the guide's current server command, and verify the Musicity ability visually.

Return:
- Status: DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.
- Branch/worktree path.
- Files changed.
- Verification commands and exit codes.
- Summary of implementation.
- Remaining risks.
```

- [ ] **Step 3: Dispatch Worker #8, Clear All hang**

Use a fresh isolated worker with this prompt:

```markdown
You are implementing GitHub issue #8 in repo `rexheng/rexhengweb`.

Shared safety rules:
- Work only in your isolated worker branch/worktree. Do not edit the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.
- Do not commit, merge, cherry-pick, push, create a PR, close an issue, or change GitHub issue state.
- Before coding, run `git status --short --branch` and verify the worker checkout is clean.
- Refresh the issue with `gh issue view 8 --json number,title,body,comments,url` before implementation.
- Keep changes narrowly scoped to the issue files listed in this prompt.
- If runtime reproduction is not possible, return `DONE_WITH_CONCERNS`, not `DONE`.
- For browser or in-game verification, use `docs/IN_GAME_TESTING.md` as the playbook. If you discover a faster or more reliable navigation/testing path, update that guide in your worker branch/worktree and report the section changed. If the file is missing in your isolated branch, create it from the coordinator guide before adding your finding.

Issue:
Clear All button bug plus post-spawn hang.

Goal:
Investigate and fix Clear All failing to remove spawned project objects and any obvious post-spawn retained resources. Focus on lifecycle cleanup and stale interaction state.

Branch/worktree:
Work from clean HEAD `e5f3e3e368a4c96d65c325ee6955292370336e18` on an isolated branch named `agent/issue-8-clear-all-hang`.

Likely files:
- `src/projects/system.js`
- `src/main.js`
- `src/grabber.js`
- Optional tests if there are existing `.test.mjs` patterns to reuse.

Known context:
The coordinator checkout has dirty local changes in `src/projects/system.js`, `src/main.js`, `assets/scenes/humanoid.xml`, and slot parking files. Do not read those dirty edits as required behavior. Work from clean HEAD and keep your patch focused.

Root-cause hints:
- `clearAll()` may not rebuild the app's grabbables list after parking project meshes.
- `_park()` must cancel active abilities and dispose/remove scratch meshes.
- Removed meshes must not remain in raycast targets.

Constraints:
- Do not redesign project spawning.
- Do not change catalog defs.
- If adding tests, keep them deterministic and independent of browser rendering.

Verification:
- Run `node --test src/projects/**/*.test.mjs` if tests exist and can run from the worktree.
- Run `node --check src/projects/system.js`.
- If runtime testing is possible, follow `docs/IN_GAME_TESTING.md`, spawn 10+ projects, press Clear All, and verify no project meshes remain interactive.

Return:
- Status: DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.
- Branch/worktree path.
- Files changed.
- Verification commands and exit codes.
- Summary of implementation.
- Remaining risks.
```

- [ ] **Step 4: Dispatch Worker #9, Simulacra bees**

Use a fresh isolated worker with this prompt:

```markdown
You are implementing GitHub issue #9 in repo `rexheng/rexhengweb`.

Shared safety rules:
- Work only in your isolated worker branch/worktree. Do not edit the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.
- Do not commit, merge, cherry-pick, push, create a PR, close an issue, or change GitHub issue state.
- Before coding, run `git status --short --branch` and verify the worker checkout is clean.
- Refresh the issue with `gh issue view 9 --json number,title,body,comments,url` before implementation.
- Keep changes narrowly scoped to the issue files listed in this prompt.
- If runtime visual verification is not possible for this visual change, return `DONE_WITH_CONCERNS`, not `DONE`.
- For browser or in-game verification, use `docs/IN_GAME_TESTING.md` as the playbook. If you discover a faster or more reliable navigation/testing path, update that guide in your worker branch/worktree and report the section changed. If the file is missing in your isolated branch, create it from the coordinator guide before adding your finding.

Issue:
Simulacra swarm sprite redesign: bees instead of dots.

Goal:
Replace the generic Simulacra satellite dots with low-poly bee primitives and update the swarm movement language to feel buzzy/figure-eight while keeping the central hub.

Branch/worktree:
Work from clean HEAD `e5f3e3e368a4c96d65c325ee6955292370336e18` on an isolated branch named `agent/issue-9-simulacra-bees`.

Likely files:
- `src/projects/catalog/simulacra/build.js`
- `src/projects/catalog/simulacra/proportions.js`
- `src/projects/abilities/swarm.js`
- Optional: `src/projects/builders/primitives.js`

Constraints:
- Preserve names or metadata needed by `swarm.js` to find swarm children.
- Keep geometry low-poly and lightweight.
- Dispose temporary ability resources if any are introduced.
- Do not affect other catalog sprites.

Verification:
- Run `node --check src/projects/catalog/simulacra/build.js`.
- Run `node --check src/projects/abilities/swarm.js`.
- If runtime testing is possible, follow `docs/IN_GAME_TESTING.md`, serve with the guide's current server command, and verify Simulacra spawn plus ability visually.

Return:
- Status: DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.
- Branch/worktree path.
- Files changed.
- Verification commands and exit codes.
- Summary of implementation.
- Remaining risks.
```

- [ ] **Step 5: Dispatch Worker #7, Peter auto-rotate only**

Use a fresh isolated worker with this prompt:

```markdown
You are implementing the remaining portion of GitHub issue #7 in repo `rexheng/rexhengweb`.

Shared safety rules:
- Work only in your isolated worker branch/worktree. Do not edit the coordinator checkout at `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`.
- Do not commit, merge, cherry-pick, push, create a PR, close an issue, or change GitHub issue state.
- Before coding, run `git status --short --branch` and verify the worker checkout is clean.
- Refresh the issue with `gh issue view 7 --json number,title,body,comments,url` before implementation.
- Keep changes narrowly scoped to the issue files listed in this prompt.
- If runtime visual verification is not possible for this visual change, return `DONE_WITH_CONCERNS`, not `DONE`.
- For browser or in-game verification, use `docs/IN_GAME_TESTING.md` as the playbook. If you discover a faster or more reliable navigation/testing path, update that guide in your worker branch/worktree and report the section changed. If the file is missing in your isolated branch, create it from the coordinator guide before adding your finding.

Issue:
NUS Peter auto-rotate clothing plus expand persona list.

Known status:
Commit `aad680f` already references #7 and appears to have removed Cambridge Peter and added McKinsey plus Consulting. Treat persona list expansion as likely done unless code says otherwise. Focus on remaining auto-rotate behavior.

Goal:
Peter Network should slowly auto-rotate through personas/clothing by default. Triggering the `cycle` ability should still work and should bump or accelerate the cycle without breaking the slow loop.

Branch/worktree:
Work from clean HEAD `e5f3e3e368a4c96d65c325ee6955292370336e18` on an isolated branch named `agent/issue-7-peter-auto-rotate`.

Likely files:
- `src/projects/catalog/peter-network/index.js`
- `src/projects/catalog/peter-network/build.js`
- `src/projects/catalog/peter-network/proportions.js`
- `src/projects/abilities/cycle.js`

Constraints:
- Do not re-add Cambridge Peter.
- Preserve existing manual `Cycle` ability.
- Avoid global lifecycle changes in `src/projects/system.js` unless necessary.
- If using `onSpawn`, ensure any returned tick/cancel behavior matches existing project system conventions.

Verification:
- Run `node --check src/projects/catalog/peter-network/index.js`.
- Run `node --check src/projects/abilities/cycle.js`.
- If runtime testing is possible, follow `docs/IN_GAME_TESTING.md`, verify Peter rotates slowly without clicking and responds when ability fires.

Return:
- Status: DONE, DONE_WITH_CONCERNS, BLOCKED, or NEEDS_CONTEXT.
- Branch/worktree path.
- Files changed.
- Verification commands and exit codes.
- Summary of implementation.
- Remaining risks.
```

---

## Task 3: Review Worker Outputs

**Files:**
- Read worker diffs and verification output.
- Do not integrate into coordinator checkout until each review passes.

- [ ] **Step 1: Check worker status reports**

For each worker, require:

```text
Status:
Branch/worktree:
Files changed:
Verification:
Summary:
Risks:
```

If a worker returns `BLOCKED` or `NEEDS_CONTEXT`, do not integrate. Re-prompt only with the missing context.

- [ ] **Step 2: Inspect worker diff**

Run in each worker branch/worktree:

```powershell
git status --short --branch
git diff --stat e5f3e3e368a4c96d65c325ee6955292370336e18...HEAD
git diff e5f3e3e368a4c96d65c325ee6955292370336e18...HEAD
git diff --stat
git diff
```

Expected:

- Files changed match the issue scope.
- No unrelated formatting churn.
- No edits to secrets or environment files.

- [ ] **Step 3: Request code review for each substantive worker**

Use a fresh reviewer prompt with the exact issue section copied from Task 2. For example, Worker `#4` gets this prompt:

```markdown
Review GitHub issue #4 implementation in `rexheng/rexhengweb`.

Requirements:
- Issue: ClearPath route should be a dotted-line trail, not a single particle.
- Goal: Replace or extend the current ClearPath `dispatch` ability so firing "Route!" shows a dotted/dashed route from the ClearPath sprite to the humanoid centroid.
- Constraints: avoid unrelated refactors, dispose scratch meshes/materials, keep the ability bounded, and avoid `src/projects/system.js` unless required.

Diff:
Review the current worker branch diff against `e5f3e3e368a4c96d65c325ee6955292370336e18`.

Focus:
- Correctness and runtime bugs
- Resource cleanup/disposal
- Scope control
- Regression risk
- Whether verification is sufficient

Return findings first, ordered by severity. If no issues, say so and name residual test gaps.
```

For workers `#5`, `#8`, `#9`, and `#7`, replace the issue number, requirements, goal, and constraints with the corresponding Worker prompt from Task 2 before dispatching review.

---

## Task 4: Integration Decision

**Files:**
- Coordinator checkout stays dirty.
- Integration must happen only after review and verification.

- [ ] **Step 1: Classify each worker output**

Use this classification:

```text
READY_TO_INTEGRATE: Review clean, verification run, low conflict risk.
NEEDS_FIX: Review found Critical or Important issue.
DEFER: Conflicts with dirty coordinator work or depends on deferred UI/stab work.
BLOCKED: Worker could not complete.
```

- [ ] **Step 2: Do not merge automatically**

Because the coordinator checkout contains user/in-flight edits, do not run merge, cherry-pick, push, PR creation, or issue closure without explicit user instruction.

Prepare a final report with:

- issue number
- worker status
- branch/worktree path
- verification evidence
- review result
- integration recommendation

---

## Deferred Plan

These issues are intentionally not in Wave 1:

- `#2` Amogus stab/launch: blocked by existing dirty stab work in the coordinator checkout.
- `#3` Tutorial overlay: should follow `#10` so tutorial targets the final UI layout.
- `#6` Outreach London silhouette: larger visual/data task requiring a focused design pass.
- `#10` Controls/Projects split: structural UI task overlapping dirty `src/main.js` and `src/ui.js`.
- `#11` Visible attribution: likely already done in runtime UI; verify and close later if desired.

---

## Completion Criteria

The overnight run is successful if:

- The spec and plan are present in `docs/superpowers`.
- Wave 1 workers have been launched from isolated branches/worktrees.
- Each completed worker has a status report, diff, verification evidence, and review result.
- No dirty coordinator checkout files are overwritten.
- No issue is closed, pushed, merged, or PR-created without explicit user instruction.
