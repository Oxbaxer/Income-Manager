---
name: writing-plans
description: Use after design is approved and before any implementation begins — creates a detailed, executable implementation plan
---

# Writing Plans

## Overview

Write comprehensive implementation plans assuming the engineer has zero context for the codebase.

**Core principle:** Plans must be so detailed that any engineer can execute them independently without asking questions.

## Plan Location

Save plans to:
```
docs/superpowers/plans/YYYY-MM-DD-<feature-name>.md
```

## Key Principles

### Granular Task Breakdown
Each task represents 2–5 minutes of work following TDD:
1. Write failing test
2. Verify failure (watch it fail)
3. Implement minimal code
4. Verify passing
5. Commit

### Complete Specificity
**Forbidden placeholders:**
- "TBD"
- "handle edge cases"
- "implement as needed"
- "similar to above"

Every code step includes actual implementation. Every command includes expected output.

### File Organization
> "Files that change together should live together. Split by responsibility, not by technical layer."

Plan focused, single-responsibility modules with clear boundaries.

## Plan Structure

```markdown
# Plan: <Feature Name>
**Date:** YYYY-MM-DD
**Estimated tasks:** N
**Execution method:** Subagent-driven / Inline

## Context
Brief description of what this plan implements and why.

## Prerequisites
- [ ] Design approved (link to design doc)
- [ ] Dependencies available
- [ ] Test baseline passing

## File Structure
List of files to create or modify with their responsibilities.

## Tasks

### Task 1: <Specific Task Name>
**Objective:** What this task accomplishes
**Files:** Which files are touched
**Test first:**
\`\`\`typescript
// Exact test code to write
\`\`\`
**Expected failure:** What the test output looks like when it fails
**Implementation:**
\`\`\`typescript
// Exact implementation code
\`\`\`
**Verification:**
\`\`\`bash
npm test path/to/test -- exact command with expected output
\`\`\`
**Commit message:** "feat: ..."

### Task 2: ...
```

## Execution Methods

**Option 1: Subagent-Driven** (recommended)
Fresh agent per task with two-stage review (spec compliance + code quality).
See `subagent-driven-development` skill.

**Option 2: Inline Execution**
Batch task completion in current session with checkpoints.
See `executing-plans` skill.

## Self-Review Checklist

Before handing off the plan:

- [ ] Every task has a test-first step
- [ ] No placeholders ("TBD", "handle edge cases")
- [ ] Every command has expected output
- [ ] Type consistency across all tasks
- [ ] Spec coverage: all design requirements mapped to tasks
- [ ] Commit strategy defined (one commit per task)
- [ ] Rollback path exists for each destructive operation
