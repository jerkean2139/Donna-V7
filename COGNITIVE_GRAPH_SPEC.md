# Cognitive Graph Specification

## Core decision

The Cognitive Graph is the relationship layer beneath the Manumation Intelligence Layer.

Cognitive Objects are the nodes.

Relationships are the edges.

The graph lets Donna and future agents reason across organizational knowledge instead of merely searching isolated chats, files, and tasks.

## Why this matters

Most AI products store:

- chat history
- documents
- embeddings
- tasks
- contacts

Those are useful, but they do not explain how the organization thinks.

The Cognitive Graph connects the important pieces:

- meetings that created proposals
- research that supported decisions
- issues that created lessons
- lessons that changed playbooks
- client insights that shaped campaigns
- contradictory evidence that reduced confidence
- approvals that allowed execution
- outcomes that proved or disproved assumptions

This is the difference between memory and intelligence.

## Plain-English example

A client meeting produces a proposal.

The proposal depends on research.

The research supports a pricing decision.

The decision creates a workflow.

The workflow causes an issue.

The issue produces a lesson learned.

The lesson updates the playbook.

That chain is organizational learning.

Without the graph, those pieces become scattered rubble. Delightful, if your goal is digital archaeology.

## Graph model

```text
Tenant
  ↓
Cognitive Object
  ↓
Relationships
  ↓
Loop Runs
  ↓
Approvals
  ↓
Outcomes
  ↓
Lessons
```

## Node types

MVP node types are the MVP Cognitive Object types:

1. `decision`
2. `research`
3. `meeting`
4. `proposal`
5. `issue`
6. `lesson`
7. `memory`

Future node types:

1. `email`
2. `conversation`
3. `sales_call`
4. `support_case`
5. `playbook`
6. `workflow`
7. `architecture`
8. `client_insight`
9. `agent_run`
10. `approval`
11. `outcome`

## Edge types

MVP relationship types:

| Type | Meaning |
|---|---|
| `supports` | Source object supports target object. |
| `contradicts` | Source object weakens or conflicts with target object. |
| `caused_by` | Source object was caused by target object. |
| `resulted_in` | Source object resulted in target object. |
| `references` | Source object references target object. |
| `supersedes` | Source object replaces target object. |
| `duplicates` | Source object duplicates target object. |
| `depends_on` | Source object depends on target object. |

Future relationship types:

| Type | Meaning |
|---|---|
| `clarifies` | Source object makes target easier to understand. |
| `blocked_by` | Source cannot proceed until target is resolved. |
| `derived_from` | Source was generated from target. |
| `approved_by` | Source was approved by target approval event. |
| `owned_by` | Source belongs to a user, team, project, or tenant. |
| `affects` | Source changes or impacts target. |
| `risk_for` | Source creates risk for target. |
| `lesson_for` | Source is a lesson applicable to target. |

## Edge strength

Every relationship has a strength score from 0-100.

Use strength to represent how confidently the system believes the relationship is meaningful.

Example:

- 100: human-created direct relationship
- 90: system-created from explicit source metadata
- 70: AI-inferred with strong textual evidence
- 50: AI-inferred but uncertain
- below 50: do not use for recommendation unless marked exploratory

## Relationship sources

Relationships can be created by:

1. Human
2. System rule
3. AI inference
4. Integration metadata
5. Import process

Each relationship must store its source.

AI-inferred relationships must never be treated as equally trustworthy as human-confirmed relationships.

## Tenant isolation

Every node and edge must include `tenant_id`.

All graph traversal must be tenant-scoped.

A query must never traverse from one tenant into another tenant.

This applies to:

- direct database queries
- search
- vector retrieval
- agent context
- logs
- exports
- background jobs

The phrase “just this once” is how software becomes haunted.

## Traversal patterns

### Related context lookup

When processing a Cognitive Object, Donna should retrieve:

1. Directly linked objects
2. Strong supporting objects
3. Strong contradicting objects
4. Recent objects from the same project
5. Lessons linked to similar object types
6. Outcomes from related past decisions

### Decision support lookup

For a decision object, retrieve:

- supporting research
- contradictory evidence
- prior similar decisions
- outcomes from those decisions
- relevant lessons
- required approval policies

### Proposal lookup

For a proposal object, retrieve:

- originating meeting
- client insights
- scope assumptions
- pricing decisions
- similar past proposals
- outcome data

### Issue lookup

For an issue object, retrieve:

- affected workflow
- related decisions
- similar prior issues
- lessons learned
- unresolved dependencies

## PostgreSQL-first implementation

Do not introduce a graph database in MVP.

Use Postgres tables:

- `cognitive_objects`
- `cognitive_object_relationships`
- `cognitive_object_loop_runs`
- `cognitive_object_approvals`
- `cognitive_object_outcomes`

This keeps the MVP simpler and cheaper.

Graph database exploration can happen later if relationship traversal becomes too complex or slow.

Because yes, someday someone will suggest Neo4j in a meeting like they discovered electricity. We can survive that later.

## Vector search role

Vector search should supplement the graph, not replace it.

The graph tells Donna what is explicitly related.

Vector search finds what may be semantically similar.

Best retrieval order:

1. Tenant and permission scope
2. Explicit graph relationships
3. Project and recency filters
4. Keyword search
5. Vector similarity
6. AI reranking

## Donna traversal behavior

Donna should never blindly dump graph results into context.

Donna should:

1. Identify the object being worked on.
2. Determine the object type.
3. Select the retrieval strategy for that type.
4. Retrieve direct relationships first.
5. Retrieve supporting and contradicting evidence.
6. Retrieve lessons and outcomes.
7. Summarize what matters.
8. Pass only useful context into the Evolution Loop.

## Agent write-back rules

Agents may suggest relationships.

Agents may not silently create high-trust relationships without rules.

Suggested relationship workflow:

```text
Agent suggests relationship
  ↓
System assigns source = ai_inferred
  ↓
Strength score assigned
  ↓
If strength >= threshold, save as inferred
  ↓
If high impact, ask human to confirm
```

## MVP success criteria

The Cognitive Graph MVP succeeds when Donna can answer:

- What is this object connected to?
- What supports this recommendation?
- What contradicts it?
- What similar decision happened before?
- What was the outcome?
- What lesson should apply now?
- What relationship did the system infer?
- What relationship did a human confirm?

## Release rule

No recommendation is complete until Donna can explain the relevant graph context or admit that no useful context was found.
