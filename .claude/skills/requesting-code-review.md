---
name: requesting-code-review
description: Use after completing each task in subagent-driven development, before major merges, and after feature completion — dispatches a focused code review subagent
---

# Requesting Code Review

## Overview

Validate work through early and frequent review cycles to prevent issues from compounding.

**Core principle:** Review before proceeding, not after merging.

## When to Request Review

**Mandatory:**
- After each task in subagent-driven development
- Before merging to main/master
- After feature completion

**Recommended:**
- When you encounter unexpected obstacles
- Before substantial refactoring work
- When unsure about an architectural decision

## Review Request Format

Dispatch a reviewer subagent with exactly three pieces of information:

```
1. WHAT was built:
   [Brief description of implementation]

2. REQUIREMENTS it should satisfy:
   [Paste the relevant spec / task description / acceptance criteria]

3. COMMIT RANGE affected:
   [git range, e.g., abc123..HEAD, or specific files]
```

## Reviewer Subagent Prompt

```
You are a code reviewer. Your job is to assess whether the following implementation
is correct, complete, and of acceptable quality.

## What was built
<description>

## Requirements
<paste requirements>

## Changes to review
<git diff or file contents>

## Your output
Rate each finding as: Critical | Important | Minor

Critical: Must be fixed before proceeding
Important: Must be fixed before next phase
Minor: Can be addressed later

List findings precisely with file:line references.
If no issues: confirm "Implementation satisfies requirements."
```

## Issue Prioritization

| Severity | Meaning | Action |
|----------|---------|--------|
| **Critical** | Broken behavior, security issue, spec violation | Fix immediately before next task |
| **Important** | Quality issue, missing coverage, unclear intent | Fix before advancing to next phase |
| **Minor** | Style, naming, optional improvement | Document, address when convenient |

## Challenging Review Feedback

You may respectfully challenge reviewer feedback when you can demonstrate technical justification:

```
"I disagree with finding #N because [technical reason].
Evidence: [specific code reference or test result].
Recommend: [alternative approach or accept as-is]."
```

But: when the reviewer is right, acknowledge it directly:
```
"You were right — I checked [X] and it does [Y]."
Then fix it.
```
