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

const FALLBACK_MESSAGE =
  "I can only answer questions from our FAQ or help you create a support ticket. Would you like to create a ticket?";

function looksLikeTicketRequest(text: string): boolean {
  return (
    /\b(create (a )?ticket|missing item|wrong item|never arrived|order issue|report (a )?problem)\b/i.test(
      text,
    ) || /\bmy order\b.*\b(late|missing|wrong|problem)\b/i.test(text)
  );
}

function hasTicketContext(messages: z.infer<typeof MessageSchema>[]): boolean {
  return messages.some((message) =>
    /\border id\b|\bproblem type\b|\bshall i create this ticket\b/i.test(message.content),
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
    if (!hasTicketContext(data.messages) && !looksLikeTicketRequest(latestMessage)) {
      const faq = classifyFaq(latestMessage);
      if (!faq) return { ok: true as const, text: FALLBACK_MESSAGE };

      const answer = FAQ_ITEMS.find((item) => item.id === faq.id)?.answer;
      if (answer) return { ok: true as const, text: answer };
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

    return { ok: true as const, text };
  });
