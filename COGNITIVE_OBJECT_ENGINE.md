# Cognitive Object Engine

## Product decision

The Cognitive Object Engine replaces the Decision Object as the universal data foundation for Manumation.

A Decision Object still exists, but it becomes one type of Cognitive Object.

This matters because Manumation is not only about decisions. It is about how a company thinks, learns, remembers, communicates, builds, sells, and improves.

## Core idea

A Cognitive Object is any meaningful unit of organizational intelligence that should be captured, processed, related, governed, and learned from.

Examples:

- Decision
- Research
- Meeting
- Conversation
- Email
- Proposal
- Strategy
- Issue
- Task
- Playbook
- Lesson
- Memory
- Client Insight
- Architecture Choice
- Sales Call
- Support Case

Chats are too loose.

Tasks are too narrow.

Documents are too static.

Cognitive Objects are the middle layer.

## Why this is the right abstraction

A business does not only need to know what was said.

It needs to know:

- What mattered?
- What type of thinking was happening?
- What context supported it?
- What confidence did we have?
- What was related to it?
- What action came from it?
- What outcome happened?
- What should we remember next time?

That is why Cognitive Objects are the engine beneath the Intelligence Layer.

## Relationship to existing foundation

| Previous concept | New role |
|---|---|
| Decision Object | Type of Cognitive Object |
| Memory Record | Type of Cognitive Object or linked context |
| Loop Run | Processing history attached to a Cognitive Object |
| Approval | Governance state attached to a Cognitive Object |
| Outcome | Learning state attached to a Cognitive Object |
| Agent Run | Processing activity attached to a Cognitive Object |

## Core architecture

```text
Human / System Event
  ↓
Cognitive Object Intake
  ↓
Classification
  ↓
Context Retrieval
  ↓
Manumation Evolution Loop
  ↓
Governance Evaluation
  ↓
Recommendation / Action / Storage
  ↓
Outcome Learning
  ↓
Relationship Graph Update
```

## Cognitive Object types

MVP types should be limited. Do not build a taxonomy museum. Humans will wander in and never return.

### MVP types

1. `decision`
2. `research`
3. `meeting`
4. `proposal`
5. `issue`
6. `lesson`
7. `memory`

### Phase 2 types

1. `email`
2. `conversation`
3. `sales_call`
4. `support_case`
5. `playbook`
6. `workflow`
7. `architecture`
8. `client_insight`

## Required fields

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `id` | string | yes | Unique object ID. |
| `tenant_id` | string | yes | Tenant / Clerk Organization scope. |
| `project_id` | string | no | Optional project grouping. |
| `created_by_user_id` | string | yes | Clerk user ID or system actor. |
| `object_type` | enum | yes | decision, research, meeting, proposal, issue, lesson, memory. |
| `title` | string | yes | Human-readable title. |
| `summary` | text | no | Short summary. |
| `body` | text | no | Full source or content. |
| `status` | enum | yes | draft, active, analyzing, approval_required, approved, executed, archived. |
| `source` | enum | yes | manual, chat, upload, email, meeting, api, system. |
| `risk_level` | enum | yes | low, medium, high, critical. |
| `confidence_score` | integer | no | 0-100. |
| `tags` | string[] | no | Search and grouping tags. |
| `metadata` | jsonb | no | Type-specific structured data. |
| `created_at` | timestamp | yes | Created timestamp. |
| `updated_at` | timestamp | yes | Updated timestamp. |

## Supporting tables

### Cognitive Object Relationships

Relationships allow the system to build a knowledge graph.

Examples:

- This proposal came from this meeting.
- This decision used this research.
- This issue created this lesson.
- This sales call references this client insight.
- This architecture decision affects this workflow.

Relationship fields:

| Field | Purpose |
|---|---|
| `id` | Unique relationship ID. |
| `tenant_id` | Tenant boundary. |
| `from_object_id` | Source object. |
| `to_object_id` | Target object. |
| `relationship_type` | supports, contradicts, caused_by, resulted_in, references, supersedes, duplicates, depends_on. |
| `strength` | 0-100 confidence in relationship. |
| `created_by` | user, agent, or system. |

### Cognitive Object Loop Runs

Stores each time the Evolution Loop processes an object.

Fields:

- `id`
- `tenant_id`
- `object_id`
- `loop_version`
- `intent_summary`
- `hidden_goal`
- `context_summary`
- `assumptions`
- `options_considered`
- `critique`
- `risks`
- `recommendation`
- `confidence_score`
- `release_score`
- `created_at`

### Cognitive Object Approvals

Stores governance decisions.

Fields:

- `id`
- `tenant_id`
- `object_id`
- `approval_status`
- `approval_reason`
- `requested_by_user_id`
- `approved_by_user_id`
- `approved_at`
- `rejected_at`
- `notes`

### Cognitive Object Outcomes

Stores what happened after action.

Fields:

- `id`
- `tenant_id`
- `object_id`
- `outcome_summary`
- `success_score`
- `lesson_learned`
- `follow_up_required`
- `created_at`

## Type-specific metadata examples

### Decision

```json
{
  "decision_category": "product_architecture",
  "final_choice": "Railway + Clerk + Drizzle",
  "alternatives_rejected": ["AWS", "Supabase-only"]
}
```

### Meeting

```json
{
  "meeting_date": "2026-06-29",
  "participants": ["Jeremy", "Team"],
  "transcript_source": "manual_paste",
  "action_items": []
}
```

### Research

```json
{
  "research_question": "What is the best MVP data model?",
  "sources": [],
  "open_questions": []
}
```

### Issue

```json
{
  "severity": "medium",
  "affected_area": "governance_engine",
  "reproduction_steps": []
}
```

## Governance rules

Every Cognitive Object must be evaluated for risk and confidence.

Approval is required when:

- risk is high or critical
- confidence is below tenant threshold
- the object triggers an external action
- the object modifies client data
- the object involves money, legal, medical, compliance, security, or deletion
- the retrieved context contains contradictions

## MVP scope

Build this first:

1. TypeScript types for Cognitive Objects
2. Zod schemas for validation
3. Drizzle schema draft
4. Governance helper for approval requirement
5. Basic relationship model
6. Tests for tenant isolation and approval logic
7. Documentation explaining how Decision Objects map into Cognitive Objects

Do not build embeddings yet.

Do not build agent orchestration yet.

Do not build every object type UI yet.

The MVP should prove that Cognitive Objects can become the universal intelligence record.

## Success criteria

The engine is successful when Donna can answer:

- What is this object?
- Why does it matter?
- What is it related to?
- What context supports it?
- What risks exist?
- How confident are we?
- Does a human need to approve it?
- What happened afterward?
- What should we remember for next time?
