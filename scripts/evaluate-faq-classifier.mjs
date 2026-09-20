// Local, offline evaluation harness for the FAQ intent classifier.
//
// Run it with:
//   npm run evaluate:faq
// or directly:
//   node scripts/evaluate-faq-classifier.mjs
//
// No network access or dependencies needed — everything here is plain
// Node.js against the same algorithm in faq-classifier-lib.mjs that builds
// the shipped src/lib/chat/faq-classifier.json.
//
// What it checks, and why each one matters:
//
//  1. In-sample accuracy   - the model graded on its OWN training data.
//                            This should be high; it mainly exists as a
//                            reference point for #2.
//  2. Leave-one-out CV     - the model retrained with each example removed,
//     (LOOCV)                then tested on that held-out example. This is
//                            the real "does it generalize" number. With only
//                            ~3 examples per class, a single train/test
//                            split would be too noisy to trust — LOOCV uses
//                            every example as a test case once.
//  3. Confusion matrix     - which classes get mistaken for which, so you
//                            can see systematic bias rather than just an
//                            aggregate accuracy number.
//  4. Confidence threshold - sweeps the accept/abstain cutoff to show the
//     sweep                  precision-vs-coverage trade-off. Confidence is
//                            only useful if raising the bar actually buys
//                            you precision — this makes that visible instead
//                            of assumed.
//  5. Novel-phrase test    - hand-written paraphrases that are NOT in the
//                            training set, approximating real user input
//                            more closely than LOOCV does.
//  6. Tree dump            - the decision tree is white-box: every split is
//                            printed as an actual if/else so you can read
//                            what it learned, not just trust a metric.
//
// Read the numbers together, not in isolation: a model can look fine on #1
// while being useless in production, which is exactly what LOOCV/#2 and the
// novel-phrase test/#5 are there to catch.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { trainModel, tokenize, visitTree, cosineSimilarity, classify } from "./faq-classifier-lib.mjs";
import { TRAINING_EXAMPLES, NOVEL_TEST_EXAMPLES } from "./faq-training-examples.mjs";

const THRESHOLD = 0.35; // must match CONFIDENCE_THRESHOLD in src/lib/chat/faq-classifier.ts
const CLASSIFIER_JSON_PATH = fileURLToPath(
  new URL("../src/lib/chat/faq-classifier.json", import.meta.url),
);

function section(title) {
  console.log(`\n${"=".repeat(3)} ${title} ${"=".repeat(Math.max(0, 60 - title.length))}`);
}

function pct(n, d) {
  return d === 0 ? "n/a" : `${((100 * n) / d).toFixed(1)}%`;
}

// ---------------------------------------------------------------------------
// 1) In-sample accuracy (the model shipped in faq-classifier.json,
//    graded on the data it was trained on)
// ---------------------------------------------------------------------------
function evaluateInSample(model) {
  section("1. In-sample accuracy (memorization sanity check)");
  let correct = 0;
  for (const [label, text] of TRAINING_EXAMPLES) {
    const result = classify(model, text, THRESHOLD);
    if (result && result.id === label) correct += 1;
  }
  console.log(
    `${correct}/${TRAINING_EXAMPLES.length} correct (${pct(correct, TRAINING_EXAMPLES.length)})`,
  );
  console.log("This should be high. It's a baseline for comparing against LOOCV below —");
  console.log("a big gap between the two means the model is memorizing, not generalizing.");
  return correct / TRAINING_EXAMPLES.length;
}

// ---------------------------------------------------------------------------
// 2) + 3) Leave-one-out cross-validation + confusion matrix
// ---------------------------------------------------------------------------
function evaluateLOOCV(verbose) {
  section("2. Leave-one-out cross-validation (LOOCV)");
  const confusion = new Map();
  let correct = 0;
  let abstained = 0;
  let wrong = 0;
  const rows = [];

  for (let i = 0; i < TRAINING_EXAMPLES.length; i += 1) {
    const trainSet = TRAINING_EXAMPLES.filter((_, index) => index !== i);
    const model = trainModel(trainSet);
    const [trueLabel, text] = TRAINING_EXAMPLES[i];
    const result = classify(model, text, THRESHOLD);
    const predicted = result ? result.id : "(abstain)";
    rows.push({ text, trueLabel, predicted, confidence: result?.confidence ?? 0 });

    if (!confusion.has(trueLabel)) confusion.set(trueLabel, new Map());
    confusion.get(trueLabel).set(predicted, (confusion.get(trueLabel).get(predicted) ?? 0) + 1);

    if (predicted === "(abstain)") abstained += 1;
    else if (predicted === trueLabel) correct += 1;
    else wrong += 1;
  }

  if (verbose) {
    for (const r of rows) {
      const mark =
        r.predicted === r.trueLabel ? "OK   " : r.predicted === "(abstain)" ? "ABST " : "WRONG";
      console.log(
        `${mark} true=${r.trueLabel.padEnd(18)} pred=${String(r.predicted).padEnd(18)} ` +
          `conf=${r.confidence.toFixed(2)}  "${r.text}"`,
      );
    }
    console.log("");
  }

  const n = TRAINING_EXAMPLES.length;
  console.log(`Correct:            ${correct}/${n} (${pct(correct, n)})`);
  console.log(`Abstained -> LLM:   ${abstained}/${n} (${pct(abstained, n)})`);
  console.log(`Confidently WRONG:  ${wrong}/${n} (${pct(wrong, n)})`);
  console.log(
    `Precision when not abstaining: ${correct}/${correct + wrong} (${pct(correct, correct + wrong)})`,
  );
  console.log(
    "This is the number that matters most: abstaining is cheap (falls back to the LLM),",
  );
  console.log("a confidently WRONG local answer is shown to the user as fact.");

  section("3. Confusion matrix (LOOCV)");
  for (const [trueLabel, preds] of confusion) {
    const parts = [...preds.entries()].map(([p, c]) => `${p}:${c}`).join(", ");
    console.log(`${trueLabel.padEnd(20)} -> ${parts}`);
  }

  return { correct, abstained, wrong, rows };
}

// ---------------------------------------------------------------------------
// 4) Confidence threshold sweep (using the raw LOOCV confidences)
// ---------------------------------------------------------------------------
function evaluateThresholdSweep() {
  section("4. Confidence threshold sweep (LOOCV, unthresholded)");
  const raw = [];
  for (let i = 0; i < TRAINING_EXAMPLES.length; i += 1) {
    const trainSet = TRAINING_EXAMPLES.filter((_, index) => index !== i);
    const model = trainModel(trainSet);
    const [trueLabel, text] = TRAINING_EXAMPLES[i];
    const vector = model.vocabulary.map((term, idx) => {
      const tokens = tokenize(text);
      const count = tokens.filter((t) => t === term).length;
      return (count / (tokens.length || 1)) * model.idf[idx];
    });
    const prediction = visitTree(model.tree, vector);
    const similarity = Math.max(...model.examples.map((ex) => cosineSimilarity(vector, ex)));
    const confidence = Math.min(prediction.confidence, similarity);
    raw.push({ trueLabel, predicted: prediction.label, confidence, correct: prediction.label === trueLabel });
  }

  console.log("threshold | accepted | correct | precision | coverage");
  for (const t of [0, 0.3, 0.35, 0.4, 0.5, 0.55, 0.6, 0.7, 0.8, 0.9, 1.0]) {
    const accepted = raw.filter((r) => r.confidence >= t);
    const correct = accepted.filter((r) => r.correct).length;
    console.log(
      `${t.toFixed(2).padEnd(9)} | ${String(accepted.length).padEnd(8)} | ` +
        `${String(correct).padEnd(7)} | ${pct(correct, accepted.length).padEnd(9)} | ` +
        `${pct(accepted.length, raw.length)}`,
    );
  }
  console.log(`\n(Shipped threshold is ${THRESHOLD} — see src/lib/chat/faq-classifier.ts)`);
  console.log("If precision doesn't improve as the threshold rises, the confidence score isn't");
  console.log("actually correlated with correctness — worth knowing before you tune it further.");
}

// ---------------------------------------------------------------------------
// 5) Novel / unseen phrasing test (the deployed model, not retrained per-item)
// ---------------------------------------------------------------------------
function evaluateNovelPhrases(model) {
  section("5. Novel / unseen phrasing test (approximates real user input)");
  let correct = 0;
  let abstained = 0;
  let wrong = 0;
  for (const [expected, text] of NOVEL_TEST_EXAMPLES) {
    const result = classify(model, text, THRESHOLD);
    const predicted = result ? result.id : "(abstain)";
    const mark =
      predicted === expected ? "OK   " : predicted === "(abstain)" ? "ABST " : "WRONG";
    if (mark === "OK   ") correct += 1;
    else if (mark === "ABST ") abstained += 1;
    else wrong += 1;
    console.log(
      `${mark} expected=${expected.padEnd(18)} got=${String(predicted).padEnd(18)} ` +
        `conf=${(result?.confidence ?? 0).toFixed(2)}  "${text}"`,
    );
  }
  const n = NOVEL_TEST_EXAMPLES.length;
  console.log(
    `\ncorrect=${correct}/${n} (${pct(correct, n)})  abstain=${abstained}/${n}  wrong=${wrong}/${n}`,
  );
}

// ---------------------------------------------------------------------------
// 6) Human-readable tree dump (reads the actual shipped JSON)
// ---------------------------------------------------------------------------
async function dumpTree() {
  section("6. Shipped decision tree (src/lib/chat/faq-classifier.json)");
  let raw;
  try {
    raw = await readFile(CLASSIFIER_JSON_PATH, "utf8");
  } catch {
    console.log("faq-classifier.json not found — run `npm run train:faq` first.");
    return;
  }
  const model = JSON.parse(raw);
  console.log(`${model.tree.length} nodes, ${model.vocabulary.length} vocabulary terms\n`);

  function describe(nodeIndex, depth) {
    const node = model.tree[nodeIndex];
    const pad = "  ".repeat(depth);
    if ("label" in node) {
      console.log(`${pad}-> "${node.label}" (leaf confidence ${node.confidence.toFixed(2)})`);
      return;
    }
    const term = model.vocabulary[node.feature];
    console.log(`${pad}if tfidf("${term}") <= ${node.threshold.toFixed(4)}:`);
    describe(node.left, depth + 1);
    console.log(`${pad}else:`);
    describe(node.right, depth + 1);
  }
  describe(0, 0);
  console.log(
    "\nRead this like real code: every split should correspond to a term that plausibly",
  );
  console.log("distinguishes categories. Splits on whole sentences instead of words/n-grams");
  console.log("are a sign the tree is memorizing individual examples again.");
}

// ---------------------------------------------------------------------------
async function main() {
  const verbose = process.argv.includes("--verbose");
  console.log(
    `FAQ classifier evaluation — ${TRAINING_EXAMPLES.length} training examples, ` +
      `${new Set(TRAINING_EXAMPLES.map((q) => q[0])).size} classes, ` +
      `${NOVEL_TEST_EXAMPLES.length} held-out novel-phrase test cases.`,
  );
  console.log("(pass --verbose to also print every individual LOOCV prediction)");

  const shippedModel = trainModel(TRAINING_EXAMPLES);

  evaluateInSample(shippedModel);
  evaluateLOOCV(verbose);
  evaluateThresholdSweep();
  evaluateNovelPhrases(shippedModel);
  await dumpTree();

  console.log("\nDone. See docs/faq-classifier-evaluation.md for how to read these numbers.");
}

main();
