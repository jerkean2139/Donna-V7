# Evolution Loop Engine

## Purpose

The Evolution Loop Engine is the quality-control layer for Cognitive Objects.

It turns a Cognitive Object from a stored record into a structured reasoning process.

## MVP behavior

For each Cognitive Object, the loop should capture:

- Intent clarity
- Context retrieved
- Assumptions listed
- Evidence considered
- Options generated
- Critique completed
- Governance checked
- Plain-English clarity
- Implementation readiness
- Legacy Loop / future-proofing

## Release scoring

The first implemented helper is `calculateReleaseScore`.

It scores ten criteria at ten points each.

A complete release candidate scores 100.

Anything below the release threshold should be improved before being treated as final.

## Current implementation

This slice adds:

- `src/lib/evolution-loop/scoring.ts`
- `tests/evolution-loop.scoring.test.ts`

## Next implementation target

Add loop run storage:

- Loop run repository interface
- In-memory loop run adapter
- Object-scoped loop history
- Start loop server action
- Loop summary panel on Cognitive Object detail page

## Why storage is separate

The scoring helper is model-independent.

Storage can later be backed by Drizzle, Postgres, or another persistence layer.

The engine should not care where the loop records live.
