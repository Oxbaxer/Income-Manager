---
name: subagent-driven-development
description: Use when executing an implementation plan with mostly independent tasks in the current session — dispatches fresh subagents per task with two-stage review
---

# Subagent-Driven Development

## Overview

Execute implementation plans by dispatching specialized subagents for each task with built-in quality checkpoints.

**Core principle:** Fresh subagent per task + two-stage review (spec compliance then code quality) = high quality, fast iteration.

## When to Use

Use this pattern when you have:
- A complete implementation plan
- Mostly independent tasks
- Intent to stay in the current session

## The Core Process

For each task in the plan:

```
1. Dispatch implementer subagent
   └─ Provide: full task context, files to touch, test to write, expected behavior

2. Address questions BEFORE implementation begins
   └─ Clarify ambiguities upfront — don't let implementer guess

3. Implementation, testing, and self-review by subagent
   └─ Subagent follows TDD, commits when done

4. Spec compliance review
   └─ Dispatch reviewer: "Does this implementation match the spec?"

5. Code quality review
   └─ Dispatch reviewer: "Is this implementation clean and maintainable?"

6. Fix and re-review loops
   └─ If either review fails: implementer fixes, BOTH reviews re-run

7. Mark complete → move to next task
```

**Do not pause to check in with your human partner between tasks** unless a blocker requires it.

## Model Selection Strategy

| Task Type | Model |
|-----------|-------|
| Isolated mechanical tasks (simple util, single function) | Haiku (fast, cheap) |
| Multi-file integration work | Sonnet (standard) |
| Architecture decisions, complex review | Opus (most capable) |

Match capability to complexity — don't use Opus for trivial tasks.

## Implementer Subagent Prompt Template

```
You are implementing Task N of M: <Task Name>

Context: <brief feature description>
Plan: <link or paste relevant task section>

Files to modify:
- <file>: <what to change>

Follow TDD strictly:
1. Write the failing test first
2. Run it and confirm it fails
3. Implement minimal code to pass
4. Run tests — confirm all pass
5. Commit: "<commit message from plan>"

Do not implement anything beyond what the task specifies.
```

## Reviewer Subagent Prompt Template

**Spec compliance:**
```
Review the following implementation against the spec.
Spec: <paste relevant requirements>
Implementation: <paste diff or files>

Answer: Does this implementation satisfy every requirement in the spec?
List any gaps or deviations. Be precise — cite line numbers.
```

**Code quality:**
```
Review this implementation for code quality.
Implementation: <paste diff or files>

Check: naming, complexity, duplication, error handling, test coverage.
List issues with severity (critical / important / minor).
```

## Red Flags

**Never:**
- Skip either review stage
- Proceed to next task with an unresolved critical issue
- Accept "close enough" on spec compliance
- Let implementer skip the TDD red-green cycle
- Trust implementer's self-report without running reviews

**Always:**
- Fix all critical and important issues before advancing
- Re-run both reviews after any fix
- Document skipped reviews as deliberate exceptions with rationale
