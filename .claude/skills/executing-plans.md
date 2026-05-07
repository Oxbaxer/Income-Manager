---
name: executing-plans
description: Use when executing a previously written implementation plan inline in the current session — loads the plan, reviews it, then implements tasks sequentially with verification checkpoints
---

# Executing Plans

## Overview

Implement previously written plans across separate sessions with review checkpoints.

**Recommendation:** Use `subagent-driven-development` instead when subagent support is available — it produces significantly higher quality results.

## Process

### Step 1: Load and Review

1. Read the plan file in full
2. Conduct a critical review before execution begins:
   - Are there unclear instructions?
   - Are there unresolved dependencies?
   - Does the baseline test suite pass?
3. Surface concerns to the human partner before starting

### Step 2: Execute Tasks

For each task, follow this loop:

```
1. Mark task as IN PROGRESS
2. Follow TDD: write failing test → verify failure → implement → verify passing
3. Run verification steps from plan
4. Mark task as COMPLETED
5. Commit
6. Move to next task
```

**Stop immediately when:**
- A dependency is unresolved
- Tests fail unexpectedly
- Instructions are unclear
- An assumption proves wrong

Do not guess through blockers — surface them.

### Step 3: Complete Development

After all tasks verify successfully, transition to `finishing-a-development-branch`.

## Critical Safeguards

- **Never start on main/master** without explicit user consent — use `using-git-worktrees` first
- **Stop at blockers** — never guess or skip ahead
- **Verify before marking complete** — see `verification-before-completion`
- **One task at a time** — do not batch tasks

## Blocker Protocol

When encountering a blocker:

```
BLOCKED on Task N: <Task Name>

Issue: <specific problem>
Options:
  A) <option with trade-off>
  B) <option with trade-off>

Recommendation: <your recommendation>

Waiting for guidance before proceeding.
```
