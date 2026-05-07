---
name: brainstorming
description: Use when starting any new project, feature, or significant change — requires design validation before any implementation begins
---

# Brainstorming

## Overview

All projects require design validation before implementation, regardless of perceived complexity.

**Core principle:** Design first. Code second. No exceptions.

**Hard gate:** Do NOT invoke any implementation skill, write any code, scaffold any project, or take any implementation action until you have presented a design and the user has approved it.

## Process Flow

Follow this sequence strictly:

1. **Explore** project context and assess scope
2. **Offer visual companion** if applicable (as a separate message)
3. **Ask clarifying questions** one at a time — never batch questions
4. **Propose 2–3 alternative approaches** with trade-offs
5. **Present design sections** with user approval gates after each
6. **Write design documentation**
7. **Self-review** for consistency and clarity
8. **Obtain user review** of written spec
9. **Transition** to implementation planning via `writing-plans` skill

## Design Principles

- **Isolation and clarity** — break systems into single-purpose units with well-defined interfaces
- **Incremental validation** — get approval after each design section, not after a monolithic spec
- **Ruthless YAGNI** — remove unnecessary features early; question every "we might need"
- **Follow existing patterns** — respect conventions already in the codebase

## Alternative Approaches Format

Present alternatives as:

```
### Option A: <Name>
**How it works:** ...
**Pros:** ...
**Cons:** ...
**Best when:** ...

### Option B: <Name>
...

### Recommendation
[Your recommendation with rationale]
```

## Design Documentation Structure

```
## Design: <Feature Name>

### Problem Statement
What problem are we solving and for whom?

### Constraints
Technical, time, or business constraints that shape the solution.

### Proposed Solution
[Chosen approach with rationale]

### Components
[What needs to be built, each with clear responsibility]

### Interfaces
[How components communicate]

### Out of Scope
[Explicitly what we are NOT building]

### Open Questions
[Anything still unresolved before implementation]
```

## Anti-Pattern: "This Is Too Simple To Need A Design"

Simple-looking projects often harbor unexamined assumptions that cause wasted effort. Even trivial projects require design documentation — length may be minimal, but the approval gate is mandatory.

## Red Flags — STOP

- Writing any code before design is approved
- Skipping the approval gate "because it's obvious"
- Batching multiple clarifying questions at once
- Presenting only one option (no alternatives)
- Starting implementation to "explore" without calling it exploration
