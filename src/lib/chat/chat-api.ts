import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { FAQ_ITEMS } from "./faq";
import { classifyFaq } from "./faq-classifier";
import { SYSTEM_PROMPT } from "./system-prompt";

const MessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(4000),
});

const ChatInputSchema = z.object({
  messages: z.array(MessageSchema).min(1).max(24),
});

type LlmProvider = {
  apiKey: string;
  baseUrl: string;
  model: string;
};

// คำ/วลีที่บ่งชี้ว่าเรื่องนี้น่าจะต้องเปิด ticket (Tier 2A/2B/3/3-N) แทนที่จะตอบจาก FAQ ตรงๆ
function looksLikeTicketRequest(text: string): boolean {
  return (
    /เปิดตั๋ว|สร้างตั๋ว|แจ้งปัญหา|เปิดเรื่อง|ของหาย|ของเสียหาย|พัสดุเสียหาย|พัสดุสูญหาย|เงินไม่คืน|ตัดเงินซ้ำ|คนขับไม่มา|คนขับสาย|คนขับหยาบคาย|คนขับคุกคาม|ข่มขู่|ส่งของผิดที่|บัญชีถูกแบน|บัญชีถูกระงับ|บัญชีถูกล็อก|KYC ไม่ผ่าน|เรียกเก็บเงินเพิ่ม|อุบัติเหตุ|รถเสีย|ช่วยด้วย|อันตราย|ไม่ปลอดภัย|คุยกับแอดมิน|คุยกับคนจริง|ขอลบบัญชี|ขอข้อมูลส่วนตัว/.test(
      text,
    ) ||
    /\b(create (a )?ticket|missing item|wrong item|never arrived|order issue|report (a )?problem)\b/i.test(
      text,
    )
  );
}

function hasTicketContext(messages: z.infer<typeof MessageSchema>[]): boolean {
  // ผู้ใช้เคยพิมพ์ข้อความที่เข้าข่ายเปิดตั๋วมาก่อนในบทสนทนานี้ (แม้จะไม่ใช่ข้อความล่าสุด)
  // เพื่อให้บทสนทนาที่กำลังไล่เก็บรายละเอียด (เช่น รอผู้ใช้พิมพ์หมายเลขออเดอร์) ยังคุยกับ LLM ต่อได้
  const userStartedTicketFlow = messages.some(
    (message) => message.role === "user" && looksLikeTicketRequest(message.content),
  );
  if (userStartedTicketFlow) return true;

  // หรือ AI เคยตอบแบบเปิด/อ้างอิงตั๋วมาก่อนแล้วจริงๆ (ไม่ใช่แค่คำแนะนำทั่วไปใน FAQ tier 1
  // เช่น "พิมพ์หมายเลขออเดอร์มาในแชทได้เลยค่ะ" ซึ่งเป็นคำตอบจบในตัวเอง ไม่ใช่จุดเริ่มต้นของตั๋ว)
  return messages.some(
    (message) =>
      message.role === "assistant" &&
      /เลขอ้างอิง|ticket_id|TICKET_CREATED|ส่งเรื่องให้.*ตรวจสอบ|ส่งต่อให้ Admin/i.test(
        message.content,
      ),
  );
}

function resolveProvider(): LlmProvider | null {
  const configuredKey = process.env.LLM_API_KEY?.trim();
  if (configuredKey) {
    const base = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
    return {
      apiKey: configuredKey,
      baseUrl: base.endsWith("/v1") ? base : `${base}/v1`,
      model: process.env.LLM_MODEL ?? "deepseek-chat",
    };
  }

  const deepseek = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseek) {
    const base = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
    return {
      apiKey: deepseek,
      baseUrl: base.endsWith("/v1") ? base : `${base}/v1`,
      model: process.env.LLM_MODEL ?? "deepseek-chat",
    };
  }

  const xai = process.env.XAI_API_KEY?.trim();
  if (xai) {
    return {
      apiKey: xai,
      baseUrl: "https://api.x.ai/v1",
      model: process.env.LLM_MODEL ?? "grok-4.5",
    };
  }

  return null;
}

export const sendChat = createServerFn({ method: "POST" })
  .validator((data: unknown) => ChatInputSchema.parse(data))
  .handler(async ({ data }) => {
    const latestMessage = data.messages.at(-1)?.content ?? "";
    // ลองจับคู่ FAQ Tier 1 ก่อนเสมอ (เร็ว ไม่เรียก LLM) ยกเว้นตอนที่รู้อยู่แล้วว่ากำลังอยู่กลาง
    // บทสนทนาเปิดตั๋ว (hasTicketContext) ซึ่งควรคุยกับ LLM ต่อเนื่อง ไม่ควรวกกลับไปจับ FAQ อีก
    // ถ้าไม่เข้า Tier 1 เลย ให้ส่งต่อ LLM เสมอ (ไม่ใช่ FALLBACK_MESSAGE คงที่) เพราะ system prompt
    // เป็นผู้ตัดสินใจ Tier 2A/2B/3/3-N รวมถึงกรณี "ไม่ match case ใดเลย" (ข้อ 4.4) เอง —
    // การเช็คคำสำคัญแบบตายตัว (looksLikeTicketRequest) ไม่มีทางครอบคลุมทุกหมวดใน guideline ได้
    if (!hasTicketContext(data.messages)) {
      const faq = classifyFaq(latestMessage);
      const matchedItem = faq && FAQ_ITEMS.find((item) => item.id === faq.id);
      if (faq && matchedItem) {
        return {
          ok: true as const,
          text: matchedItem.answer,
          source: "faq" as const,
          faqId: matchedItem.id,
          faqQuestion: matchedItem.question,
          confidence: faq.confidence,
        };
      }
    }

    const provider = resolveProvider();
    if (!provider) {
      return {
        ok: false as const,
        error: "The assistant is not available in this environment.",
      };
    }

    const res = await fetch(`${provider.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({
        model: provider.model,
        temperature: 0.2,
        max_tokens: 420,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...data.messages.map((m) => ({ role: m.role, content: m.content })),
        ],
      }),
    });

    if (!res.ok) {
      return {
        ok: false as const,
        error: `The assistant could not reply (${res.status}). Try again in a moment.`,
      };
    }

    const body = (await res.json()) as {
      choices?: { message?: { content?: string | null } }[];
    };
    const text = body.choices?.[0]?.message?.content?.trim() ?? "";
    if (!text) {
      return { ok: false as const, error: "The assistant returned an empty reply." };
    }

    return { ok: true as const, text, source: "llm" as const };
  });
