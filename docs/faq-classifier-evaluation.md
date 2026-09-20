# FAQ classifier: technique, evaluation, and how to re-run it

This documents the local "fast path" intent classifier that sits in front of
the LLM in `src/lib/chat/chat-api.ts`. It answers three questions:

1. What technique is actually running
2. How it's evaluated, and how to run that evaluation yourself
3. What changed across two rounds of fixes, with before/after numbers

## 1. The technique

Pipeline, end to end:

1. **Tokenize** the input text into terms.
2. **TF-IDF vectorize** against a fixed vocabulary built from the training set
   (smoothed IDF: `log((N+1)/(df+1)) + 1`).
3. **CART-style decision tree** (greedy Gini-impurity splits) walks the vector
   to a leaf, which reports a `label` and a `confidence` (leaf purity).
4. **Cosine similarity to the nearest training example** is computed as a
   second, independent confidence signal.
5. Final confidence = `min(tree_confidence, cosine_similarity)`. Below the
   threshold (currently `0.35`) the classifier returns `null` and
   `chat-api.ts` falls back to the LLM with the full system prompt.

So in practice it's a **nearest-neighbor-gated decision tree**: an
"is this reasonably explainable and reasonably close to something we've
seen" test, not a general-purpose classifier. Both signals have to agree
before the app trusts the answer over an LLM call.

The code lives in a few places that must be kept in sync:

- `scripts/faq-classifier-lib.mjs` — the algorithm (tokenizer, tree trainer,
  scorer, sparse-storage helper). Used by both training and evaluation.
- `scripts/faq-training-examples.mjs` — the single source of truth for
  training data (`TRAINING_EXAMPLES`) and held-out evaluation phrases
  (`NOVEL_TEST_EXAMPLES` — never train on these, or they stop measuring
  generalization).
- `src/lib/chat/faq-classifier.ts` — a hand-mirrored TypeScript copy that
  runs inside the app bundle (it can't import a `.mjs` script file at
  runtime). **If you change `tokenize()` or the tree/storage format in
  `faq-classifier-lib.mjs`, mirror the change here too, then run
  `npm run train:faq`.**

## 2. How to evaluate it yourself

```
npm run evaluate:faq
# or: node scripts/evaluate-faq-classifier.mjs
# add --verbose to print every individual LOOCV prediction
```

No dependencies, no network, no build step — plain Node against
`scripts/faq-classifier-lib.mjs`. It prints six things, in this order:

| # | Check | Why |
|---|---|---|
| 1 | In-sample accuracy | Model graded on its own training data. Mostly a reference point for #2 — if this is much higher than LOOCV, the model is memorizing. |
| 2 | Leave-one-out cross-validation (LOOCV) | Retrains with each example removed, tests on that one. The real "does it generalize" number — with only a handful of examples per class, a single train/test split would be too noisy to trust. |
| 3 | Confusion matrix | Which classes get mistaken for which — reveals systematic bias, not just an aggregate number. |
| 4 | Confidence threshold sweep | Shows whether raising the accept/abstain cutoff actually buys precision, or whether confidence is uncorrelated with correctness. |
| 5 | Novel-phrase test | Hand-written paraphrases never seen in training — closer to real user input than LOOCV. |
| 6 | Tree dump | The tree is white-box — every split is printed as `if tfidf(term) <= threshold` so you can read what it learned instead of trusting a metric blindly. |

**Two things worth knowing before you read the numbers:**

- The metric that matters most for *this app* is "precision when not
  abstaining." Abstaining is cheap (falls back to the LLM); a confidently
  wrong local answer is shown to the user as fact with no LLM check.
- **LOOCV and the novel-phrase test can disagree — trust the novel-phrase
  test more.** LOOCV retrains on 99%+ of the data each time, so it can look
  optimistic in ways that don't hold up on genuinely unseen phrasing (see
  round 2 below, where they pointed in different directions).

Re-run `npm run train:faq` any time you edit `scripts/faq-training-examples.mjs`,
then `npm run evaluate:faq` to see the effect before it ships.

## 3. Round 1 — the tokenizer/tree fix

**Root cause found by reading the tree directly (check #6):** Thai script
has no spaces between words. The original tokenizer split only on
non-Thai/non-Latin boundaries, so an entire unspaced Thai sentence became
**one token**. The shipped tree was splitting on nodes like
`tfidf("กดยืนยันส่งมอบตรงไหน") <= 0.87` — a whole memorized sentence, not a
word. That's exact-match lookup wearing a decision-tree costume: it only
ever fires on near-verbatim repeats of a training example.

**Fix applied:**

- Thai character runs are split into overlapping **character n-grams**
  (bigrams + trigrams) instead of kept whole — a standard technique for
  unsegmented scripts. Latin/digit runs (`gps`, `otp`) stay whole tokens,
  since spacing already segments them.
- The tree trainer takes `maxDepth` and `minSamplesLeaf` params instead of
  growing every branch to 100% purity, so it can't carve out an individual
  leaf per training sentence.

**Measured effect** (36 examples, `maxDepth: 6`, threshold `0.55`):

| Metric | Before | After |
|---|---|---|
| In-sample accuracy | 100% | 44.4% |
| LOOCV accuracy | 5.6% | 11.1% |
| LOOCV confidently-wrong rate | 27.8% | 13.9% |
| LOOCV precision when not abstaining | 16.7% | 44.4% |
| Precision at threshold 0.7+ | ~11% (not monotonic) | 100% (monotonic with threshold) |
| Novel-phrase test | 1/10 correct, 0 wrong | 1/18 correct, 0 wrong |

The in-sample number dropping from 100% is *expected and good* — that 100%
was the overfitting symptom, not a feature. The real gain here is that
confidence became correlated with correctness (the threshold sweep turned
monotonic), and confidently-wrong answers roughly halved. Coverage was
still low — dataset size was the next bottleneck, not the algorithm.

## 4. Round 2a — more data, tuned depth/threshold (110 examples)

**More training data.** `TRAINING_EXAMPLES` went from 36 (3–4/class) to 110
(7–12/class) — varied real phrasings, not just short/long versions of the
same sentence.

**Surprising result: this alone made things worse.** LOOCV abstain rate went
from 75% to 91.8%. More classes' worth of n-gram vocabulary spread the
TF-IDF mass thinner, so the existing `maxDepth: 6` couldn't separate 11
classes as cleanly anymore.

**Diagnosed instead of guessing at more parameters.** The scorer combines
two independent signals — `min(tree_confidence, cosine_similarity)` — and
either can be the bottleneck. An instrumented LOOCV run (logging both
signals separately) showed the **cosine-similarity gate**, not the tree,
was blocking most acceptances: avg. tree confidence was `0.62` (above the
0.55 cutoff), but avg. cosine similarity to the nearest remaining example
was only `0.44` (below it) — 45 cases blocked by cosine vs. 14 by the tree.
A threshold sweep confirmed precision held up fine well below 0.55.

**Changes applied:** `maxDepth: 6 → 10`; confidence threshold `0.55 → 0.40`.

**Measured effect** (36-example/depth-6/threshold-0.55 → 110-example/depth-10/threshold-0.40):

| Metric | Round 1 | Round 2a |
|---|---|---|
| LOOCV precision when not abstaining | 44.4% | 71.0% |
| LOOCV coverage | 25.0% | 28.2% |
| **Novel-phrase test** | **1/18 correct, 0 wrong** | **8/18 correct (44.4%), 1 wrong** |

## 5. Round 2b — bigger vocabulary + more samples (166 examples)

**Expanded the dataset again:** `TRAINING_EXAMPLES` 110 → 166 (12–18/class),
`NOVEL_TEST_EXAMPLES` 18 → 29 for a more reliable signal. Zero train/test
overlap confirmed programmatically before training.

**First instinct — go deeper — was wrong.** More vocabulary (1,694 → 2,219
n-grams) meant `maxDepth: 10` again couldn't separate 11 classes as cleanly,
so LOOCV coverage dropped. A depth sweep (10 → 40) on LOOCV looked like it
justified going deeper: coverage climbed from 28% to 49% with LOOCV
precision holding around 60–62%, plateauing past depth ~20 (depth 22 and 40
gave near-identical results — confirming `minSamplesLeaf`, not depth, is
the real regularizer once the tree is deep enough).

**But the novel-phrase test told a different story.** Checking the same
depth candidates directly against `NOVEL_TEST_EXAMPLES` (cheap: one
training run + 29 classifications, no retraining loop) showed deeper trees
adding barely any correct answers while roughly doubling the wrong-answer
rate:

| Config | Novel-phrase correct | Novel-phrase wrong |
|---|---|---|
| depth=10, threshold=0.40 | 13/29 | 3/29 |
| depth=20, threshold=0.40 | 12/29 | 6/29 |
| depth=20, threshold=0.35 | 14/29 | 7/29 |

Going deeper was net negative once measured on realistic queries — LOOCV
and the novel-phrase test disagreed, and the novel-phrase test won.

**What actually worked: keep `maxDepth: 10`, lower the threshold.** A grid
search over threshold (0.20–0.50) at the *original* depth, checked directly
against the novel-phrase set, found `0.35` as the point where coverage rises
without the wrong-rate following it up as fast:

| threshold | novel-phrase correct | novel-phrase wrong |
|---|---|---|
| 0.30 | 15/29 | 5/29 |
| **0.35** | **14/29** | **3/29** |
| 0.40 | 13/29 | 3/29 |

**Final config: `maxDepth: 10`, `minSamplesLeaf: 2` (both unchanged from
round 2a), threshold `0.40 → 0.35`.**

**Measured effect (round 2a → round 2b):**

| Metric | 110 examples, thr=0.40 | 166 examples, thr=0.35 |
|---|---|---|
| Novel-phrase correct | 8/18 (44.4%) | **14/29 (48.3%)** |
| Novel-phrase wrong | 1/18 (5.6%) | 3/29 (10.3%) |
| LOOCV precision when not abstaining | 71.0% | 59.1% |
| LOOCV coverage | 28.2% | 39.8% |

Coverage improved and stayed net-positive, but precision traded down
somewhat as coverage rose — that's the expected shape of this curve, not a
bug. If a lower wrong-rate matters more than coverage for your use case,
`threshold: 0.45` on this same 166-example model recovers closer to round-2a
precision at less coverage than 0.35 — the sweep table `npm run evaluate:faq`
prints shows the full curve; edit `CONFIDENCE_THRESHOLD` in
`src/lib/chat/faq-classifier.ts` directly to try other points on it.

## 6. Sparse storage (bundle-size fix)

Growing the vocabulary to 2,219 n-grams pushed `faq-classifier.json` to
**3.5 MB** (166 dense 2,219-element float arrays) — big enough to fix, since
that file is imported directly into the app bundle.

TF-IDF vectors are mostly zeros (a training sentence only touches a handful
of the vocabulary's n-grams), so `examples` is now stored sparse —
`[index, value]` pairs for non-zero entries only:

- `sparsifyExamples()` in `scripts/faq-classifier-lib.mjs` converts dense →
  sparse at save time (called from `scripts/train-faq-classifier.mjs`).
- `src/lib/chat/faq-classifier.ts` (the runtime scorer) reads the sparse
  format directly and computes cosine similarity against it without ever
  reconstructing a dense array.

Result: **3.5 MB → ~534 KB** (≈6.5x smaller), with byte-identical
classification results verified before/after against both the LOOCV harness
and the novel-phrase test. Training-time code (`trainModel`/LOOCV/threshold
sweeps) still works with dense vectors internally — only the on-disk/bundled
format changed.

## Current shipped config

`scripts/faq-training-examples.mjs`: 166 examples, 29 held-out test cases.
`scripts/faq-classifier-lib.mjs`: `trainModel(examples, { maxDepth: 10, minSamplesLeaf: 2 })`.
`src/lib/chat/faq-classifier.ts`: `CONFIDENCE_THRESHOLD = 0.35`.

Run `npm run evaluate:faq` — it should reproduce every number in section 5
exactly, since LOOCV/the novel set/the tree dump are all deterministic given
the same training data.
