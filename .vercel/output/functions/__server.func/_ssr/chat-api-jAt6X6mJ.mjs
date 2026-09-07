import { n as TSS_SERVER_FUNCTION, t as createServerFn } from "./ssr.mjs";
import { t as FAQ_ITEMS } from "./faq-DgDT2Jsl.mjs";
import { a as object, n as array, o as string, t as _enum } from "../_libs/zod.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/chat-api-jAt6X6mJ.js
var createServerRpc = (serverFnMeta, splitImportFn) => {
	const url = "/_serverFn/" + serverFnMeta.id;
	return Object.assign(splitImportFn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var SYSTEM_PROMPT = `You are a helpful support assistant for Noshline, a food delivery app.

You have ONLY two allowed jobs:
1. Answer FAQ questions using ONLY the information in the FAQ section below.
2. Help the user create a support ticket by collecting the required information.

### STRICT RULES (you must follow these at all times):

- You are NOT allowed to answer any question that is not in the FAQ section.
- You are NOT allowed to solve problems, promise refunds, credits, compensation, or investigate issues.
- You are NOT allowed to invent any information, policies, or order details.
- If the user asks anything outside FAQ or ticket creation, reply EXACTLY with:
  "I can only answer questions from our FAQ or help you create a support ticket. Would you like to create a ticket?"

- When the user wants to create a ticket (or reports a problem), follow this exact flow:
  1. Ask for the Order ID (or accept "I don't have it").
  2. Ask for the Problem Type using these options only:
     - Missing item
     - Wrong item
     - Late delivery
     - Never arrived
     - Other
  3. Ask for a short description of the issue.
  4. Show a clear summary of the collected information.
  5. Ask the user to confirm: "Shall I create this ticket? (Yes/No)"
  6. Only after the user confirms with Yes, output the ticket in this EXACT format (you may add one short sentence after it):

TICKET_CREATED
Order ID: [value or "Not provided"]
Problem: [selected type]
Description: [user's description]
Status: Pending

- Collect one piece of information at a time. Do not ask for everything in one message.
- Be polite, clear, and concise.
- Never continue the conversation after outputting TICKET_CREATED except to say that a support agent will review it soon.

### FAQ (Answer ONLY using the information below. Do not add extra details):

${FAQ_ITEMS.map((item) => `Q: ${item.question}\nA: ${item.answer}`).join("\n\n")}
`;
var MessageSchema = object({
	role: _enum(["user", "assistant"]),
	content: string().min(1).max(4e3)
});
var ChatInputSchema = object({ messages: array(MessageSchema).min(1).max(24) });
function resolveProvider() {
	const deepseek = process.env.DEEPSEEK_API_KEY?.trim();
	if (deepseek) {
		const base = (process.env.LLM_BASE_URL ?? "https://api.deepseek.com").replace(/\/$/, "");
		return {
			apiKey: deepseek,
			baseUrl: base.endsWith("/v1") ? base : `${base}/v1`,
			model: process.env.LLM_MODEL ?? "deepseek-chat"
		};
	}
	const xai = process.env.XAI_API_KEY?.trim();
	if (xai) return {
		apiKey: xai,
		baseUrl: "https://api.x.ai/v1",
		model: process.env.LLM_MODEL ?? "grok-4.5"
	};
	return null;
}
var sendChat_createServerFn_handler = createServerRpc({
	id: "3e1c08b2eff370a85fd0b447dc43c5b75431f7b64ce36d3b230fb427c9856d7c",
	name: "sendChat",
	filename: "src/lib/chat/chat-api.ts"
}, (opts) => sendChat.__executeServer(opts));
var sendChat = createServerFn({ method: "POST" }).validator((data) => ChatInputSchema.parse(data)).handler(sendChat_createServerFn_handler, async ({ data }) => {
	const provider = resolveProvider();
	if (!provider) return {
		ok: false,
		error: "The assistant is not available in this environment."
	};
	const res = await fetch(`${provider.baseUrl}/chat/completions`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			Authorization: `Bearer ${provider.apiKey}`
		},
		body: JSON.stringify({
			model: provider.model,
			temperature: .2,
			max_tokens: 420,
			messages: [{
				role: "system",
				content: SYSTEM_PROMPT
			}, ...data.messages.map((m) => ({
				role: m.role,
				content: m.content
			}))]
		})
	});
	if (!res.ok) return {
		ok: false,
		error: `The assistant could not reply (${res.status}). Try again in a moment.`
	};
	const text = (await res.json()).choices?.[0]?.message?.content?.trim() ?? "";
	if (!text) return {
		ok: false,
		error: "The assistant returned an empty reply."
	};
	return {
		ok: true,
		text
	};
});
//#endregion
export { sendChat_createServerFn_handler };
