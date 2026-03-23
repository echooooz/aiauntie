# Electronic Auntie Engineering Plan

## 1. Goal

Build AiAuntie from a baby tracker into an "electronic maternity nanny" that can:

- answer factual questions from historical records accurately
- summarize recent trends from structured event data
- combine baby profile data with curated external knowledge to provide tailored guidance
- stay safe by separating facts, inference, and medical escalation

This document is the source of truth for product scope, architecture, and implementation constraints.

## 2. Product Positioning

AiAuntie is not just a logging tool. It should become a personalized caregiving assistant with three capability layers:

1. Fact retrieval
   Example: "When was the last poop?"
   Requirement: deterministic answer from structured records.

2. Trend synthesis
   Example: "How has my baby's intake been recently?"
   Requirement: aggregate recent records first, then let the model explain them.

3. Contextual guidance
   Example: "My baby is crying right now, what should I do?"
   Requirement: combine recent records, baby profile, rules, and curated knowledge. Never let the LLM freely invent medical advice.

## 3. Current App Assessment

Current strengths:

- already has structured event capture
- already has a timeline view and basic stats
- already has voice parsing through an LLM

Current gaps:

- records are stored in browser localStorage only
- no baby profile model
- no backend or query layer
- no memory/tool orchestration for question answering
- stats are computed by scanning all records in the UI
- no safety policy or escalation flow

## 4. Functional Requirements

### 4.1 Historical factual Q&A

The assistant must support:

- last event of a given type
- recent event list within a time range
- counts and intervals
- exact timestamps with local timezone formatting

Examples:

- "上一次粑粑是什么时候？"
- "最近一次亲喂是什么时候？"
- "今天换了几次尿布？"

Implementation rule:

- factual answers must come from structured queries, not free-form LLM recall

### 4.2 Real-time synthesis

The assistant must support:

- feeding summary over last 24h / 3d / 7d
- diaper summary over last 24h / 3d
- sleep summary over last 24h / 3d
- "what is likely going on now" using recent events and simple rule logic

Examples:

- "最近奶量怎么样？"
- "宝宝现在哭了，怎么办？"

Implementation rule:

- compute metrics first, then use the LLM only to narrate and prioritize

### 4.3 Profile-driven tailored advice

Store and use:

- birth date
- sex
- gestational age / preterm status
- current weight
- feeding mode
- allergy / restrictions

Examples:

- "这个月龄奶量正常吗？"
- "我家宝宝这个阶段多久吃一次算正常？"

Implementation rule:

- advice must cite the profile inputs and external guideline source used

## 5. Non-Functional Requirements

- mobile-first response time
- safe handling of sensitive baby data
- explainability: every answer should expose evidence
- graceful handling of missing or low-confidence data
- easy future extension to multiple babies and multiple caregivers

## 6. Safety Rules

The system must separate output into:

- facts
- inference
- suggested actions
- escalation warning

High-risk symptoms must trigger safety-first behavior:

- fever in young infants
- breathing difficulty
- poor feeding
- dehydration signs
- persistent inconsolable crying
- blood in stool / vomit
- lethargy

For these, the product should:

- stop pretending certainty
- advise urgent clinician review when appropriate
- clearly state that the app is not diagnosing

## 7. Architecture

### 7.1 High-level architecture

Frontend:

- React app for timeline, stats, manual entry, voice entry, and chat UI

Backend:

- API service for records, profile, metrics, and assistant orchestration

Data:

- relational storage for records and profile
- pre-aggregated daily metrics
- curated knowledge snippets with source metadata

AI:

- one model for extraction and language generation
- tools for deterministic querying
- rules engine for safety and heuristic ranking

### 7.2 Query pattern

Do not answer user questions by sending the entire history to the model.

Use this flow:

1. classify intent
2. call deterministic tools
3. optionally fetch curated knowledge
4. run safety checks
5. compose answer with evidence

### 7.3 Why SQL-first

This product's main memory is structured event history. That means:

- SQL/filtering should be the primary retrieval path
- vector retrieval is secondary and should be used mainly for knowledge documents or long-form notes

## 8. Data Model

### 8.1 Core tables

`baby_profiles`

- `id`
- `household_id`
- `name`
- `birth_date`
- `sex`
- `gestational_age_weeks`
- `is_preterm`
- `current_weight_kg`
- `feeding_mode`
- `allergies_json`
- `created_at`
- `updated_at`

`care_events`

- `id`
- `baby_id`
- `caregiver_id`
- `event_type`
- `event_subtype`
- `start_at`
- `end_at`
- `timestamp_ms`
- `day_key`
- `amount_ml`
- `side`
- `confidence`
- `source`
- `raw_input`
- `note`
- `metadata_json`
- `created_at`
- `updated_at`

`daily_metrics`

- `id`
- `baby_id`
- `day_key`
- `formula_ml`
- `breast_milk_ml`
- `nursing_minutes`
- `feeding_count`
- `pumping_ml`
- `pumping_count`
- `wet_diaper_count`
- `dirty_diaper_count`
- `mixed_diaper_count`
- `sleep_minutes`
- `last_recomputed_at`

`knowledge_documents`

- `id`
- `topic`
- `age_min_days`
- `age_max_days`
- `source_name`
- `source_url`
- `published_at`
- `reviewed_at`
- `content`
- `summary`
- `tags_json`

`assistant_conversations`

- `id`
- `baby_id`
- `question`
- `answer`
- `intent`
- `evidence_json`
- `risk_level`
- `created_at`

### 8.2 Event types to support

Keep current event types and add room for:

- crying
- temperature
- medication
- spit-up / vomiting
- tummy time
- bath
- doctor note
- weight

## 9. Assistant Tool Contract

The assistant layer should expose explicit tools like:

- `get_baby_profile(baby_id)`
- `get_latest_event(baby_id, event_type, subtype?)`
- `get_events(baby_id, from, to, filters)`
- `get_daily_metrics(baby_id, from_day, to_day)`
- `get_recent_context(baby_id, lookback_hours)`
- `get_guideline(topic, age_days, profile)`
- `run_safety_check(question, profile, recent_context)`

Rules:

- tools return structured JSON
- the LLM never directly queries raw storage
- timestamps returned by tools must be normalized
- answers must include evidence references

## 10. API Design

Suggested endpoints:

- `GET /api/babies/:babyId/profile`
- `PATCH /api/babies/:babyId/profile`
- `GET /api/babies/:babyId/events`
- `POST /api/babies/:babyId/events`
- `PATCH /api/events/:eventId`
- `DELETE /api/events/:eventId`
- `GET /api/babies/:babyId/metrics/daily`
- `POST /api/babies/:babyId/assistant/query`

Assistant response shape:

```json
{
  "intent": "fact_query",
  "answer": "最近一次粑粑是 3 月 21 日 14:20。",
  "facts": [
    { "label": "latest_dirty_diaper", "value": "2026-03-21T14:20:00+08:00" }
  ],
  "inference": [],
  "actions": [],
  "warnings": [],
  "evidence": [
    { "type": "care_event", "id": "evt_123" }
  ]
}
```

## 11. Performance Strategy

The current app slows down because it loads all records into memory, scans them repeatedly in the UI, and renders all timeline items at once.

Performance rules for the next version:

- do not use localStorage as the primary store for growing event history
- use IndexedDB for local-first MVP or a server database for multi-device sync
- query only needed ranges
- precompute daily metrics
- paginate or virtualize the timeline
- avoid repeated `Date` parsing and locale formatting in render loops

Database migration helps only if query patterns change as well. Moving storage alone is not enough.

## 12. Recommended Build Phases

### Phase 1: Data foundation

- introduce `baby_profile`
- introduce normalized event schema
- move storage to IndexedDB or backend DB
- add repository/query layer

Success criteria:

- can store 6+ months of events without startup lag
- can fetch events by date range

### Phase 2: Accurate factual Q&A

- build intent classifier
- implement latest-event and range-query tools
- add chat UI for factual questions

Success criteria:

- "上一次 xxx 是什么时候" answers are deterministic and evidence-backed

### Phase 3: Trend summaries

- compute and store daily metrics
- build summary APIs for 24h / 3d / 7d
- generate natural-language summaries from aggregated data

Success criteria:

- stats page no longer scans raw records on every render
- assistant can summarize recent intake and sleep quickly

### Phase 4: Contextual guidance

- add crying, temperature, spit-up, medication events
- add heuristic rules for hunger, sleepiness, diaper discomfort
- add risk scoring and escalation logic

Success criteria:

- current-state questions produce structured reasoning with safety warnings

### Phase 5: Curated knowledge layer

- whitelist sources
- store reviewed guideline snippets
- retrieve age-specific knowledge

Success criteria:

- profile-based advice includes source metadata

## 13. Recommended Tech Path

Near-term MVP:

- React + Vite frontend
- IndexedDB for storage
- local query/aggregation layer
- serverless API only for AI and curated knowledge

Scale-up path:

- Postgres
- ORM or SQL query layer
- background jobs to maintain `daily_metrics`
- authenticated multi-device sync

## 14. Open Decisions

Still needs product decisions on:

- single baby vs multi-baby support
- single caregiver vs family collaboration
- offline-first vs sync-first
- free vs premium assistant capabilities
- level of medical safety review before shipping advice

## 15. Definition of Done for New Assistant Features

Every new assistant feature must ship with:

- clear intent definition
- deterministic retrieval path
- safety behavior
- evidence payload
- latency target
- test cases for missing data and contradictory data

