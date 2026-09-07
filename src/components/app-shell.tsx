import { Link, useRouterState } from "@tanstack/react-router";
import { Bike, MessageCircle, Ticket } from "lucide-react";
import type { ReactNode } from "react";
import { Toaster } from "sonner";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="relative flex min-h-dvh flex-col">
      <div className="scene-wash pointer-events-none fixed inset-0 z-0" />

      <header className="pointer-events-none fixed inset-x-0 top-0 z-30 px-3 pt-3 sm:px-5">
        <div className="pointer-events-auto glass mx-auto flex h-14 max-w-5xl items-center justify-between rounded-[1.75rem] px-3 sm:h-16 sm:px-4">
          <Link to="/" className="flex items-center gap-2.5 text-foreground">
            <span className="flex size-9 items-center justify-center rounded-[1.1rem] bg-primary text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.4)]">
              <Bike className="size-4" strokeWidth={2.2} />
            </span>
            <span className="leading-tight">
              <span className="block font-headline text-[17px] font-semibold tracking-tight">
                Lukchang Move
              </span>
              <span className="block text-[11px] font-medium text-muted-foreground">Support</span>
            </span>
          </Link>
          <ThemeToggle />
        </div>
      </header>

      <div className="relative z-10 flex min-h-0 flex-1 flex-col pt-[4.75rem] pb-28">
        {children}
      </div>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-30 px-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto glass mx-auto flex h-16 max-w-xs items-center justify-around rounded-full px-2">
          <TabLink to="/" active={pathname === "/"} label="Chat" icon={MessageCircle} />
          <TabLink
            to="/tickets"
            active={pathname.startsWith("/tickets")}
            label="Tickets"
            icon={Ticket}
          />
        </div>
      </nav>

      <Toaster position="bottom-center" richColors closeButton />
    </div>
  );
}

function TabLink({
  to,
  active,
  label,
  icon: Icon,
}: {
  to: "/" | "/tickets";
  active: boolean;
  label: string;
  icon: typeof MessageCircle;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex h-12 min-w-24 flex-col items-center justify-center gap-0.5 rounded-full px-4 text-[11px] font-medium",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className="size-5" strokeWidth={active ? 2.4 : 1.8} />
      {label}
    </Link>
  );
}
