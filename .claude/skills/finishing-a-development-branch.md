---
name: finishing-a-development-branch
description: Use when implementation is complete, all tests pass, and you need to decide how to integrate the work - guides completion of development work by presenting structured options for merge, PR, or cleanup
---

# Finishing a Development Branch

## Overview

Guide completion of development work through a structured process.

**Flow:** Verify tests → Detect environment → Present options → Execute choice → Clean up.

## Step 1: Verify Tests

Run the project's test suite before proceeding. If tests fail, stop and fix them. Only continue if all tests pass.

## Step 2: Detect Environment

```bash
GIT_DIR=$(cd "$(git rev-parse --git-dir)" 2>/dev/null && pwd -P)
GIT_COMMON=$(cd "$(git rev-parse --git-common-dir)" 2>/dev/null && pwd -P)
```

This determines which menu to display and the cleanup approach.

## Step 3: Determine Base Branch

```bash
git merge-base --fork-point main HEAD || git merge-base --fork-point master HEAD
```

## Step 4: Present Options

**Normal repo or named-branch worktree:**
1. Merge back to base branch locally
2. Push and create a Pull Request
3. Keep the branch as-is
4. Discard this work (requires typed "discard" confirmation)

**Detached HEAD (externally managed):**
1. Push as new branch and create PR
2. Keep as-is
3. Discard this work (requires typed "discard" confirmation)

## Step 5: Execute Choice

### Option 1: Merge Locally
```bash
git checkout main
git merge --no-ff <branch>
# If worktree: cleanup after merge
```

### Option 2: Push + PR
```bash
git push -u origin <branch>
# Create PR via gh CLI or provide URL
```

### Option 3: Keep As-Is
No action. Report branch name and location to human partner.

### Option 4: Discard
**Require typed "discard" confirmation before proceeding.**
```bash
git checkout main
git branch -D <branch>
# If worktree: remove worktree
```

## Step 6: Cleanup Workspace

Only runs for merge or discard operations.

Cleanup worktree **only if** the worktree path is under:
- `.worktrees/`
- `worktrees/`
- `~/.config/superpowers/worktrees/`

Otherwise, **preserve the workspace** — it was not created by this tool.

```bash
# Remove worktree (only tool-managed paths)
git worktree remove <path>
git worktree prune
```

## Key Requirements

- Always verify tests before offering options
- Present exactly 4 options (3 for detached HEAD)
- Require typed "discard" confirmation — never auto-discard
- Never delete branches before removing worktrees
- Only cleanup worktrees created by this tool (provenance-based)
