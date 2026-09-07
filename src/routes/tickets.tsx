import { createFileRoute, Link } from "@tanstack/react-router";
import { Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useTicketStore } from "@/lib/chat/tickets";

export const Route = createFileRoute("/tickets")({ component: TicketsPage });

function TicketsPage() {
  const tickets = useTicketStore((s) => s.tickets);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  return (
    <AppShell>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-4">
        <p className="text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">
          Inbox
        </p>
        <h1 className="mt-1 font-headline text-3xl font-semibold tracking-tight">Tickets</h1>
        <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">
          Tickets created in chat stay on this device so an agent can review them.
        </p>

        {!ready ? (
          <div className="glass mt-8 h-40 rounded-[1.75rem]" />
        ) : tickets.length === 0 ? (
          <div className="glass mt-8 px-6 py-14 text-center rounded-[1.75rem]">
            <Ticket className="mx-auto size-8 text-primary" />
            <p className="mt-4 font-headline text-xl font-semibold text-foreground">
              No tickets yet
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Start a chat and report an order issue to create one.
            </p>
            <Button asChild className="mt-6">
              <Link to="/">Open chat</Link>
            </Button>
          </div>
        ) : (
          <ul className="mt-8 flex flex-col gap-3">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="glass rounded-[1.75rem] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-sm font-medium tabular-nums text-foreground">
                    {ticket.id}
                  </p>
                  <Badge variant="sage">{ticket.status}</Badge>
                </div>
                <p className="mt-3 text-sm font-medium text-foreground">{ticket.problem}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {ticket.description}
                </p>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                  <div>
                    <dt className="uppercase tracking-[0.12em]">Order ID</dt>
                    <dd className="mt-1 font-medium text-foreground">{ticket.orderId}</dd>
                  </div>
                  <div>
                    <dt className="uppercase tracking-[0.12em]">Opened</dt>
                    <dd className="mt-1 font-medium text-foreground">
                      {new Date(ticket.createdAt).toLocaleString()}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </main>
    </AppShell>
  );
}
