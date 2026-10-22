import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Minutes — Meeting notes into action" },
      { name: "description", content: "Turn long meeting notes into summaries, action items, schedules and follow-up emails." },
      { property: "og:title", content: "Minutes — Meeting notes into action" },
      { property: "og:description", content: "Summaries, decisions, tasks, schedules and follow-up emails from your meeting notes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  const [notes, setNotes] = useState("");
  const [out, setOut] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ctrl = useRef<AbortController | null>(null);

  async function run() {
    setBusy(true);
    setError("");
    setOut("");
    ctrl.current = new AbortController();
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes }),
        signal: ctrl.current.signal,
      });
      if (!res.ok || !res.body) throw new Error((await res.text()) || "Something went wrong.");
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let text = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += dec.decode(value, { stream: true });
        setOut(text);
      }
      if (!text) setError("No result came back. Please try again in a moment.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-6 py-14">
        <header className="mb-10">
          <p className="text-sm uppercase tracking-[0.25em] text-primary">Executive Assistant</p>
          <h1 className="mt-3 font-display text-5xl text-foreground md:text-6xl">Minutes, made useful.</h1>
          <p className="mt-4 max-w-xl text-muted-foreground">
            Paste your meeting notes. Get a summary, decisions, owned action items, schedules and three ready-to-send follow-up emails.
          </p>
        </header>
        <div className="grid gap-8 lg:grid-cols-[2fr_3fr]">
          <section className="flex flex-col gap-4">
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Paste meeting notes or a transcript…"
              className="min-h-[420px] w-full rounded-lg border border-input bg-card p-4 text-sm text-card-foreground shadow-soft outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-3">
              <button
                onClick={run}
                disabled={busy || notes.trim().length < 20}
                className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
              >
                {busy ? "Working…" : "Create brief"}
              </button>
              {busy && (
                <button onClick={() => ctrl.current?.abort()} className="rounded-md border border-border px-5 py-2.5 text-sm text-foreground">
                  Stop
                </button>
              )}
              {out && !busy && (
                <button onClick={() => navigator.clipboard.writeText(out)} className="rounded-md border border-border px-5 py-2.5 text-sm text-foreground">
                  Copy
                </button>
              )}
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </section>
          <section className="min-h-[420px] rounded-lg border border-border bg-card p-8 shadow-soft">
            {out ? (
              <article className="brief">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
              </article>
            ) : (
              <p className="text-muted-foreground">{busy ? "Reading your notes…" : "Your brief will appear here."}</p>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}
