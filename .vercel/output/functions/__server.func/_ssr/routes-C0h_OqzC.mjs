import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { a as DialogPortal, i as DialogOverlay, n as DialogClose, o as DialogTitle, r as DialogContent, s as DialogTrigger, t as Dialog } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { n as TSS_SERVER_FUNCTION, r as getServerFnById, t as createServerFn } from "./ssr.mjs";
import { n as SUGGESTED_PROMPTS, t as FAQ_ITEMS } from "./faq-DgDT2Jsl.mjs";
import { a as object, n as array, o as string, t as _enum } from "../_libs/zod.mjs";
import { a as Send, c as BookOpen, r as Ticket, t as X } from "../_libs/lucide-react.mjs";
import { n as toast } from "../_libs/sonner.mjs";
import { a as useTicketStore, i as parseTicketBlock, n as Button, r as cn, t as AppShell } from "./tickets-DRs5Dcto.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/routes-C0h_OqzC.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function Input({ className, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("input", {
		suppressHydrationWarning: true,
		className: cn("flex h-11 w-full rounded-full border border-border bg-transparent px-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className),
		...props
	});
}
var Sheet = Dialog;
var SheetTrigger = DialogTrigger;
function SheetContent({ className, children, side = "right", title, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogPortal, { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogOverlay, { className: "fixed inset-0 z-50 bg-foreground/20 backdrop-blur-sm" }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogContent, {
		className: cn("glass-strong fixed z-50 flex h-full w-[min(100%,20rem)] flex-col p-5 outline-none", side === "right" ? "inset-y-0 right-0" : "inset-y-0 left-0", className),
		...props,
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "mb-4 flex items-center justify-between",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(DialogTitle, {
				className: "font-headline text-lg font-semibold text-foreground",
				children: title
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(DialogClose, {
				className: "inline-flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground",
				children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(X, { className: "size-4" }), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
					className: "sr-only",
					children: "Close"
				})]
			})]
		}), children]
	})] });
}
function FaqPanel({ onPick }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("aside", {
		className: "flex h-full flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mb-1 text-[11px] font-semibold tracking-[0.08em] text-primary uppercase",
				children: "Application FAQ"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h2", {
				className: "font-headline text-2xl font-semibold tracking-tight text-foreground",
				children: "Common questions"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 text-sm leading-relaxed text-muted-foreground",
				children: "The assistant answers only these topics, or helps you open a ticket."
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-5 flex flex-1 flex-col gap-2 overflow-y-auto pb-2",
				children: FAQ_ITEMS.map((item) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
					type: "button",
					onClick: () => onPick(item.question),
					className: "w-full rounded-[1.25rem] bg-muted/50 px-3.5 py-3 text-left transition-colors duration-[var(--motion-quick)] hover:bg-muted",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
						className: "block text-sm font-medium text-foreground",
						children: item.question
					})
				}) }, item.id))
			})
		]
	});
}
var createSsrRpc = (functionId) => {
	const url = "/_serverFn/" + functionId;
	const serverFnMeta = { id: functionId };
	const fn = async (...args) => {
		return (await getServerFnById(functionId, { origin: "server" }))(...args);
	};
	return Object.assign(fn, {
		url,
		serverFnMeta,
		[TSS_SERVER_FUNCTION]: true
	});
};
var MessageSchema = object({
	role: _enum(["user", "assistant"]),
	content: string().min(1).max(4e3)
});
var ChatInputSchema = object({ messages: array(MessageSchema).min(1).max(24) });
var sendChat = createServerFn({ method: "POST" }).validator((data) => ChatInputSchema.parse(data)).handler(createSsrRpc("3e1c08b2eff370a85fd0b447dc43c5b75431f7b64ce36d3b230fb427c9856d7c"));
var WELCOME = {
	id: "welcome",
	role: "assistant",
	content: "Hello — I can answer Noshline FAQ questions, or help you create a support ticket for an order issue. What do you need?"
};
function ChatPage() {
	const [messages, setMessages] = (0, import_react.useState)([WELCOME]);
	const [draft, setDraft] = (0, import_react.useState)("");
	const [pending, setPending] = (0, import_react.useState)(false);
	const [faqOpen, setFaqOpen] = (0, import_react.useState)(false);
	const scroller = (0, import_react.useRef)(null);
	const addTicket = useTicketStore((s) => s.addTicket);
	(0, import_react.useEffect)(() => {
		scroller.current?.scrollTo({
			top: scroller.current.scrollHeight,
			behavior: "smooth"
		});
	}, [messages, pending]);
	async function submit(text) {
		const content = text.trim();
		if (!content || pending) return;
		const userMessage = {
			id: crypto.randomUUID(),
			role: "user",
			content
		};
		const next = [...messages, userMessage];
		setMessages(next);
		setDraft("");
		setPending(true);
		try {
			const result = await sendChat({ data: { messages: next.filter((m) => m.id !== "welcome").map((m) => ({
				role: m.role,
				content: m.content
			})) } });
			if (!result.ok) {
				setMessages((curr) => [...curr, {
					id: crypto.randomUUID(),
					role: "assistant",
					content: result.error
				}]);
				return;
			}
			const parsed = parseTicketBlock(result.text);
			let ticketId;
			if (parsed.ticket) {
				const ticket = addTicket(parsed.ticket);
				ticketId = ticket.id;
				toast.success(`Ticket ${ticket.id} created`);
			}
			setMessages((curr) => [...curr, {
				id: crypto.randomUUID(),
				role: "assistant",
				content: parsed.visible,
				ticketId
			}]);
		} catch {
			setMessages((curr) => [...curr, {
				id: crypto.randomUUID(),
				role: "assistant",
				content: "Something went wrong sending that message. Please try again."
			}]);
		} finally {
			setPending(false);
		}
	}
	function pickFaq(question) {
		setFaqOpen(false);
		submit(question);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-3 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-5",
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: "hidden lg:block",
			children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "glass sticky top-[5.5rem] max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-[1.75rem] p-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaqPanel, { onPick: pickFaq })
			})
		}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("section", {
			className: "flex min-h-0 flex-1 flex-col",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "mb-3 flex items-center justify-between gap-3 px-1",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "font-headline text-[17px] font-semibold text-foreground",
						children: "Order support"
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "text-xs text-muted-foreground",
						children: "FAQ and tickets only"
					})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Sheet, {
						open: faqOpen,
						onOpenChange: setFaqOpen,
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetTrigger, {
							asChild: true,
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
								variant: "outline",
								size: "sm",
								className: "lg:hidden",
								children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(BookOpen, {}), "FAQ"]
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(SheetContent, {
							side: "left",
							title: "FAQ",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(FaqPanel, { onPick: pickFaq })
						})]
					})]
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
					ref: scroller,
					className: "min-h-0 flex-1 overflow-y-auto px-1 py-2",
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "mx-auto flex max-w-2xl flex-col gap-3",
						children: [
							messages.map((message) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)(MessageBubble, { message }, message.id)),
							pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TypingIndicator, {}) : null,
							messages.length === 1 && !pending ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
								className: "flex flex-wrap gap-2 pt-1",
								children: SUGGESTED_PROMPTS.map((prompt) => /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
									type: "button",
									onClick: () => void submit(prompt),
									className: "glass rounded-full px-3.5 py-2 text-left text-xs font-medium text-foreground",
									children: prompt
								}, prompt))
							}) : null
						]
					})
				}),
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)("form", {
					className: "px-1 pt-3",
					onSubmit: (e) => {
						e.preventDefault();
						submit(draft);
					},
					children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
						className: "glass-strong mx-auto flex max-w-2xl items-center gap-2 rounded-full p-1.5 pl-4",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Input, {
							value: draft,
							onChange: (e) => setDraft(e.target.value),
							placeholder: "Ask an FAQ or describe an order issue",
							disabled: pending,
							maxLength: 2e3,
							"aria-label": "Message",
							className: "h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Button, {
							type: "submit",
							disabled: pending || !draft.trim(),
							size: "icon",
							className: "rounded-full",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Send, {}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "sr-only",
								children: "Send"
							})]
						})]
					})
				})
			]
		})]
	});
}
function MessageBubble({ message }) {
	const mine = message.role === "user";
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: cn("flex flex-col gap-2", mine ? "items-end" : "items-start"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
			className: cn("max-w-[min(100%,36rem)] px-4 py-3 text-sm leading-relaxed", mine ? "rounded-[1.4rem] rounded-br-md bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]" : "glass rounded-[1.4rem] rounded-bl-md text-foreground"),
			children: message.content
		}), message.ticketId ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
			to: "/tickets",
			className: "glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-foreground",
			children: [
				/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "size-3.5 text-success" }),
				"Ticket ",
				message.ticketId,
				" saved"
			]
		}) : null]
	});
}
function TypingIndicator() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "glass inline-flex items-center gap-1 rounded-[1.4rem] rounded-bl-md px-4 py-3",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 animate-pulse rounded-full bg-primary" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 animate-pulse rounded-full bg-primary [animation-delay:120ms]" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "size-1.5 animate-pulse rounded-full bg-primary [animation-delay:240ms]" })
		]
	});
}
function Home() {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ChatPage, {}) });
}
//#endregion
export { Home as component };
