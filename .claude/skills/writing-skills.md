---
name: writing-skills
description: Use when creating new skills, editing existing skills, or verifying skills work before deployment
---

# Writing Skills

## Overview

**Writing skills IS Test-Driven Development applied to process documentation.**

Personal skills live in `~/.claude/skills` for Claude Code.

Write test cases (pressure scenarios with subagents), watch them fail (baseline behavior), write the skill (documentation), watch tests pass (agents comply), and refactor (close loopholes).

**Core principle:** If you didn't watch an agent fail without the skill, you don't know if the skill teaches the right thing.

## What is a Skill?

A **skill** is a reference guide for proven techniques, patterns, or tools.

**Skills are:** Reusable techniques, patterns, tools, reference guides.
**Skills are NOT:** Narratives about how you solved a problem once.

## The Iron Law

```
NO SKILL WITHOUT A FAILING TEST FIRST
```

This applies to NEW skills AND EDITS to existing skills. No exceptions.

## SKILL.md Frontmatter

```yaml
---
name: skill-name-with-hyphens
description: Use when [specific triggering conditions — NOT a workflow summary]
---
```

**Description rules:**
- Start with "Use when..."
- Describe triggering conditions ONLY — never summarize the skill's workflow
- Third person
- Under 500 characters

**Why no workflow summary in description:** When descriptions summarize workflow, Claude may follow the description instead of reading the skill body. The description is a trigger, not an instruction.

```yaml
# ❌ BAD: Summarizes workflow
description: Use when executing plans - dispatches subagent per task with code review between tasks

# ✅ GOOD: Triggering conditions only
description: Use when executing implementation plans with independent tasks in the current session
```

## Skill Structure

```markdown
---
name: skill-name
description: Use when [conditions]
---

# Skill Name

## Overview
Core principle in 1–2 sentences.

## When to Use
Bullets with symptoms and use cases. When NOT to use.

## Core Pattern
Before/after comparison or step-by-step.

## Quick Reference
Scannable table or bullets.

## Common Mistakes
What goes wrong + fixes.
```

## TDD Cycle for Skills

| TDD | Skill Creation |
|-----|----------------|
| Write failing test | Run pressure scenario WITHOUT skill |
| Watch it fail | Document exact rationalizations agent uses |
| Write minimal code | Write skill addressing those specific violations |
| Watch it pass | Verify agent now complies with skill |
| Refactor | Find new rationalizations → plug → re-verify |

## When to Create a Skill

**Create when:**
- Technique wasn't intuitively obvious
- Pattern applies broadly across projects
- Others would benefit

**Don't create for:**
- One-off solutions
- Standard well-documented practices
- Project-specific conventions (use CLAUDE.md instead)

## Bulletproofing Against Rationalization

For discipline-enforcing skills (TDD, verification, debugging):

1. **Close every loophole explicitly** — don't just state the rule, forbid specific workarounds
2. **Add "spirit vs letter" statement** early: "Violating the letter is violating the spirit."
3. **Build rationalization table** from baseline testing
4. **Create Red Flags list** for self-checking

## Skill Creation Checklist

**RED — Baseline Testing:**
- [ ] Run pressure scenarios WITHOUT skill
- [ ] Document exact failure patterns verbatim

**GREEN — Write Skill:**
- [ ] Name uses only letters, numbers, hyphens
- [ ] Description starts with "Use when..." (no workflow summary)
- [ ] Addresses specific baseline failures
- [ ] Run scenarios WITH skill — verify compliance

**REFACTOR — Close Loopholes:**
- [ ] Add counters for new rationalizations found
- [ ] Build rationalization table
- [ ] Re-test until bulletproof

**Deploy:**
- [ ] Commit to git
