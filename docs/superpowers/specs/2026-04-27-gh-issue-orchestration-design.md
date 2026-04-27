# GitHub Issue Orchestration Design

**Date:** 2026-04-27
**Repo:** `rexheng/rexhengweb`
**Coordinator checkout:** `C:\Users\Rex\Desktop\Work\Projects\rexhengweb`
**Baseline HEAD:** `e5f3e3e368a4c96d65c325ee6955292370336e18`

## Goal

Run an overnight GitHub-issue implementation pass with one orchestrator coordinating parallel issue workers. Each worker must operate from an isolated clean branch/worktree, produce a narrow change for one GitHub issue, verify it, and report enough evidence for the orchestrator to review without relying on chat memory.

## Current Repo State

The coordinator checkout is intentionally not used for implementation because it already contains local edits and untracked files:

- `assets/scenes/humanoid.xml`
- `scripts/regen-slots.mjs`
- `src/main.js`
- `src/projects/abilities/stab.js`
- `src/projects/abilities/stabPhysics.mjs`
- `src/projects/abilities/stabPhysics.test.mjs`
- `src/projects/system.js`
- `src/ui.js`
- `.cursor/rules/in-game-browser-testing.mdc`
- `docs/IN_GAME_TESTING.md`
- `src/projects/slotParking.mjs`
- `src/projects/slotParking.test.mjs`

Those files may represent in-flight user work. Workers must not modify this checkout directly.

## Issue Intake

Open GitHub issues pulled with `gh issue list --state open --limit 50`:

- `#11` Remove Bombardier S Stock attribution from visible UI
- `#10` Split Controls and Projects panels
- `#9` Simulacra swarm sprite redesign: bees instead of dots
- `#8` Clear All button bug plus post-spawn hang
- `#7` NUS Peter auto-rotate clothing plus persona list
- `#6` Outreach sprite should resemble London
- `#5` Musicity play button should spawn flanking apartments
- `#4` ClearPath route should be dotted-line trail
- `#3` Onboarding tutorial overlay
- `#2` Amogus stab/launch does not connect with humanoid

## Allocation Rules

1. One worker owns one issue.
2. Workers must use isolated branches or worktrees from clean `HEAD`, not the dirty coordinator checkout.
3. Workers must avoid unrelated refactors and keep diffs inside the issue's declared file scope.
4. Workers must run the smallest meaningful verification command for their change.
5. Workers must return: branch/worktree path, files changed, verification commands and exit codes, remaining risks, and whether the issue should be closed.
6. The orchestrator integrates only after reading diffs and requesting review. No merge, push, PR, or issue close happens without explicit user instruction.

## Wave 1

Wave 1 contains mostly independent project/catalog tasks:

- `#4` ClearPath dotted route
- `#5` Musicity flanking apartments
- `#8` Clear All bug investigation/fix
- `#9` Simulacra bees redesign
- `#7` remaining auto-rotate behavior only

`#8` overlaps with current dirty `src/projects/system.js` in the coordinator checkout, so the worker must isolate from clean `HEAD` and report conflicts clearly.

## Deferred or Verification-First Issues

- `#11`: likely already addressed in runtime UI by commit `044327a`; verify before changing.
- `#2`: current coordinator checkout already has uncommitted stab work; do not parallelize until that work is reviewed.
- `#10`: large structural UI task and overlaps dirty `src/ui.js` and `src/main.js`; do after Wave 1 or in a clean dedicated branch.
- `#3`: depends on final UI layout and should follow `#10`.
- `#6`: larger design/data task; can run later as a dedicated visual pass.

## Review Gates

For each worker output:

1. Inspect diff against its branch base.
2. Confirm the diff only touches issue-scoped files.
3. Confirm tests or targeted runtime checks were run.
4. Request code review for substantive changes.
5. Integrate only if the change does not conflict with the dirty coordinator work.

## Verification Baseline

This project has no bundler and is served statically. Useful checks:

- Unit-style module tests: `node --test src/projects/**/*.test.mjs`
- Static syntax smoke: `node --check <changed .js file>`
- Runtime smoke: `python -m http.server 8765`, then browser/manual verification
- GitHub issue refresh: `gh issue view <number> --json number,title,state,body,comments,url`

## Dynamic Testing Guide Updates

Workers that perform browser or in-game verification must use `docs/IN_GAME_TESTING.md` as the testing playbook. If a worker finds a faster or more reliable navigation path, it must update that guide in its worker branch/worktree and report the change. If the guide is missing from the isolated branch because it is not yet tracked at the worker baseline, the worker must create it from the current coordinator contents before adding its finding.

## Context Freshness

The durable source of truth for this run is this spec plus `docs/superpowers/plans/2026-04-27-gh-issue-orchestration.md`. Worker prompts must include all necessary context explicitly so a fresh agent can proceed without reading prior chat history.
