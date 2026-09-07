import { create } from "zustand";
import { persist } from "zustand/middleware";

export const PROBLEM_TYPES = [
  "Missing item",
  "Wrong item",
  "Late delivery",
  "Never arrived",
  "Other",
] as const;

export type ProblemType = (typeof PROBLEM_TYPES)[number];

export type SupportTicket = {
  id: string;
  createdAt: string;
  orderId: string;
  problem: string;
  description: string;
  status: "Pending";
};

type TicketStore = {
  tickets: SupportTicket[];
  addTicket: (ticket: Omit<SupportTicket, "id" | "createdAt" | "status">) => SupportTicket;
};

export const useTicketStore = create<TicketStore>()(
  persist(
    (set, get) => ({
      tickets: [],
      addTicket: (input) => {
        const ticket: SupportTicket = {
          id: `NSH-${Date.now().toString(36).toUpperCase()}`,
          createdAt: new Date().toISOString(),
          orderId: input.orderId.trim() || "Not provided",
          problem: input.problem.trim() || "Other",
          description: input.description.trim(),
          status: "Pending",
        };
        set({ tickets: [ticket, ...get().tickets] });
        return ticket;
      },
    }),
    { name: "noshline-tickets" },
  ),
);

const TICKET_BLOCK =
  /TICKET_CREATED\s*\nOrder ID:\s*(.+)\nProblem:\s*(.+)\nDescription:\s*([\s\S]+?)\nStatus:\s*(.+)/i;

export function parseTicketBlock(text: string): {
  visible: string;
  ticket: Omit<SupportTicket, "id" | "createdAt" | "status"> | null;
} {
  const match = text.match(TICKET_BLOCK);
  if (!match) return { visible: text, ticket: null };

  const visible = text.replace(match[0], "").trim();
  return {
    visible:
      visible ||
      "Your ticket has been created. A support agent will review it soon.",
    ticket: {
      orderId: match[1].trim(),
      problem: match[2].trim(),
      description: match[3].trim(),
    },
  };
}
