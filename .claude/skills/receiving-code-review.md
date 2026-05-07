---
name: receiving-code-review
description: Use when receiving code review feedback — guides technically rigorous response that prioritizes verification over social performance
---

# Receiving Code Review

## Overview

Respond to code review with technical rigor. Verify before implementing. Ask before assuming.

**Core principle:** Technical correctness over social comfort.

## The Iron Rule

```
VERIFY BEFORE IMPLEMENTING.
ASK BEFORE ASSUMING.
```

## Forbidden Responses

Do NOT open with social performance phrases:
- ❌ "You're absolutely right!"
- ❌ "Great catch!"
- ❌ "Thanks for the feedback!"
- ❌ "Absolutely, I'll fix that right away!"

Instead: restate the technical requirement, or proceed directly to implementation.

## When Feedback Is Unclear — STOP

If ANY review item is unclear:

**STOP — do not implement anything yet.**

Even if you understand items 1, 2, 3, and 6 — if items 4 and 5 are unclear, clarify ALL unclear items before implementing ANY of them.

Partial implementation of a misunderstood spec creates cascading errors.

```
"Before implementing, I need clarification on:
- Item 4: [specific question]
- Item 5: [specific question]

Items 1, 2, 3, 6 are clear and I'm ready to implement those."
```

## Verification Protocol

For each review item:

1. **Understand** the specific technical concern
2. **Check** the code in question before responding
3. **Verify** whether the concern is valid
4. **Implement** the fix if valid
5. **Run tests** to confirm the fix works
6. **Report** result with evidence

## Handling External Reviewer Feedback

For reviewers without full project context, apply a verification checklist:

- Does this change break existing functionality?
- Does the reviewer understand the full context?
- Is this feature actually needed (YAGNI principle)?
- Is the reviewer's technical claim correct?

When something appears technically incorrect, push back with reasoning:

```
"I've checked [specific thing] and it works because [reason].
Evidence: [test output / code reference].
I'd recommend keeping the current approach because [rationale]."
```

## When You Were Wrong

State it factually and fix it:

```
"You were right — I checked [X] and it does [Y]."
[Proceed to fix]
```

No elaborate justification. No defensive language. Fix it.

## After Implementing Fixes

Run full verification before reporting completion. See `verification-before-completion`.

Actions demonstrate comprehension better than gratitude expressions.
