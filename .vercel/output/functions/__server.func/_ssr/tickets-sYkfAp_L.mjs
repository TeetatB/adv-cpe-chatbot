import { i as __toESM } from "../_runtime.mjs";
import { n as require_react } from "../_libs/@radix-ui/react-compose-refs+[...].mjs";
import { v as Link } from "../_libs/@tanstack/react-router+[...].mjs";
import { n as require_jsx_runtime } from "../_libs/radix-ui__react-context+react.mjs";
import { r as Ticket } from "../_libs/lucide-react.mjs";
import { t as cva } from "../_libs/class-variance-authority+clsx.mjs";
import { a as useTicketStore, n as Button, r as cn, t as AppShell } from "./tickets-DRs5Dcto.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/tickets-sYkfAp_L.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
var badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold", {
	variants: { variant: {
		default: "border-transparent bg-primary text-primary-foreground",
		outline: "border-border text-muted-foreground",
		sage: "border-transparent bg-success/16 text-success"
	} },
	defaultVariants: { variant: "default" }
});
function Badge({ className, variant, ...props }) {
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
		className: cn(badgeVariants({
			variant,
			className
		})),
		...props
	});
}
function TicketsPage() {
	const tickets = useTicketStore((s) => s.tickets);
	const [ready, setReady] = (0, import_react.useState)(false);
	(0, import_react.useEffect)(() => setReady(true), []);
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)(AppShell, { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("main", {
		className: "mx-auto w-full max-w-3xl flex-1 px-4 py-4",
		children: [
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "text-[11px] font-semibold tracking-[0.08em] text-primary uppercase",
				children: "Inbox"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("h1", {
				className: "mt-1 font-headline text-3xl font-semibold tracking-tight",
				children: "Tickets"
			}),
			/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
				className: "mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground",
				children: "Tickets created in chat stay on this device so an agent can review them."
			}),
			!ready ? /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", { className: "glass mt-8 h-40 rounded-[1.75rem]" }) : tickets.length === 0 ? /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
				className: "glass mt-8 px-6 py-14 text-center rounded-[1.75rem]",
				children: [
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Ticket, { className: "mx-auto size-8 text-primary" }),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-4 font-headline text-xl font-semibold text-foreground",
						children: "No tickets yet"
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
						className: "mt-2 text-sm text-muted-foreground",
						children: "Start a chat and report an order issue to create one."
					}),
					/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Button, {
						asChild: true,
						className: "mt-6",
						children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Link, {
							to: "/",
							children: "Open chat"
						})
					})
				]
			}) : /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
				className: "mt-8 flex flex-col gap-3",
				children: tickets.map((ticket) => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("li", {
					className: "glass rounded-[1.75rem] p-5",
					children: [
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
							className: "flex flex-wrap items-center justify-between gap-2",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
								className: "font-mono text-sm font-medium tabular-nums text-foreground",
								children: ticket.id
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)(Badge, {
								variant: "sage",
								children: ticket.status
							})]
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-3 text-sm font-medium text-foreground",
							children: ticket.problem
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
							className: "mt-1 text-sm leading-relaxed text-muted-foreground",
							children: ticket.description
						}),
						/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("dl", {
							className: "mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground",
							children: [/* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "uppercase tracking-[0.12em]",
								children: "Order ID"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "mt-1 font-medium text-foreground",
								children: ticket.orderId
							})] }), /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", { children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("dt", {
								className: "uppercase tracking-[0.12em]",
								children: "Opened"
							}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("dd", {
								className: "mt-1 font-medium text-foreground",
								children: new Date(ticket.createdAt).toLocaleString()
							})] })]
						})
					]
				}, ticket.id))
			})
		]
	}) });
}
//#endregion
export { TicketsPage as component };
