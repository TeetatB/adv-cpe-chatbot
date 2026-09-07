import { FAQ_ITEMS } from "@/lib/chat/faq";

export function FaqPanel({
  onPick,
}: {
  onPick: (question: string) => void;
}) {
  return (
    <aside className="flex h-full flex-col">
      <p className="mb-1 text-[11px] font-semibold tracking-[0.08em] text-primary uppercase">
        Application FAQ
      </p>
      <h2 className="font-headline text-2xl font-semibold tracking-tight text-foreground">
        Common questions
      </h2>
      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
        The assistant answers only these topics, or helps you open a ticket.
      </p>
      <ul className="mt-5 flex flex-1 flex-col gap-2 overflow-y-auto pb-2">
        {FAQ_ITEMS.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              onClick={() => onPick(item.question)}
              className="w-full rounded-[1.25rem] bg-muted/50 px-3.5 py-3 text-left transition-colors duration-[var(--motion-quick)] hover:bg-muted"
            >
              <span className="block text-sm font-medium text-foreground">
                {item.question}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </aside>
  );
}
