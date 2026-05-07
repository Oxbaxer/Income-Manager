---
name: systematic-debugging
description: Use when facing a bug, test failure, or unexpected behavior — requires root cause investigation before any fix attempt
---

# Systematic Debugging

## Overview

Diagnose before fixing. Understanding root causes prevents symptom-chasing and wasted effort.

**Core principle:** NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST.

## The Iron Law

```
NO FIX WITHOUT A CONFIRMED ROOT CAUSE
```

If you haven't identified WHY the bug occurs, you cannot fix it correctly.

## Four-Phase Process

### Phase 1: Root Cause Investigation

1. Read the full error message carefully — don't skim
2. Reproduce the issue reliably before investigating
3. Examine recent changes (git log, git diff)
4. Trace data flow through system components
5. For multi-layered systems, add diagnostic instrumentation at each boundary to pinpoint exactly where failures occur

### Phase 2: Pattern Analysis

1. Find comparable working implementations in the codebase
2. Methodically compare differences against reference implementations
3. Read them completely — do not skim

### Phase 3: Hypothesis and Testing

1. Formulate a specific, falsifiable theory
2. Implement minimal change to test the hypothesis
3. Verify results before proceeding to next hypothesis

### Phase 4: Implementation

1. Write a failing test case first (reproduces the bug)
2. Apply a single fix addressing the root cause
3. Verify the test passes and no regressions introduced

## Critical Safety Threshold

```
If ≥ 3 fix attempts have failed: STOP and question the architecture.
```

Multiple failed fixes signal a fundamental design problem. Stop patching symptoms and discuss the architecture with your human partner.

## Red Flags — STOP Immediately

- Assuming without verification
- Proposing solutions before understanding the root cause
- Attempting additional fixes after previous attempts failed (≥ 3)
- Changing multiple things at once
- "It should work now" without running verification
- Skipping reproduction step

## Diagnostic Instrumentation Pattern

When the bug location is unclear, add temporary logging at system boundaries:

```typescript
// At each layer boundary:
console.log('[LayerName] input:', JSON.stringify(input));
const result = await processLayer(input);
console.log('[LayerName] output:', JSON.stringify(result));
```

Remove all diagnostic instrumentation before committing the fix.

## When Stuck

| Situation | Action |
|-----------|--------|
| Can't reproduce | Add logging, try different inputs, check environment |
| Root cause unclear | Add boundary instrumentation, compare with working case |
| Fix doesn't hold | Question the architecture, consult human partner |
| ≥ 3 failed fixes | STOP — architectural discussion required |
| Test is hard to write | The design may be too coupled — consider refactoring |
