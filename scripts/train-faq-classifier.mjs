import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const questions = [
  ["track", "How do I track my order?"],
  ["address", "How can I change my delivery address?"],
  ["late", "What should I do if my order is late?"],
  ["cancel", "How do I cancel an order?"],
  ["fees", "Why was I charged a service fee or delivery fee?"],
  ["promo", "How do I apply a promo code?"],
  ["tip", "Can I tip the courier?"],
  ["support", "How do I contact support?"],
  ["payment", "What payment methods are accepted?"],
  ["profile", "How do I update my phone number or email?"],
];

const stopWords = new Set([
  "a",
  "an",
  "can",
  "do",
  "how",
  "i",
  "is",
  "my",
  "the",
  "what",
  "was",
  "why",
]);
const tokenize = (text) =>
  (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((token) => !stopWords.has(token));
const documents = questions.map(([, question]) => tokenize(question));
const vocabulary = [...new Set(documents.flat())].sort();
const documentFrequency = vocabulary.map(
  (term) => documents.filter((document) => document.includes(term)).length,
);
const idf = documentFrequency.map(
  (frequency) => Math.log((documents.length + 1) / (frequency + 1)) + 1,
);

function vectorize(tokens) {
  const counts = new Map();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);
  return vocabulary.map(
    (term, index) => ((counts.get(term) ?? 0) / (tokens.length || 1)) * idf[index],
  );
}

const examples = documents.map(vectorize);

function gini(labels) {
  const counts = new Map();
  for (const label of labels) counts.set(label, (counts.get(label) ?? 0) + 1);
  return 1 - [...counts.values()].reduce((sum, count) => sum + (count / labels.length) ** 2, 0);
}

const tree = [];
function build(indices) {
  const labels = indices.map((index) => questions[index][0]);
  const label = labels[0];
  if (new Set(labels).size === 1 || indices.length <= 1) {
    const node = tree.length;
    tree.push({ label, confidence: 1 });
    return node;
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
      if (!left.length || !right.length) continue;
      const gain =
        parentImpurity -
        (left.length * gini(left.map((index) => questions[index][0])) +
          right.length * gini(right.map((index) => questions[index][0]))) /
          indices.length;
      if (!best || gain > best.gain) best = { feature, threshold, left, right, gain };
    }
  }

  if (!best || best.gain <= 0) {
    const node = tree.length;
    tree.push({
      label,
      confidence: labels.filter((item) => item === label).length / labels.length,
    });
    return node;
  }

  const node = tree.length;
  tree.push(null);
  const left = build(best.left);
  const right = build(best.right);
  tree[node] = { feature: best.feature, threshold: best.threshold, left, right };
  return node;
}

build(questions.map((_, index) => index));

const outputPath = fileURLToPath(new URL("../src/lib/chat/faq-classifier.json", import.meta.url));
const generated = JSON.stringify({ vocabulary, idf, tree, examples }, null, 2) + "\n";
let current = "";
try {
  current = await readFile(outputPath, "utf8");
} catch {
  current = "";
}
if (current === generated) process.exit(0);
await writeFile(outputPath, generated);
