# Manumation Evolution System Spec

## Product definition

The Manumation Intelligence Layer is a multi-tenant SaaS platform that governs human-AI work across teams, clients, projects, tools, memory, and agent workflows.

It is not a chatbot.

It is not a prompt library.

It is not a generic automation platform.

It is a decision-quality system.

## North Star

Help humans and AI make better decisions together.

## Product architecture

```text
Human Team
  ↓
Donna Interface
  ↓
Governance Engine
  ↓
Manumation Evolution Loop
  ↓
Decision Object Engine
  ↓
Memory Engine
  ↓
Agent Router
  ↓
Tool / Workflow Connectors
  ↓
AI Model Providers
```

## Multi-tenant model

Each tenant represents one company, client, or internal team workspace.

In MVP, use Clerk Organizations as the tenant source of truth.

Each tenant has:

- Users
- Roles
- Projects
- Decision Objects
- Memory records
- Approval policies
- Confidence thresholds
- Agent settings
- Integrations

## Tenant-level settings

| Setting | Purpose |
|---|---|
| `default_confidence_threshold` | Minimum score before recommendation is considered usable. |
| `auto_execute_threshold` | Score required before low-risk actions can execute automatically. |
| `human_approval_required_above_risk` | Risk level requiring human approval. |
| `memory_retention_policy` | How long memory records are stored. |
| `allowed_ai_providers` | Which model vendors the tenant permits. |
| `default_model` | The default model for reasoning tasks. |
| `brand_voice_profile` | How the tenant communicates. |
| `risk_profile` | Conservative, balanced, or aggressive. |

## Core entities

1. Tenant
2. User
3. Project
4. Memory Record
5. Decision Object
6. Loop Run
7. Agent Run
8. Approval
9. Outcome
10. Integration

## MVP capability map

### 1. Auth and tenant membership

- Sign in with Clerk.
- Use Clerk Organizations for tenant selection.
- Store Clerk user ID and org ID in local database for relational joins.

### 2. Decision Object creation

Users can create a Decision Object from:

- Manual form
- Chat-style intake
- Meeting note paste
- Project note
- Future: email, Slack, CRM, call transcript

### 3. Evolution Loop run

Each Decision Object can run the structured loop:

1. Intent summary
2. Hidden goal
3. Context retrieved
4. Assumptions
5. Options
6. Critique
7. Risks
8. Recommendation
9. Confidence score
10. Approval requirement

### 4. Memory retrieval

MVP memory search should support:

- Decision history for the same tenant
- Project notes
- Prior outcomes
- Basic keyword search

Phase 2 can add embeddings and vector search.

### 5. Governance gate

The system must decide:

- Can it recommend only?
- Can it draft?
- Can it execute?
- Does it need approval?

Default MVP rule:

```text
If risk is high OR confidence is below threshold -> require human approval.
If action affects external communication, billing, legal, client data, or deletion -> require human approval.
```

### 6. Dashboard

Dashboard must show:

- Open decisions
- Waiting approvals
- Recent loop runs
- Confidence scores
- Risk levels
- Outcome status

## Non-goals for MVP

Do not build these first, because apparently we do not need to invite chaos to dinner.

- Full autonomous agent swarm
- Complex Slack/Gmail/CRM integrations
- Advanced vector memory UI
- Billing
- Client marketplace
- Voice interface
- Mobile app
- White-label client portals

## MVP success criteria

The MVP is successful when the internal team can use it to:

1. Create Decision Objects for real Manumation work.
2. Run the Manumation Evolution Loop.
3. Retrieve prior context.
4. Generate a recommendation with assumptions and confidence.
5. Require human approval before risky actions.
6. Store the outcome and lesson learned.
7. Find past decisions later.

## Phase plan

### Phase 1: Internal laboratory

Use Manumation team only.

Primary use cases:

- Product decisions
- Client strategy decisions
- Offer positioning
- GitHub build plans
- Sales call follow-ups
- Workflow architecture reviews

### Phase 2: Power-user beta

Invite 3-5 trusted companies.

Do not overbuild UI.

Measure whether Decision Objects actually improve quality, speed, and memory.

### Phase 3: Multi-tenant SaaS

Add:

- Tenant onboarding
- Plan limits
- Billing
- More integrations
- Role-based governance
- Agent marketplace

## Definition of done

A feature is done only when it:

- Is tenant-safe
- Has tests
- Has role/permission checks
- Handles failure states
- Avoids leaking secrets
- Preserves a useful audit trail
- Improves decision quality
- Can be explained to a fifth grader without lying
