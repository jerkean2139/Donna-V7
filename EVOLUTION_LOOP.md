# Manumation Evolution Loop

The Manumation Evolution Loop is the quality-control system for every significant answer, decision, feature, workflow, and agent action.

The loop exists because AI should not merely produce confident answers. It should reduce the chance that humans become confidently wrong.

## Release threshold

Target score: **98/100**

A score is not based on vibes, mercifully. It is based on the rubric below.

| Category | Points |
|---|---:|
| Clear intent and problem framing | 10 |
| Correct use of memory/context | 10 |
| Assumption detection | 10 |
| Evidence quality | 10 |
| Alternative options considered | 10 |
| Contradiction / risk analysis | 10 |
| Human approval and governance logic | 10 |
| Simplicity and teaching clarity | 10 |
| Implementation usefulness | 10 |
| Future-proofing / model independence | 10 |

## Loop sequence

```text
1. Intake
   Capture the user's request or business event.

2. Intent Clarification
   Convert messy input into a clear problem statement.

3. Hidden Goal Detection
   Ask: what is the user actually trying to accomplish?

4. Context Retrieval
   Pull tenant, user, project, prior decisions, notes, files, and current workflow state.

5. Assumption Register
   List what we are assuming and mark each assumption as low, medium, or high risk.

6. Generate Approaches
   Produce at least 3 meaningfully different options when the stakes justify it.

7. Critic Pass
   Attack the options from multiple roles: operator, customer, engineer, lawyer, accountant, skeptic.

8. Verification Pass
   Check facts, constraints, permissions, tools, data availability, and security concerns.

9. Confidence Scoring
   Assign confidence based on evidence quality, contradiction level, and missing information.

10. Governance Gate
   Decide whether the system may act automatically or must ask for human approval.

11. Output Candidate
   Produce the recommendation, draft, code, task, or execution plan.

12. Release Review
   Score the output against the 98-point rubric.

13. Iterate
   If under 98, improve the weak categories and rerun the review.

14. Publish / Execute
   Release only after approval rules are satisfied.

15. Outcome Learning
   Store what happened so future decisions improve.
```

## Mandatory questions before release

Every important output must be able to answer:

1. What are we trying to accomplish?
2. What context did we retrieve?
3. What assumptions did we make?
4. What evidence supports this?
5. What evidence weakens this?
6. What could go wrong?
7. How confident are we?
8. Does a human need to approve this?
9. What will we learn after it runs?

## Legacy Loop

Before any major principle, architecture choice, or product direction becomes permanent, ask:

> Would this still be true if today’s AI models disappeared and were replaced by entirely new ones?

If yes, it belongs in philosophy.

If no, it belongs in implementation detail.
