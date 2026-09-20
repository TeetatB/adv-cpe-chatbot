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

// examples คือ TF-IDF vector ของแต่ละตัวอย่างใน training set แบบ sparse
// (เก็บเฉพาะ [index, value] ของช่องที่ไม่ใช่ 0 — ส่วนใหญ่ของ vector เป็น 0
// เพราะประโยคหนึ่งแตะ n-gram ใน vocabulary แค่ส่วนน้อย เก็บแบบ dense เปลือง
// พื้นที่มากเมื่อ vocabulary โตเป็นหลักพัน) มาจาก sparsifyExamples() ใน
// scripts/faq-classifier-lib.mjs ตอน build โมเดล
type SparseVector = [index: number, value: number][];

type FaqClassifierModel = {
  vocabulary: string[];
  idf: number[];
  tree: TreeNode[];
  examples: SparseVector[];
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

// ต้องเหมือนกันเป๊ะกับ tokenize() ใน scripts/faq-classifier-lib.mjs
// (ไฟล์นั้นใช้ build โมเดล faq-classifier.json ส่วนไฟล์นี้ใช้ตอน runtime จริงในแอป
// เพราะ import ไฟล์ .mjs นอก src/ ตรงๆ เข้า bundle ฝั่ง client ไม่ได้)
//
// ภาษาไทยไม่มีช่องว่างคั่นคำ ถ้า tokenize แบบแบ่งคำทั้งประโยค (whitespace-delimited)
// จะได้ "คำ" ที่จริงๆ คือทั้งประโยค ทำให้โมเดล match ได้เฉพาะประโยคที่เจอตอน train
// มาเป๊ะๆ เท่านั้น (ดูรายละเอียดผลการทดสอบใน docs/faq-classifier-evaluation.md)
// วิธีแก้ที่ใช้ที่นี่คือตัดข้อความไทยเป็น character n-gram (bigram + trigram)
// แทนคำเต็มประโยค ส่วนอักษรละติน/ตัวเลข ("gps", "otp") ยังคงเป็น token เต็มคำเหมือนเดิม
// เพราะมีช่องว่างคั่นคำอยู่แล้วตามธรรมชาติ
const THAI_RUN = /[\u0E00-\u0E7F]+/g;
const LATIN_RUN = /[a-z0-9]+/g;

function thaiNgrams(run: string, sizes: number[] = [2, 3]): string[] {
  const grams: string[] = [];
  for (const n of sizes) {
    if (run.length < n) continue;
    for (let i = 0; i <= run.length - n; i += 1) grams.push(run.slice(i, i + n));
  }
  return grams.length ? grams : [run];
}

function tokenize(text: string): string[] {
  const lower = text.toLowerCase();
  const tokens: string[] = [];
  for (const run of lower.match(THAI_RUN) ?? []) tokens.push(...thaiNgrams(run));
  for (const run of lower.match(LATIN_RUN) ?? []) {
    if (!STOP_WORDS.has(run)) tokens.push(run);
  }
  return tokens;
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

// คำนวณ cosine similarity ระหว่าง query vector แบบ dense (จากข้อความที่ผู้ใช้พิมพ์)
// กับ example vector แบบ sparse (จาก training set) โดยไม่ต้องแปลง sparse กลับเป็น
// dense ก่อน — เดินเฉพาะช่องที่ไม่ใช่ 0 ของ example เท่านั้น
function cosineSimilarity(denseQuery: number[], sparseExample: SparseVector): number {
  let dot = 0;
  let rightMagnitude = 0;
  for (const [index, value] of sparseExample) {
    dot += denseQuery[index] * value;
    rightMagnitude += value * value;
  }
  if (!rightMagnitude) return 0;

  let leftMagnitude = 0;
  for (let index = 0; index < denseQuery.length; index += 1) {
    leftMagnitude += denseQuery[index] ** 2;
  }
  if (!leftMagnitude) return 0;

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

// เกณฑ์ความมั่นใจ (confidence threshold) — ต้องตรงกับ THRESHOLD ใน
// scripts/evaluate-faq-classifier.mjs เสมอ ปรับมาจาก 0.55 เดิม เพราะพบว่า
// ตัวกรอง cosine similarity (นับเทียบกับตัวอย่างที่ใกล้ที่สุด) มักให้ค่าต่ำกว่า
// 0.55 แม้ decision tree จะมั่นใจสูงก็ตาม ปรับอีกครั้งจาก 0.40 เป็น 0.35 หลังขยาย
// training data เป็น 166 ตัวอย่าง เพราะ grid search กับ novel-phrase test ชี้ว่า
// เป็นจุดที่ balance ระหว่าง coverage กับ precision ดีที่สุด (แม่นยำกว่าการเพิ่ม
// tree depth ซึ่งเพิ่ม coverage ได้แต่แลกด้วยอัตราตอบผิดที่สูงขึ้นกว่าคุ้ม) —
// ดูรายละเอียดการวัดผลใน docs/faq-classifier-evaluation.md
const CONFIDENCE_THRESHOLD = 0.35;

export function classifyFaq(text: string): { id: string; confidence: number } | null {
  const vector = vectorize(text);
  const prediction = visitTree(vector);
  const similarity = Math.max(
    ...trainedModel.examples.map((example) => cosineSimilarity(vector, example)),
  );
  const confidence = Math.min(prediction.confidence, similarity);

  if (confidence < CONFIDENCE_THRESHOLD) return null;
  return { id: prediction.label, confidence };
}
