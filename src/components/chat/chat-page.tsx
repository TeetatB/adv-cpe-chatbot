import { BookOpen, Send, Ticket } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { FaqPanel } from "@/components/chat/faq-panel";
import { sendChat } from "@/lib/chat/chat-api";
import { SUGGESTED_PROMPTS } from "@/lib/chat/faq";
import { parseTicketBlock, useTicketStore } from "@/lib/chat/tickets";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  ticketId?: string;
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hello — I can answer Noshline FAQ questions, or help you create a support ticket for an order issue. What do you need?",
};

export function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState(false);
  const [faqOpen, setFaqOpen] = useState(false);
  const scroller = useRef<HTMLDivElement>(null);
  const addTicket = useTicketStore((s) => s.addTicket);

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight, behavior: "smooth" });
  }, [messages, pending]);

  async function submit(text: string) {
    const content = text.trim();
    if (!content || pending) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };
    const next = [...messages, userMessage];
    setMessages(next);
    setDraft("");
    setPending(true);

    try {
      const history = next
        .filter((m) => m.id !== "welcome")
        .map((m) => ({ role: m.role, content: m.content }));
      const result = await sendChat({ data: { messages: history } });
      if (!result.ok) {
        setMessages((curr) => [
          ...curr,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: result.error,
          },
        ]);
        return;
      }

      const parsed = parseTicketBlock(result.text);
      let ticketId: string | undefined;
      if (parsed.ticket) {
        const ticket = addTicket(parsed.ticket);
        ticketId = ticket.id;
        toast.success(`Ticket ${ticket.id} created`);
      }
      setMessages((curr) => [
        ...curr,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: parsed.visible,
          ticketId,
        },
      ]);
    } catch {
      setMessages((curr) => [
        ...curr,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "Something went wrong sending that message. Please try again.",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  function pickFaq(question: string) {
    setFaqOpen(false);
    void submit(question);
  }

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-6xl flex-1 grid-cols-1 gap-4 px-3 lg:grid-cols-[19rem_minmax(0,1fr)] lg:px-5">
      <div className="hidden lg:block">
        <div className="glass sticky top-[5.5rem] max-h-[calc(100dvh-10rem)] overflow-y-auto rounded-[1.75rem] p-5">
          <FaqPanel onPick={pickFaq} />
        </div>
      </div>

      <section className="flex min-h-0 flex-1 flex-col">
        <div className="mb-3 flex items-center justify-between gap-3 px-1">
          <div>
            <p className="font-headline text-[17px] font-semibold text-foreground">Order support</p>
            <p className="text-xs text-muted-foreground">FAQ and tickets only</p>
          </div>
          <Sheet open={faqOpen} onOpenChange={setFaqOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <BookOpen />
                FAQ
              </Button>
            </SheetTrigger>
            <SheetContent side="left" title="FAQ">
              <FaqPanel onPick={pickFaq} />
            </SheetContent>
          </Sheet>
        </div>

        <div
          ref={scroller}
          className="min-h-0 flex-1 overflow-y-auto px-1 py-2"
        >
          <div className="mx-auto flex max-w-2xl flex-col gap-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {pending ? <TypingIndicator /> : null}
            {messages.length === 1 && !pending ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => void submit(prompt)}
                    className="glass rounded-full px-3.5 py-2 text-left text-xs font-medium text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}
          </div>
        </div>

        <form
          className="px-1 pt-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(draft);
          }}
        >
          <div className="glass-strong mx-auto flex max-w-2xl items-center gap-2 rounded-full p-1.5 pl-4">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Ask an FAQ or describe an order issue"
              disabled={pending}
              maxLength={2000}
              aria-label="Message"
              className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              disabled={pending || !draft.trim()}
              size="icon"
              className="rounded-full"
            >
              <Send />
              <span className="sr-only">Send</span>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";
  return (
    <div className={cn("flex flex-col gap-2", mine ? "items-end" : "items-start")}>
      <div
        className={cn(
          "max-w-[min(100%,36rem)] px-4 py-3 text-sm leading-relaxed",
          mine
            ? "rounded-[1.4rem] rounded-br-md bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.35)]"
            : "glass rounded-[1.4rem] rounded-bl-md text-foreground",
        )}
      >
        {message.content}
      </div>
      {message.ticketId ? (
        <Link
          to="/tickets"
          className="glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-foreground"
        >
          <Ticket className="size-3.5 text-success" />
          Ticket {message.ticketId} saved
        </Link>
      ) : null}
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="glass inline-flex items-center gap-1 rounded-[1.4rem] rounded-bl-md px-4 py-3">
      <span className="size-1.5 animate-pulse rounded-full bg-primary" />
      <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:120ms]" />
      <span className="size-1.5 animate-pulse rounded-full bg-primary [animation-delay:240ms]" />
    </div>
  );
}
