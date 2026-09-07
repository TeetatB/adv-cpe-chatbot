import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { d as useRouterState, v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { c as Slot } from "../_libs/@radix-ui/react-dialog+[...].mjs";
import { i as Sun, l as Bike, o as Moon, r as Ticket, s as MessageCircle } from "../_libs/lucide-react.mjs";
import { t as Toaster } from "../_libs/sonner.mjs";
import { n as clsx, t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { t as twMerge } from "../_libs/tailwind-merge.mjs";
import { n as create, t as persist } from "../_libs/zustand.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tickets-DRs5Dcto.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function ThemeToggle() {
	const [mode, setMode] = (0, import_react.useState)("light");
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => {
		const stored = localStorage.getItem("noshline-theme");
		const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
		const next = stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
		apply(next);
		setMode(next);
		setReady(true);
	}, []);
	function apply(next) {
		const root = document.documentElement;
		root.classList.toggle("dark", next === "dark");
		root.classList.toggle("light", next === "light");
		root.dataset.theme = next;
	}
	function toggle() {
		const next = mode === "dark" ? "light" : "dark";
		apply(next);
		localStorage.setItem("noshline-theme", next);
		setMode(next);
	}
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("button", {
		type: "button",
		onClick: toggle,
		className: "inline-flex size-11 items-center justify-center rounded-full text-foreground",
		"aria-label": mode === "dark" ? "Switch to light mode" : "Switch to dark mode",
		children: ready && mode === "dark" ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Sun, { className: "size-4" }) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Moon, { className: "size-4" })
	});
}
function cn(...inputs) {
	return twMerge(clsx(inputs));
}
function AppShell({ children }) {
	const pathname = useRouterState({ select: (s) => s.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
		className: "relative flex min-h-dvh flex-col",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "scene-wash pointer-events-none fixed inset-0 z-0" }),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("header", {
				className: "pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-[1.75rem] px-3 sm:h-16 sm:px-4",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
						to: "/",
						className: "flex items-center gap-2.5 text-foreground",
						children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
							className: "flex size-9 items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]",
							children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Bike, {
								className: "size-4",
								strokeWidth: 2.2
							})
						}), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("span", {
							className: "leading-tight",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block font-headline text-[17px] font-semibold tracking-tight",
								children: "Noshline"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
								className: "block text-[11px] font-medium text-muted-foreground",
								children: "Support"
							})]
						})]
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(ThemeToggle, {})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
				className: "relative z-10 flex min-h-0 flex-1 flex-col pt-[4.75rem] pb-28",
				children
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
					className: "pointer-events-auto glass mx-auto flex h-16 max-w-xs items-center justify-around rounded-full px-2",
					children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLink, {
						to: "/",
						active: pathname === "/",
						label: "Chat",
						icon: MessageCircle
					}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(TabLink, {
						to: "/tickets",
						active: pathname.startsWith("/tickets"),
						label: "Tickets",
						icon: Ticket
					})]
				})
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Toaster, {
				position: "bottom-center",
				richColors: true,
				closeButton: true
			})
		]
	});
}
function TabLink({ to, active, label, icon: Icon }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
		to,
		className: cn("flex h-12 min-w-24 flex-col items-center justify-center gap-0.5 rounded-full px-4 text-[11px] font-medium", active ? "text-primary" : "text-muted-foreground"),
		children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
			className: "size-5",
			strokeWidth: active ? 2.4 : 1.8
		}), label]
	});
}
var buttonVariants = cva("inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[opacity,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-40 active:scale-[0.98] [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0", {
	variants: {
		variant: {
			default: "bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] hover:opacity-90",
			secondary: "glass text-foreground",
			ghost: "text-foreground hover:bg-muted/60",
			outline: "glass text-foreground"
		},
		size: {
			default: "h-11 px-5",
			sm: "h-9 px-3.5 text-xs",
			icon: "size-11"
		}
	},
	defaultVariants: {
		variant: "default",
		size: "default"
	}
});
function Button({ className, variant, size, asChild = false, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(asChild ? Slot : "button", {
		className: cn(buttonVariants({
			variant,
			size,
			className
		})),
		...props
	});
}
var useTicketStore = create()(persist((set, get) => ({
	tickets: [],
	addTicket: (input) => {
		const ticket = {
			id: `NSH-${Date.now().toString(36).toUpperCase()}`,
			createdAt: (/* @__PURE__ */ new Date()).toISOString(),
			orderId: input.orderId.trim() || "Not provided",
			problem: input.problem.trim() || "Other",
			description: input.description.trim(),
			status: "Pending"
		};
		set({ tickets: [ticket, ...get().tickets] });
		return ticket;
	}
}), { name: "noshline-tickets" }));
var TICKET_BLOCK = /TICKET_CREATED\s*\nOrder ID:\s*(.+)\nProblem:\s*(.+)\nDescription:\s*([\s\S]+?)\nStatus:\s*(.+)/i;
function parseTicketBlock(text) {
	const match = text.match(TICKET_BLOCK);
	if (!match) return {
		visible: text,
		ticket: null
	};
	return {
		visible: text.replace(match[0], "").trim() || "Your ticket has been created. A support agent will review it soon.",
		ticket: {
			orderId: match[1].trim(),
			problem: match[2].trim(),
			description: match[3].trim()
		}
	};
}
//#endregion
export { useTicketStore as a, parseTicketBlock as i, Button as n, cn as r, AppShell as t };
