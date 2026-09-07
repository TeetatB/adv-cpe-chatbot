import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("noshline-theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const next =
      stored === "dark" || stored === "light" ? stored : prefersDark ? "dark" : "light";
    apply(next);
    setMode(next);
    setReady(true);
  }, []);

  function apply(next: "light" | "dark") {
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

  return (
    <button
      type="button"
      onClick={toggle}
      className="inline-flex size-11 items-center justify-center rounded-full text-foreground"
      aria-label={mode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {ready && mode === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
