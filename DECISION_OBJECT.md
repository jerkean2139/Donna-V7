# Decision Object Spec

## Definition

A Decision Object is the atomic unit of the Manumation Intelligence Layer.

It is not a chat.

It is not a note.

It is a structured record of how a meaningful decision was understood, analyzed, approved, executed, and learned from.

## Why it matters

Chats disappear into the fog.

Documents go stale.

Tasks show what happened but rarely why.

Decision Objects preserve the reasoning behind important work.

## MVP fields

| Field | Type | Required | Purpose |
|---|---|---:|---|
| `id` | string | yes | Unique ID. |
| `tenant_id` | string | yes | Clerk org / tenant mapping. |
| `project_id` | string | no | Optional project grouping. |
| `created_by_user_id` | string | yes | Clerk user ID. |
| `title` | string | yes | Plain-English decision title. |
| `objective` | text | yes | What we are trying to accomplish. |
| `status` | enum | yes | draft, analyzing, approval_required, approved, executed, archived. |
| `risk_level` | enum | yes | low, medium, high, critical. |
| `confidence_score` | integer | no | 0-100. |
| `hidden_goal` | text | no | What the user likely really wants. |
| `context_summary` | text | no | Retrieved memory and project context summary. |
| `assumptions` | jsonb | no | Assumption register. |
| `options_considered` | jsonb | no | Multiple approaches. |
| `critique` | jsonb | no | Weaknesses and contradictions. |
| `recommendation` | text | no | Final recommendation. |
| `approval_required` | boolean | yes | Whether human approval is needed. |
| `approval_reason` | text | no | Why approval is needed. |
| `approved_by_user_id` | string | no | Human approver. |
| `executed_at` | timestamp | no | When action occurred. |
| `outcome_summary` | text | no | What happened after execution. |
| `lesson_learned` | text | no | What the system should remember. |
| `created_at` | timestamp | yes | Created timestamp. |
| `updated_at` | timestamp | yes | Updated timestamp. |

## Status flow

```text
draft
  ↓
analyzing
  ↓
approval_required OR approved
  ↓
executed
  ↓
archived
```

## Risk levels

| Risk | Meaning | Approval default |
|---|---|---|
| Low | Internal-only, reversible, low consequence. | Optional if confidence high. |
| Medium | Client-visible or operationally meaningful. | Recommended. |
| High | External communication, money, legal, data, brand reputation. | Required. |
| Critical | Compliance, security, health/safety, major contract, irreversible action. | Required plus second review. |

## Confidence scoring model

Confidence is not a feeling. Tiny mercy.

Score should consider:

- Quality of retrieved context
- Directness of evidence
- Missing information
- Contradictions
- Risk level
- Past similar decisions
- Tool reliability
- Human confirmation

## Decision Object JSON shape

```json
{
  "id": "dec_abc123",
  "tenant_id": "org_clerk123",
  "title": "Choose MVP deployment architecture",
  "objective": "Decide how to deploy the Manumation Intelligence Layer MVP.",
  "risk_level": "medium",
  "status": "approval_required",
  "confidence_score": 91,
  "hidden_goal": "Create a build path Codex can follow without overbuilding.",
  "assumptions": [
    {
      "text": "Railway will host the Next.js app and Postgres database.",
      "risk": "low",
      "needs_verification": false
    }
  ],
  "options_considered": [
    {
      "name": "Railway all-in-one",
      "pros": ["simple", "fast", "Postgres included"],
      "cons": ["less enterprise control than AWS"]
    }
  ],
  "recommendation": "Use Railway for MVP and revisit infrastructure after client beta.",
  "approval_required": true,
  "approval_reason": "Architecture choice affects deployment and cost.",
  "outcome_summary": null,
  "lesson_learned": null
}
```
