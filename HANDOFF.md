# Handoff Notes — Lukchang Move Support Chatbot

เอกสารนี้สรุปงานทั้งหมดที่ทำในโปรเจกต์นี้ (ผ่านการคุยกับ Claude ใน claude.ai แบบ
ไม่มี dev environment รันจริง — ไม่มี `node_modules`, ไม่เคยรัน `npm install`,
`npm run build`, หรือ `npm run typecheck` เลยตลอดทั้งงาน) เขียนไว้ให้คนหรือ AI
agent ที่มาสานงานต่อ (เช่น Claude Code) เข้าใจบริบท ไม่ต้องไล่อ่าน chat ย้อนหลัง

**สิ่งแรกที่ควรทำก่อนแก้อะไรต่อ:** รัน `npm install` แล้ว `npm run typecheck`
และ `npm run build` เพราะโค้ดทั้งหมดด้านล่างนี้ผ่านแค่การ review ด้วยตาและรัน
`node --experimental-strip-types --check` กับไฟล์ `.ts` (เช็คได้แค่ syntax
ไม่ใช่ type) ส่วนไฟล์ `.tsx` เช็ค syntax แบบนี้ไม่ได้เลยเพราะ JSX — ยังไม่เคย
ผ่าน TypeScript compiler จริงๆ สักครั้ง

---

## 1. บริบทโปรเจกต์

แอป: **Lukchang Move** — แอปขนส่ง/รับส่งพัสดุ (คล้าย delivery app) มี 2 ฝั่งผู้ใช้:
ผู้ส่งพัสดุ (Sender) และคนขับ (Driver) โปรเจกต์เป็น React + TanStack
Start/Router scaffold (มาจาก Grok's app builder — มีโฟลเดอร์ `.grok/` ติดมาด้วย
ไม่เกี่ยวกับงานที่ทำ) ส่วนที่เกี่ยวข้องกับงานนี้คือ **chat support widget**
ที่มี 2 ส่วนทำงานร่วมกัน:

1. **FAQ intent classifier** (local, ไม่เรียก LLM) — decision tree + TF-IDF
   ตอบคำถามที่ตรงกับ FAQ ที่ train ไว้แบบ instant
2. **LLM fallback** (ผ่าน DeepSeek/xAI API ตาม env var ที่ config) — คุมด้วย
   system prompt ยาวๆ ที่ implement tier-based support flow ตาม guideline

---

## 2. Input ต้นทาง

ผู้ใช้ (คนสั่งงานใน chat) อัปโหลด 2 ไฟล์ตอนเริ่มงาน:

- `adv-cpe-chatbot-main.zip` — source code เดิมของแอป (ตอนนั้น FAQ เป็น
  ภาษาอังกฤษ เนื้อหาเป็น generic food-delivery ไม่ตรงกับ business จริง)
- `AI_Assistant_guideline.pdf` — **เป็น PDF แบบไม่มี text layer (print-to-PDF
  จาก markdown)** ต้อง render เป็นรูปภาพทีละหน้า (`pdftoppm`) แล้วอ่านด้วยสายตา
  ทั้ง 15 หน้า เอกสารนี้นิยาม tier-based support flow ของ "Lukchang Move"
  เป็นภาษาไทยทั้งหมด:
  - **Tier 1** — AI ตอบเองจบ (มีคำตอบสำเร็จรูป)
  - **Tier 2A** — เปิด ticket + (ตามสเปกเดิม) ปิดจบเอง — **ถูกเปลี่ยนภายหลัง
    ให้ส่งต่อ Admin เสมอ ดูข้อ 3.2**
  - **Tier 2B** — เปิด ticket รอ Admin ตรวจสอบ พร้อม SLA
  - **Tier 3** — escalate ให้ Admin ทันที (ผูกกับหัวข้อ เช่น safety/legal/fraud)
  - **Tier 3-N** — escalate จากพฤติกรรม/สัญญาณระหว่างบทสนทนา (ขอคุยกับคนจริง,
    sentiment ลบสูง, ถามซ้ำ, เนื้อหานอกขอบเขต)
  - มี `issue_category_enum` ~25 หมวด (refund, driver_delay, damaged_parcel,
    legal_emergency, ฯลฯ) และ **golden rule**: ห้าม AI สัญญาผลลัพธ์แทน Admin
    นอกเหนือจาก Tier 1

ไฟล์ PDF ต้นฉบับไม่ได้เก็บไว้ใน repo — เนื้อหาถูกแปลงเป็นตาราง/กฎใน
`src/lib/chat/system-prompt.ts` ไปแล้ว ถ้าต้องแก้ policy เพิ่มเติมในอนาคต
ให้ขอ guideline ต้นฉบับใหม่จากผู้ใช้

---

## 3. ลำดับงานที่ทำ (ตามรอบการคุย)

### 3.1 รอบแรก — แปล FAQ + ticket flow ตาม guideline

- เขียน `src/lib/chat/faq.ts` ใหม่ทั้งหมด: 11 หัวข้อ Tier 1 (7 ฝั่งผู้ส่ง + 4
  ฝั่งคนขับ) เป็นภาษาไทย พร้อม `SUGGESTED_PROMPTS` ภาษาไทย
- เขียน `src/lib/chat/system-prompt.ts` ใหม่ทั้งหมด: encode ตาราง Tier
  2A/2B/3/3-N ทั้งหมดจาก guideline เป็นภาษาไทย + golden rule + รูปแบบ output
  ของ ticket (`TICKET_CREATED` block)
- เขียน `src/lib/chat/tickets.ts` ใหม่: เปลี่ยนจาก `PROBLEM_TYPES` (5 ค่า
  ภาษาอังกฤษ) เป็น `CATEGORY_LABELS_TH` (~25 หมวดตาม `issue_category_enum`
  พร้อม label ภาษาไทย), เพิ่ม `tier` field (`"2A" | "2B" | "3" | "3-N"`),
  เปลี่ยน ticket id prefix จาก `NSH-` เป็น `LCM-`, เปลี่ยน persist storage key
  เป็น `lukchangmove-tickets`, แก้ `TICKET_CREATED` parser ให้อ่าน field
  `Category:` และ `Tier:` เพิ่ม
- แก้ `src/lib/chat/chat-api.ts`: ข้อความ fallback และ regex เดา
  ticket-intent เปลี่ยนเป็นภาษาไทย
- Localize UI เป็นภาษาไทยทั้งหมด: `src/components/chat/faq-panel.tsx`,
  `src/components/app-shell.tsx` (nav labels, header), `src/components/chat/chat-page.tsx`
  (welcome message, placeholder, ปุ่มต่างๆ), `src/routes/tickets.tsx`
  (label, แสดงผล category/tier)
- แก้ `scripts/train-faq-classifier.mjs` ให้ train จาก training data
  ภาษาไทย + เพิ่ม Thai unicode range ในตัว tokenizer regex (ตอนนั้นยังเป็น
  whitespace/word-level tokenizer ธรรมดา — ปัญหาถูกเจอทีหลังในข้อ 3.3)

### 3.2 ปรับ Tier 2A — เปลี่ยนจาก "AI ปิดจบเอง" เป็น "ส่งให้ Admin เสมอ"

ผู้ใช้ขอให้ AI **ห้าม auto-resolve/ปิด ticket เองแม้แต่ Tier 2A** (เดิม
guideline ให้ Tier 2A เป็น "fait accompli" คือ AI บอกผลลัพธ์ที่เกิดขึ้นแล้ว
จากระบบอัตโนมัติได้เลย) — แก้ `system-prompt.ts`:

- เอา exception ของ Tier 2A ออกจาก golden rule (ตอนนี้ทุก tier ที่ไม่ใช่
  Tier 1 ต้องพูดว่า "ส่งเรื่องให้ Admin ตรวจสอบ" ไม่ใช่ยืนยันผลลัพธ์เอง)
- แก้หัวข้อตาราง Tier 2A และขั้นตอน "วิธีเปิด support ticket" ให้ใช้
  โครงข้อความเดียวกันทุก tier (รับทราบ + ส่งให้ Admin/ทีมตรวจสอบ + กรอบเวลา)

### 3.3 ประเมิน + แก้ FAQ classifier (ML technique)

ผู้ใช้ถามเรื่อง evaluation ของ decision tree classifier → ตรวจพบปัญหาใหญ่:

- **Root cause:** ภาษาไทยไม่มีช่องว่างคั่นคำ ตัว tokenizer เดิม
  (`/[a-z0-9\u0E00-\u0E7F]+/g`) จับทั้งประโยคเป็น "คำ" เดียว ทำให้ decision
  tree เรียนรู้แบบ exact-match เท่านั้น (memorize ทั้งประโยค ไม่ใช่แยกคำ)
- ยืนยันด้วย **leave-one-out cross-validation (LOOCV)**: in-sample accuracy
  100% แต่ LOOCV accuracy แค่ 5.6% — overfitting ชัดเจน
- **วิธีแก้ (ถาวร ใช้จนจบงาน):**
  - เปลี่ยน tokenizer เป็น **character n-gram (bigram+trigram)** สำหรับ
    อักษรไทย (Latin/digit เช่น `gps`, `otp` ยังเป็น whole token เหมือนเดิม)
  - เปลี่ยน decision tree ให้มี regularization: `maxDepth` และ
    `minSamplesLeaf` (เดิม grow จนกว่าจะ pure 100% ไม่มี cap เลย)
- สร้างไฟล์ใหม่ 3 ไฟล์เพื่อรวม logic ไม่ให้ training-side กับ runtime-side
  โค้ดเพี้ยนจากกัน:
  - **`scripts/faq-classifier-lib.mjs`** — shared library: tokenizer,
    `trainModel()`, `classify()`, `cosineSimilarity()`, `visitTree()`,
    `sparsifyExamples()` (ใช้ทั้ง train script และ eval script)
  - **`scripts/faq-training-examples.mjs`** — single source of truth ของ
    data: `TRAINING_EXAMPLES` (ใช้ build โมเดล) และ `NOVEL_TEST_EXAMPLES`
    (held-out set, **ห้าม train บนชุดนี้เด็ดขาด** — ใช้วัด generalization
    เท่านั้น มีการเช็ค overlap = 0 ทุกครั้งที่แก้ dataset)
  - **`scripts/evaluate-faq-classifier.mjs`** — eval harness ที่รันได้เอง
    ในเครื่อง (`npm run evaluate:faq`) พิมพ์ 6 อย่าง: in-sample accuracy,
    LOOCV, confusion matrix, threshold sweep, novel-phrase test, tree dump
    (decode decision tree ให้อ่านเป็น `if/else` จริง)
- แก้ `src/lib/chat/faq-classifier.ts` (runtime TS ที่ bundle เข้าแอปจริง)
  ให้ mirror tokenizer แบบเดียวกับ `faq-classifier-lib.mjs` เป๊ะๆ **(ไฟล์นี้
  import `.mjs` นอก `src/` ตรงๆ ไม่ได้ ต้อง copy logic มือ — มีคอมเมนต์เตือน
  ไว้ในโค้ดแล้ว ถ้าแก้ tokenizer/tree format ใน lib ต้องมาแก้ที่นี่ด้วย
  แล้ว `npm run train:faq` ใหม่)**
- เพิ่ม `"evaluate:faq": "node scripts/evaluate-faq-classifier.mjs"` ใน
  `package.json`
- เขียน `docs/faq-classifier-evaluation.md` อธิบาย methodology +
  before/after numbers ทุกรอบ (ดูข้อ 4 ด้านล่างสำหรับผลสรุปปัจจุบัน)

### 3.4 เพิ่ม coverage (data + tuning)

ผู้ใช้ขอเพิ่ม vocabulary/samples เพื่อให้ classifier ตอบได้ครอบคลุมมากขึ้น:

- ขยาย `TRAINING_EXAMPLES`: 36 → 110 → **166** ตัวอย่าง (12–18 ต่อ class,
  11 classes) ขยาย `NOVEL_TEST_EXAMPLES`: 18 → **29** ตัวอย่าง
- **บทเรียนสำคัญที่ควรรู้ก่อนแก้ต่อ:** การเพิ่ม `maxDepth` ทำให้ LOOCV ดูดีขึ้น
  (coverage สูงขึ้นเรื่อยๆ จนถึง depth ~20 แล้ว plateau) **แต่พอเช็คกับ
  novel-phrase test จริง กลับพบว่า depth ที่ลึกขึ้นทำให้อัตราตอบผิดเพิ่มขึ้น
  เกือบเท่าตัวโดยที่จำนวนตอบถูกแทบไม่ขยับ** — สรุปว่า LOOCV กับ
  novel-phrase test **ให้ผลขัดแย้งกันได้** และควรเชื่อ novel-phrase test
  มากกว่า (ใกล้เคียง production traffic จริงมากกว่า) รายละเอียดเต็มอยู่ใน
  `docs/faq-classifier-evaluation.md` หัวข้อ "Round 2b"
- **Config สุดท้ายที่ใช้จริง (หาโดย grid search กับ novel-phrase test
  โดยตรง ไม่ใช่ LOOCV):** `maxDepth: 10` (เท่าเดิม ไม่ได้เพิ่ม),
  `minSamplesLeaf: 2` (เท่าเดิม), **threshold `0.55 → 0.40 → 0.35`**
- เพิ่ม vocabulary จาก n-gram (46 → 1,694 → **2,219 terms**) ทำให้
  `faq-classifier.json` บวมเป็น **3.5 MB** (dense float array) — แก้ด้วย
  **sparse storage**: `sparsifyExamples()` แปลง example vectors เป็น
  `[index, value]` pairs (เก็บเฉพาะช่องที่ไม่ใช่ 0) ตอน build,
  `faq-classifier.ts` runtime อ่าน sparse format ตรงๆ ไม่ต้อง reconstruct
  เป็น dense — ผลลัพธ์: **3.5 MB → ~534 KB** (ยืนยันแล้วว่าผลการ classify
  เหมือนเดิมทุกกรณี ไม่ได้เปลี่ยน logic แค่เปลี่ยนวิธีเก็บข้อมูล)

### 3.5 แสดงผลใน frontend ว่าคำตอบมาจาก FAQ classifier หรือ LLM

- แก้ `src/lib/chat/chat-api.ts`: `sendChat()` ตอนนี้ return field
  `source: "faq" | "llm" | "fallback"` เพิ่ม (พร้อม `faqId`, `faqQuestion`,
  `confidence` เมื่อ `source === "faq"`)
- แก้ `src/components/chat/chat-page.tsx`:
  - `ChatMessage` type เพิ่ม `source` และ `faqConfidence`
  - `MessageBubble` แสดง badge `📖 คำตอบสำเร็จรูปจาก FAQ` เหนือข้อความ
    เมื่อ `source === "faq"` (ไม่โชว์ % ดิบ — ผู้ใช้ขอให้เอาออกทีหลัง)
  - **ล่าสุด:** ถ้า `faqConfidence < 0.6` (แต่ยังผ่าน threshold 0.35 ที่ยอมรับ
    คำตอบ) จะมีข้อความเสริมสีจางๆ ใต้ bubble: *"หากคำตอบนี้ไม่ตรงกับสิ่งที่
    ถาม พิมพ์อธิบายเพิ่มเติมได้เลยค่ะ"* — เกณฑ์ 0.6 เป็นค่าที่เลือกเอง
    ยังไม่ได้ทดสอบ/tune กับ user จริง ถ้าต้องการปรับสามารถแก้ค่าคงที่
    `isLowConfidenceFaqMatch` ใน `chat-page.tsx` ได้เลย

---

## 4. สถานะ/ตัวเลขปัจจุบัน (ล่าสุด ณ วันที่ส่งงาน)

| ค่า | ที่อยู่ | ค่าปัจจุบัน |
|---|---|---|
| Training examples | `scripts/faq-training-examples.mjs` | 166 (12–18/class, 11 classes) |
| Novel-phrase test set | `scripts/faq-training-examples.mjs` | 29 (held-out, 0 overlap กับ training) |
| Tree `maxDepth` | `scripts/faq-classifier-lib.mjs` (`trainModel` default) | 10 |
| Tree `minSamplesLeaf` | `scripts/faq-classifier-lib.mjs` (`trainModel` default) | 2 |
| Confidence threshold | `src/lib/chat/faq-classifier.ts` (`CONFIDENCE_THRESHOLD`) และ `scripts/evaluate-faq-classifier.mjs` (`THRESHOLD`) — **ต้องแก้พร้อมกันทั้งคู่เสมอ** | 0.35 |
| Vocabulary size (n-gram) | (generated) | 2,219 terms |
| `faq-classifier.json` size | `src/lib/chat/faq-classifier.json` | ~534 KB (sparse format) |
| Ticket ID prefix | `src/lib/chat/tickets.ts` | `LCM-` |
| Novel-phrase test result ล่าสุด | รันจาก `npm run evaluate:faq` | 14/29 ถูก (48.3%), 3/29 ผิด (10.3%), 12/29 abstain |
| LOOCV precision (เมื่อไม่ abstain) | เช่นเดียวกัน | 59.1% |
| Frontend confidence hint cutoff | `src/components/chat/chat-page.tsx` (`isLowConfidenceFaqMatch`) | < 0.6 → โชว์ hint, ≥ 0.6 → ไม่โชว์ |

**คำเตือน:** ตัวเลขทั้งหมดข้างบน reproduce ได้ 100% ด้วยการรัน
`npm run evaluate:faq` เพราะ LOOCV/novel-phrase/tree dump เป็น
deterministic ทั้งหมด (ไม่มี randomness) ถ้าตัวเลขไม่ตรง แปลว่ามีคนแก้
`faq-training-examples.mjs` หรือ `faq-classifier-lib.mjs` ไปแล้วโดยไม่ได้
อัปเดตเอกสารนี้

---

## 5. รายชื่อไฟล์ทั้งหมดที่ถูกสร้าง/แก้ไข

**ไฟล์ใหม่:**
- `scripts/faq-classifier-lib.mjs`
- `scripts/faq-training-examples.mjs`
- `scripts/evaluate-faq-classifier.mjs`
- `docs/faq-classifier-evaluation.md`
- `HANDOFF.md` (ไฟล์นี้)

**ไฟล์ที่แก้ไข:**
- `src/lib/chat/faq.ts`
- `src/lib/chat/system-prompt.ts`
- `src/lib/chat/tickets.ts`
- `src/lib/chat/chat-api.ts`
- `src/lib/chat/faq-classifier.ts`
- `src/lib/chat/faq-classifier.json` (generated — อย่าแก้มือ ใช้
  `npm run train:faq`)
- `scripts/train-faq-classifier.mjs`
- `src/components/chat/faq-panel.tsx`
- `src/components/chat/chat-page.tsx`
- `src/components/app-shell.tsx`
- `src/routes/tickets.tsx`
- `package.json` (เพิ่ม script `evaluate:faq`)

---

## 6. สิ่งที่ยังไม่ได้ทำ / ควรระวัง

1. **ยังไม่เคยรัน `npm install` / `npm run typecheck` / `npm run build`
   เลยตลอดทั้งงาน** (environment ไม่มี network/node_modules) — โค้ด TS/TSX
   ผ่านแค่ manual review เท่านั้น ควรรัน typecheck เป็นอย่างแรกก่อนแก้อะไร
   ต่อ โดยเฉพาะ `src/components/chat/chat-page.tsx` ที่มี JSX/type ซับซ้อน
   ที่สุดในบรรดาไฟล์ที่แก้
2. **`src/lib/chat/faq-classifier.ts` กับ `scripts/faq-classifier-lib.mjs`
   ต้องเหมือนกันเป๊ะ** (tokenizer + tree-walk logic) เพราะไฟล์แรก import
   `.mjs` นอก `src/` เข้า client bundle ไม่ได้ — มีคอมเมนต์เตือนในทั้งสอง
   ไฟล์แล้ว แต่เป็นจุดที่เสี่ยง drift มากที่สุดถ้ามีคนแก้ไฟล์เดียวแล้วลืมอีกไฟล์
3. **Threshold 0.35 คือจุด balance ระหว่าง coverage กับความแม่นยำ ไม่ใช่ค่า
   ที่ "ถูกที่สุด"** — ถ้าต้องการ precision สูงขึ้น (แลกกับ coverage ต่ำลง)
   ปรับเป็น `0.45` ได้เลย (มีข้อมูลเปรียบเทียบใน
   `docs/faq-classifier-evaluation.md`)
4. **Frontend confidence-hint cutoff (0.6) เป็นค่าที่เลือกเองแบบไม่มี data
   รองรับ** (ต่างจาก threshold 0.35 ที่ผ่าน grid search) ถ้ามี user
   feedback จริงในอนาคต ควรกลับมาปรับค่านี้
5. **AI_Assistant_guideline.pdf ต้นฉบับไม่ได้เก็บไว้ใน repo** — ถ้าต้องแก้
   policy/Tier เพิ่มเติมในอนาคต ต้องขอไฟล์ใหม่จากผู้ใช้ หรืออ้างอิงจากที่
   encode ไว้ใน `system-prompt.ts` เท่านั้น (ซึ่งสรุปมาแล้ว ไม่ใช่ verbatim)
6. **`docs/faq-classifier-evaluation.md` มีรายละเอียด methodology ครบ**
   รวมถึงบทเรียนเรื่อง LOOCV vs novel-phrase test ที่ขัดแย้งกัน — ควรอ่าน
   ก่อนแก้ dataset/parameters ของ classifier ต่อ เพื่อไม่ให้ทำผิดซ้ำ
   (เช่น เผลอเพิ่ม `maxDepth` โดยเชื่อ LOOCV อย่างเดียว)
7. Ticket flow ปัจจุบันเป็นการเก็บใน `localStorage` ฝั่ง client
   (zustand persist, key `lukchangmove-tickets`) **ไม่มี backend จริง** —
   ถ้า deploy จริงต้องมีระบบหลังบ้านมารับช่วงต่อจาก `TICKET_CREATED` block
   ที่ LLM output ออกมา
8. LLM provider resolution (`resolveProvider()` ใน `chat-api.ts`) รองรับ
   `LLM_API_KEY`/`DEEPSEEK_API_KEY`/`XAI_API_KEY` ผ่าน env var — ไม่ได้แก้
   ส่วนนี้เลยตลอดงาน เป็นโค้ดเดิมจาก scaffold

---

## 7. คำสั่งที่มีประโยชน์

```bash
npm install              # ยังไม่เคยรันในงานนี้ ควรรันก่อนอันดับแรก
npm run typecheck        # ยังไม่เคย verify
npm run train:faq        # retrain FAQ classifier จาก faq-training-examples.mjs
npm run evaluate:faq     # รัน eval harness ในเครื่อง (เพิ่ม --verbose ได้)
npm run dev               # dev server (scaffold เดิม)
npm run build              # production build (ยังไม่เคย verify)
```
