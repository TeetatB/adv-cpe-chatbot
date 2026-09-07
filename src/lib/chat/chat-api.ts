import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
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

function resolveProvider(): LlmProvider | null {
  const deepseek = process.env.DEEPSEEK_API_KEY?.trim();
  if (deepseek) {
    const base = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(
      /\/$/,
      "",
    );
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
