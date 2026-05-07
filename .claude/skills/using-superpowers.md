---
name: using-superpowers
description: Use to understand how to invoke superpowers skills and what priority they have over default behaviors
---

# Using Superpowers

## Overview

Invoke relevant skills BEFORE any response or action — even if there's only a 1% chance a skill applies.

## Priority Hierarchy

```
1. User's explicit instructions     (highest — always followed)
2. Superpowers skills               (override default behaviors)
3. Default system prompt            (lowest)
```

## Core Rule

**Invoke relevant or requested skills BEFORE any response or action.**

Check process skills first (brainstorming, debugging), then implementation skills (design, building).

## How to Invoke Skills

Skills are invoked via the `Skill` tool in Claude Code:

```
Skill({ skill: "skill-name" })
```

## Skill Types

| Type | Examples | How to follow |
|------|----------|---------------|
| **Rigid** | test-driven-development, verification-before-completion, systematic-debugging | Follow exactly — no adaptation |
| **Flexible** | brainstorming, writing-plans | Use as framework — adapt to context |

## Red Flag Thoughts — Stop and Check Skills

These thoughts are excuses to skip skill checks:

- "This is just a simple question"
- "I need more context first"
- "Skills don't apply here"
- "I'll check skills after I start"
- "The user didn't mention skills"

**When you think any of these: stop and check skills first.**

## Available Skills

| Skill | When to invoke |
|-------|----------------|
| `brainstorming` | Starting any new project or feature |
| `writing-plans` | After design approval, before implementation |
| `executing-plans` | Executing an existing plan inline |
| `subagent-driven-development` | Executing a plan with subagents |
| `test-driven-development` | Before writing any production code |
| `systematic-debugging` | When facing any bug or unexpected behavior |
| `verification-before-completion` | Before any completion or success claim |
| `using-git-worktrees` | Before starting isolated feature work |
| `dispatching-parallel-agents` | When 2+ independent tasks exist |
| `requesting-code-review` | After completing tasks or features |
| `receiving-code-review` | When processing review feedback |
| `finishing-a-development-branch` | When implementation is complete |
| `writing-skills` | When creating or editing skills |
