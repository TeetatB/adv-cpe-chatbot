// Shared tokenizer + training + scoring logic for the local FAQ intent
// classifier. Used by BOTH:
//   - scripts/train-faq-classifier.mjs   (builds the shipped model JSON)
//   - scripts/evaluate-faq-classifier.mjs (evaluates it before/after you ship it)
// Keeping the algorithm in one file means the evaluation always tests
// exactly what gets built — no risk of the eval silently drifting from prod.
//
// IMPORTANT: src/lib/chat/faq-classifier.ts is a separate, hand-mirrored
// TypeScript copy of tokenize()/visitTree()/classify() that runs inside the
// app bundle (it can't import a top-level .mjs script file). If you change
// tokenize() or the tree format here, mirror the change there too, then
// run `npm run train:faq` to regenerate the JSON both sides read.

const LATIN_STOP_WORDS = new Set([
  "a", "an", "can", "do", "how", "i", "is", "my", "the", "what", "was", "why",
]);

const THAI_RUN = /[\u0E00-\u0E7F]+/g;
const LATIN_RUN = /[a-z0-9]+/g;

// Thai script has no spaces between words. A whitespace/word tokenizer turns
// every unspaced Thai sentence into ONE giant token, so the model can only
// ever match phrases it has seen character-for-character before (see
// docs/faq-classifier-evaluation.md for the measured effect of this).
//
// Instead, Thai runs are split into overlapping character n-grams (bigrams +
// trigrams). This lets phrasings that share sub-word chunks contribute
// shared signal even when the full sentence differs, e.g. "ยกเลิกออเดอร์" and
// "ยกเลิกยังไง" both produce the trigram "ยกเล" / "กเลิ" / "เลิก". It's a
// standard cheap trick for unsegmented scripts when you don't want to pull
// in a full word-segmentation dependency.
//
// Latin/digit runs ("gps", "otp", "191"...) are already naturally
// word-segmented by spacing, so those are kept as whole tokens as before.
function thaiNgrams(run, sizes = [2, 3]) {
  const grams = [];
  for (const n of sizes) {
    if (run.length < n) continue;
    for (let i = 0; i <= run.length - n; i += 1) grams.push(run.slice(i, i + n));
  }
  return grams.length ? grams : [run]; // single-character run: keep as-is
}

export function tokenize(text) {
  const lower = text.toLowerCase();
  const tokens = [];
  for (const run of lower.match(THAI_RUN) ?? []) tokens.push(...thaiNgrams(run));
  for (const run of lower.match(LATIN_RUN) ?? []) {
    if (!LATIN_STOP_WORDS.has(run)) tokens.push(run);
  }
  return tokens;
}

export function vectorizeTokens(vocabulary, idf, tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  const length = tokens.length || 1;
  return vocabulary.map((term, index) => ((counts.get(term) ?? 0) / length) * idf[index]);
}

export function cosineSimilarity(left, right) {
  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;
  for (let index = 0; index < left.length; index += 1) {
    dot += left[index] * right[index];
    leftMagnitude += left[index] ** 2;
    rightMagnitude += right[index] ** 2;
  }
  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / Math.sqrt(leftMagnitude * rightMagnitude);
}

function gini(labels) {
  const counts = new Map();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return 1 - [...counts.values()].reduce((sum, count) => sum + (count / labels.length) ** 2, 0);
}

function majorityLabel(labels) {
  const counts = new Map();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  let bestLabel = labels[0];
  let bestCount = -1;
  for (const [label, count] of counts) {
    if (count > bestCount) {
      bestLabel = label;
      bestCount = count;
    }
  }
  return bestLabel;
}

// Regularized CART-style decision tree: capped depth + a minimum number of
// examples per leaf. The ORIGINAL version grew every branch until every leaf
// was 100% pure, which — combined with a ~3-example-per-class dataset — let
// it carve out an individual leaf for almost every single training
// sentence (pure memorization, 100% train accuracy / ~6% held-out accuracy;
// see docs/faq-classifier-evaluation.md). Capping depth and requiring
// several examples per leaf forces it to find splits that separate GROUPS
// of examples instead.
export function trainModel(questions, { maxDepth = 10, minSamplesLeaf = 2 } = {}) {
  const documents = questions.map(([, question]) => tokenize(question));
  const vocabulary = [...new Set(documents.flat())].sort();
  const documentFrequency = vocabulary.map(
    (term) => documents.filter((document) => document.includes(term)).length,
  );
  const idf = documentFrequency.map(
    (frequency) => Math.log((documents.length + 1) / (frequency + 1)) + 1,
  );
  const examples = documents.map((tokens) => vectorizeTokens(vocabulary, idf, tokens));

  const tree = [];
  function makeLeaf(labels) {
    const label = majorityLabel(labels);
    const confidence = labels.filter((item) => item === label).length / labels.length;
    const node = tree.length;
    tree.push({ label, confidence });
    return node;
  }

  function build(indices, depth) {
    const labels = indices.map((index) => questions[index][0]);
    const pure = new Set(labels).size === 1;
    if (pure || indices.length <= minSamplesLeaf || depth >= maxDepth) {
      return makeLeaf(labels);
    }

    const parentImpurity = gini(labels);
    let best = null;
    for (let feature = 0; feature < vocabulary.length; feature += 1) {
      const values = [...new Set(indices.map((index) => examples[index][feature]))].sort(
        (a, b) => a - b,
      );
      for (let valueIndex = 0; valueIndex < values.length - 1; valueIndex += 1) {
        const threshold = (values[valueIndex] + values[valueIndex + 1]) / 2;
        const left = indices.filter((index) => examples[index][feature] <= threshold);
        const right = indices.filter((index) => examples[index][feature] > threshold);
        if (left.length < minSamplesLeaf || right.length < minSamplesLeaf) continue;
        const gain =
          parentImpurity -
          (left.length * gini(left.map((index) => questions[index][0])) +
            right.length * gini(right.map((index) => questions[index][0]))) /
            indices.length;
        if (!best || gain > best.gain) best = { feature, threshold, left, right, gain };
      }
    }

    if (!best || best.gain <= 1e-9) return makeLeaf(labels);

    const node = tree.length;
    tree.push(null);
    const left = build(best.left, depth + 1);
    const right = build(best.right, depth + 1);
    tree[node] = { feature: best.feature, threshold: best.threshold, left, right };
    return node;
  }

  build(
    questions.map((_, index) => index),
    0,
  );

  return { vocabulary, idf, tree, examples };
}

export function visitTree(tree, vector) {
  let nodeIndex = 0;
  while (true) {
    const node = tree[nodeIndex];
    if ("label" in node) return node;
    nodeIndex = vector[node.feature] <= node.threshold ? node.left : node.right;
  }
}

// TF-IDF vectors are mostly zero (each training sentence only touches a
// handful of the vocabulary's n-grams), so storing them densely wastes a lot
// of space once the vocabulary grows into the thousands. This converts each
// dense example vector into a list of [index, value] pairs for the ONLY
// non-zero entries, for compact JSON storage. Used when writing
// faq-classifier.json (scripts/train-faq-classifier.mjs); the runtime
// scorer in src/lib/chat/faq-classifier.ts reads this sparse format
// directly and computes cosine similarity against it without ever
// reconstructing the dense vector.
export function sparsifyExamples(examples) {
  return examples.map((vector) => {
    const sparse = [];
    for (let index = 0; index < vector.length; index += 1) {
      if (vector[index] !== 0) sparse.push([index, vector[index]]);
    }
    return sparse;
  });
}

export function classify(model, text, threshold = 0.55) {
  const vector = vectorizeTokens(model.vocabulary, model.idf, tokenize(text));
  const prediction = visitTree(model.tree, vector);
  const similarity = Math.max(
    ...model.examples.map((example) => cosineSimilarity(vector, example)),
  );
  const confidence = Math.min(prediction.confidence, similarity);
  if (confidence < threshold) return null;
  return { id: prediction.label, confidence };
}
