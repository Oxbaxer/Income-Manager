---
name: dispatching-parallel-agents
description: Use when facing 2+ independent tasks that can be worked on without shared state or sequential dependencies
---

# Dispatching Parallel Agents

## Overview

Delegate independent tasks to multiple specialized agents working concurrently rather than sequentially.

**Core principle:** One agent per independent problem domain. Let them work concurrently.

## When to Use

**Use when:**
- 2+ tasks can be understood and solved independently
- Fixing one domain won't resolve another
- No shared state between investigations
- Multiple subsystems are broken independently

**Do NOT use when:**
- Related failures where one fix cascades to others
- Exploratory debugging requiring full system context
- Shared state where agents would interfere with each other
- You need results from one agent to inform another

## Decision Flowchart

```
Are there 2+ failing areas?
├─ No → Single agent or inline work
└─ Yes → Can they be understood independently?
          ├─ No → Single agent with full context
          └─ Yes → Are they in different problem domains?
                    ├─ No → Probably sequential
                    └─ Yes → DISPATCH PARALLEL AGENTS
```

## Agent Prompt Structure

Each parallel agent needs:

1. **Scope** — exactly which files/area to investigate (narrow, not broad)
2. **Context** — relevant background the agent needs (don't assume it has session context)
3. **Output format** — what you need back (findings, fix, PR, summary)
4. **Boundaries** — what NOT to touch

```
You are investigating [specific area].

Context: [relevant background]

Your task: [specific, bounded objective]

Files in scope: [explicit list]
Do NOT modify: [explicit exclusions]

Output: [exact format — diff, summary, fixed test, etc.]
```

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Scope too broad | Narrow to specific files or modules |
| Missing context | Include relevant error messages and recent changes |
| Vague output | Specify exact deliverable format |
| Overlapping scope | Ensure each agent has exclusive ownership of its domain |
| Assuming shared session | Each agent starts fresh — provide all needed context |

## Example: 6 Test Failures → 3 Parallel Agents

```
Test failures:
- auth/login.test.ts (2 failures) → Agent A: auth module
- api/payments.test.ts (2 failures) → Agent B: payments module
- ui/checkout.test.ts (2 failures) → Agent C: checkout UI

All three dispatched simultaneously.
Results merged after all three complete.
```

## Merging Results

After all agents complete:
1. Review each agent's output independently
2. Check for conflicts (unexpected overlaps in changes)
3. Run full test suite before merging any individual results
4. If conflicts exist, resolve manually — do not re-dispatch
