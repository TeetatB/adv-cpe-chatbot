import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { trainModel, sparsifyExamples } from "./faq-classifier-lib.mjs";
import { TRAINING_EXAMPLES } from "./faq-training-examples.mjs";

const model = trainModel(TRAINING_EXAMPLES);

const outputPath = fileURLToPath(new URL("../src/lib/chat/faq-classifier.json", import.meta.url));
const generated =
  JSON.stringify(
    {
      vocabulary: model.vocabulary,
      idf: model.idf,
      tree: model.tree,
      examples: sparsifyExamples(model.examples),
    },
    null,
    2,
  ) + "\n";

let current = "";
try {
  current = await readFile(outputPath, "utf8");
} catch {
  current = "";
}

if (current === generated) {
  console.log("faq-classifier.json is already up to date.");
  process.exit(0);
}

await writeFile(outputPath, generated);
console.log(
  `Trained FAQ classifier: ${TRAINING_EXAMPLES.length} examples, ` +
    `${model.vocabulary.length} vocab terms, ${model.tree.length} tree nodes.`,
);
console.log("Run `npm run evaluate:faq` to check how well it generalizes.");
