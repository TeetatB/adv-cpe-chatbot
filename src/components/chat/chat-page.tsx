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
  source?: "faq" | "llm";
  faqConfidence?: number;
};

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "สวัสดีค่ะ ฉันตอบคำถามที่พบบ่อยของ Lukchang Move หรือช่วยเปิดตั๋วแจ้งปัญหาเกี่ยวกับออเดอร์ให้ได้ค่ะ วันนี้ต้องการให้ช่วยเรื่องอะไรคะ",
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
        toast.success(`เปิดตั๋ว ${ticket.id} เรียบร้อยแล้ว`);
      }
      setMessages((curr) => [
        ...curr,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: parsed.visible,
          ticketId,
          source: result.source,
          faqConfidence: result.source === "faq" ? result.confidence : undefined,
        },
      ]);
    } catch {
      setMessages((curr) => [
        ...curr,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "เกิดข้อผิดพลาดในการส่งข้อความ กรุณาลองใหม่อีกครั้งค่ะ",
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
            <p className="font-headline text-[17px] font-semibold text-foreground">
              ศูนย์ช่วยเหลือออเดอร์
            </p>
            <p className="text-xs text-muted-foreground">ตอบเฉพาะ FAQ และเปิดตั๋วแจ้งปัญหาเท่านั้น</p>
          </div>
          <Sheet open={faqOpen} onOpenChange={setFaqOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="lg:hidden">
                <BookOpen />
                FAQ
              </Button>
            </SheetTrigger>
            <SheetContent side="left" title="คำถามที่พบบ่อย">
              <FaqPanel onPick={pickFaq} />
            </SheetContent>
          </Sheet>
        </div>

        <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto px-1 py-2">
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
              placeholder="ถามคำถามที่พบบ่อย หรืออธิบายปัญหาของออเดอร์"
              disabled={pending}
              maxLength={2000}
              aria-label="ข้อความ"
              className="h-11 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            />
            <Button
              type="submit"
              disabled={pending || !draft.trim()}
              size="icon"
              className="rounded-full"
            >
              <Send />
              <span className="sr-only">ส่ง</span>
            </Button>
          </div>
        </form>
      </section>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const mine = message.role === "user";
  // เหนือเกณฑ์นี้ถือว่าค่อนข้างมั่นใจ ไม่ต้องเตือนผู้ใช้เพิ่ม
  // ต่ำกว่านี้ (แต่ยังผ่าน threshold ที่ยอมรับคำตอบ) ให้แสดง hint สั้นๆ แทนตัวเลขดิบ
  // เพื่อไม่ให้ผู้ใช้ทั่วไปต้องตีความ % เอง
  const isLowConfidenceFaqMatch =
    message.source === "faq" &&
    typeof message.faqConfidence === "number" &&
    message.faqConfidence < 0.6;

  return (
    <div className={cn("flex flex-col gap-2", mine ? "items-end" : "items-start")}>
      {message.source === "faq" ? (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-[11px] font-medium text-primary">
          <BookOpen className="size-3" />
          คำตอบสำเร็จรูปจาก FAQ
        </span>
      ) : null}
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
      {isLowConfidenceFaqMatch ? (
        <p className="max-w-[min(100%,36rem)] text-[11px] text-muted-foreground">
          หากคำตอบนี้ไม่ตรงกับสิ่งที่ถาม พิมพ์อธิบายเพิ่มเติมได้เลยค่ะ
        </p>
      ) : null}
      {message.ticketId ? (
        <Link
          to="/tickets"
          className="glass inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-medium text-foreground"
        >
          <Ticket className="size-3.5 text-success" />
          บันทึกตั๋ว {message.ticketId} แล้ว
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
