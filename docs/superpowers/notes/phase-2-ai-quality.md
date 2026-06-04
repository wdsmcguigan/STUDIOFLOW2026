# Phase 2 — AI Breakdown Quality Measurement

## What this is

A **measurement procedure**, not a quality gate. The AI breakdown engine
(`runBreakdown`) is scored against a hand-curated reference scene to produce
precision/recall/F1 metrics. These numbers are informational — the CI suite
never fails because of low scores. They exist so we can track model quality
over time and decide when to invest in prompt improvements.

## Scoring formula

| Metric    | Formula                                | Meaning                                    |
|-----------|----------------------------------------|--------------------------------------------|
| Precision | `tp / actualCount`                     | Of items the model tagged, how many were correct |
| Recall    | `tp / expectedCount`                   | Of expected items, how many did the model find   |
| F1        | `2 * P * R / (P + R)`                 | Harmonic mean — balances P and R                 |

Items are matched on `(kind, normalized-name)` — kind must match (`element`
vs `character`) and the name is lowercased + trimmed before comparison.
Duplicate items in either list are deduped via `Set` before scoring.

## Reference scene

**File:** `lib/breakdown/__fixtures__/reference-scene.ts`

```
INT. DINER - NIGHT

MARY (40s, tired) slides into a cracked vinyl booth. She sets a CHROME
REVOLVER on the formica table next to a half-empty COFFEE CUP. A NEON SIGN
buzzes outside. BOB, the cook, watches from the counter, wiping his hands on
a stained APRON.
```

**Expected items (ground truth) — 7 total:**

| kind      | name            |
|-----------|-----------------|
| character | MARY            |
| character | BOB             |
| element   | chrome revolver |
| element   | coffee cup      |
| element   | neon sign       |
| element   | apron           |
| element   | vinyl booth     |

## How to run the live measurement

1. Add your key to `.env.local`:
   ```
   GOOGLE_GENERATIVE_AI_API_KEY=your-key-here
   ```

2. Run only the quality test file:
   ```bash
   npx dotenv -e .env.local -- npm test -- lib/breakdown/ai/quality.test.ts
   ```

3. Look for the `[AI quality]` log line in the output — it prints the full
   `QualityScore` JSON object. Example output:
   ```json
   {
     "precision": 0.75,
     "recall": 0.71,
     "f1": 0.73,
     "truePositives": 5,
     "expectedCount": 7,
     "actualCount": 6
   }
   ```

4. Without the key the live test block is **skipped** (not failed). The
   pure-scorer unit tests always run and always pass.

## Results table

Fill this in each time you run the live measurement.

| Date       | Model                | Precision | Recall | F1   | Notes                     |
|------------|----------------------|-----------|--------|------|---------------------------|
| PENDING    | gemini-2.5-flash     | —         | —      | —    | Key not available in build env |

## Updating the ground truth

If the reference scene text changes, audit `REFERENCE_EXPECTED` and update
the hand-curated items. The items should reflect what a skilled script
supervisor would tag — not whatever the model happens to return.

## Implementation files

| File                                               | Role                                      |
|----------------------------------------------------|-------------------------------------------|
| `lib/breakdown/ai/quality.ts`                      | Pure `scoreBreakdown()` function          |
| `lib/breakdown/ai/quality.test.ts`                 | Unit tests + live measurement (gated)     |
| `lib/breakdown/__fixtures__/reference-scene.ts`    | Reference scene text + expected items     |
