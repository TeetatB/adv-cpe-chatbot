import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { ChatPage } from "@/components/chat/chat-page";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  return (
    <AppShell>
      <ChatPage />
    </AppShell>
  );
}
