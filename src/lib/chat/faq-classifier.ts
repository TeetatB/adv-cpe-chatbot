import model from "./faq-classifier.json" with { type: "json" };

type TreeNode =
  | {
      feature: number;
      threshold: number;
      left: number;
      right: number;
    }
  | {
      label: string;
      confidence: number;
    };

type FaqClassifierModel = {
  vocabulary: string[];
  idf: number[];
  tree: TreeNode[];
  examples: number[][];
};

const trainedModel = model as FaqClassifierModel;
const STOP_WORDS = new Set([
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

function tokenize(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? []).filter((token) => !STOP_WORDS.has(token));
}

function vectorize(text: string): number[] {
  const tokens = tokenize(text);
  const counts = new Map<string, number>();
  for (const token of tokens) counts.set(token, (counts.get(token) ?? 0) + 1);

  const length = tokens.length || 1;
  return trainedModel.vocabulary.map((term, index) => {
    const termFrequency = (counts.get(term) ?? 0) / length;
    return termFrequency * trainedModel.idf[index];
  });
}

function cosineSimilarity(left: number[], right: number[]): number {
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

function visitTree(vector: number[]): { label: string; confidence: number } {
  let nodeIndex = 0;
  while (true) {
    const node = trainedModel.tree[nodeIndex];
    if ("label" in node) return node;
    nodeIndex = vector[node.feature] <= node.threshold ? node.left : node.right;
  }
}

export function classifyFaq(text: string): { id: string; confidence: number } | null {
  const vector = vectorize(text);
  const prediction = visitTree(vector);
  const similarity = Math.max(
    ...trainedModel.examples.map((example) => cosineSimilarity(vector, example)),
  );
  const confidence = Math.min(prediction.confidence, similarity);

  if (confidence < 0.55) return null;
  return { id: prediction.label, confidence };
}
