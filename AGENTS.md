# AiAuntie Working Agreement

This file defines how future development work should be done in this repository.

## 1. Source of Truth

Before implementing assistant-related features, read:

- `docs/e-auntie-engineering-plan.md`

If a task conflicts with that plan, prefer the documented constraints unless explicitly overridden by the user.

## 2. Product Constraints

When building the "electronic maternity nanny" capability:

- never answer factual history questions by LLM memory alone
- always prefer structured retrieval over free-form prompting
- separate facts, inference, actions, and warnings in assistant responses
- treat medical or safety-sensitive outputs as high risk
- include evidence in user-facing answers whenever possible

## 3. Data and Architecture Constraints

- do not keep growing event history in `localStorage` as the long-term primary store
- design for baby profile + care events + daily metrics as separate concepts
- prefer SQL/query-based retrieval for event history
- use vector retrieval only for knowledge documents or long notes when needed
- avoid sending full raw history to the model

## 4. Performance Constraints

- avoid full-history scans in render paths
- avoid full-history synchronous reads on startup
- paginate or virtualize long timeline views
- precompute or cache daily metrics for stats
- minimize repeated date parsing and formatting in tight loops

## 5. Delivery Expectations

For substantial work, produce:

- a brief technical approach
- code aligned with the engineering plan
- verification notes
- any unresolved risk or follow-up item

## 6. Documentation Rule

If a change affects architecture, assistant behavior, safety policy, or storage design, update:

- `docs/e-auntie-engineering-plan.md`

