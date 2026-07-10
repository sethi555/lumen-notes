import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Leaf, PenLine, Mic, Table2, Presentation, FileDown, Search } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lumen Notes — The calm, eye-friendly smart notebook" },
      { name: "description", content: "Handwriting OCR, voice transcription, slides, spreadsheets, PDF export and an AI research companion — in three biologically-optimized themes for eye health." },
      { property: "og:title", content: "Lumen Notes" },
      { property: "og:description", content: "A calm, eye-friendly smart notebook with handwriting, voice, slides, spreadsheets and research." },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: PenLine, title: "Freehand & OCR", desc: "Sketch with a stylus on a smooth canvas, then turn handwriting into editable text." },
  { icon: Mic, title: "Voice notes", desc: "Live transcription plus recorded audio, captured straight into your note." },
  { icon: Table2, title: "Spreadsheets", desc: "Drop in editable tables with inline =SUM() formulas." },
  { icon: Presentation, title: "Instant slides", desc: "Headings become a full-screen slide deck in one tap." },
  { icon: FileDown, title: "PDF export", desc: "Capture any note as a crisp, multi-page PDF." },
  { icon: Search, title: "Research companion", desc: "Inline AI lookups and a web clipper, side by side with your notes." },
];

function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Leaf className="h-5 w-5" />
          </div>
          <span className="font-display text-xl font-semibold">Lumen Notes</span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost"><Link to="/auth">Sign in</Link></Button>
          <Button asChild><Link to="/app">Open notebook</Link></Button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6">
        <section className="py-20 text-center">
          <p className="mb-4 inline-block rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
            Designed for eye comfort
          </p>
          <h1 className="mx-auto max-w-3xl font-display text-5xl font-semibold leading-tight sm:text-6xl">
            A calmer way to capture everything you think.
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            Lumen blends handwriting, voice, spreadsheets, slides and AI research into one workspace —
            with three biologically-optimized themes that go easy on your eyes.
          </p>
          <div className="mt-8 flex justify-center gap-3">
            <Button asChild size="lg"><Link to="/app">Start writing</Link></Button>
            <Button asChild size="lg" variant="outline"><Link to="/auth">Create account</Link></Button>
          </div>
        </section>

        <section className="grid gap-4 pb-24 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-2xl border border-border bg-card p-6">
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                <f.icon className="h-5 w-5" />
              </div>
              <h3 className="font-display text-lg font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}
