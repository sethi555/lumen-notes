import { useEffect, useMemo, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

// Parses note HTML into slides split on <h1>/<h2> boundaries.
function buildSlides(html: string): { heading: string; body: string }[] {
  if (typeof document === "undefined") return [];
  const doc = new DOMParser().parseFromString(html, "text/html");
  const slides: { heading: string; body: string }[] = [];
  let current: { heading: string; body: string } | null = null;
  doc.body.childNodes.forEach((node) => {
    const el = node as HTMLElement;
    const tag = el.tagName?.toLowerCase();
    if (tag === "h1" || tag === "h2") {
      if (current) slides.push(current);
      current = { heading: el.textContent ?? "", body: "" };
    } else if (current) {
      current.body += el.outerHTML ?? el.textContent ?? "";
    } else if (el.textContent?.trim()) {
      current = { heading: "", body: el.outerHTML ?? "" };
    }
  });
  if (current) slides.push(current);
  return slides.length ? slides : [{ heading: "Empty note", body: "<p>Add some headings to build slides.</p>" }];
}

export function SlidesView({ html, onClose }: { html: string; onClose: () => void }) {
  const slides = useMemo(() => buildSlides(html), [html]);
  const [i, setI] = useState(0);
  const next = useCallback(() => setI((v) => Math.min(v + 1, slides.length - 1)), [slides.length]);
  const prev = useCallback(() => setI((v) => Math.max(v - 1, 0)), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [next, prev, onClose]);

  const slide = slides[i];
  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background">
      <div className="flex items-center justify-between p-4">
        <span className="text-sm text-muted-foreground">{i + 1} / {slides.length}</span>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-12 text-center">
        {slide.heading && <h1 className="font-display text-5xl font-semibold text-foreground">{slide.heading}</h1>}
        <div className="prose-note mt-8 max-w-2xl text-left text-xl text-foreground" dangerouslySetInnerHTML={{ __html: slide.body }} />
      </div>
      <div className="flex items-center justify-center gap-4 p-6">
        <Button variant="outline" size="icon" onClick={prev} disabled={i === 0}><ChevronLeft className="h-5 w-5" /></Button>
        <Button variant="outline" size="icon" onClick={next} disabled={i === slides.length - 1}><ChevronRight className="h-5 w-5" /></Button>
      </div>
    </div>
  );
}
