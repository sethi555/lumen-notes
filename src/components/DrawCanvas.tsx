import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, ScanText, Loader2, Check, X } from "lucide-react";
import { loadScript, CDN } from "@/lib/cdn";
import { toast } from "sonner";

type Pt = { x: number; y: number };

export function DrawCanvas({ onInsertText, onClose }: { onInsertText: (text: string) => void; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokes = useRef<Pt[][]>([]);
  const current = useRef<Pt[]>([]);
  const drawing = useRef(false);
  const [ocrBusy, setOcrBusy] = useState(false);

  const resize = () => {
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    c.width = rect.width * dpr;
    c.height = rect.height * dpr;
    const ctx = c.getContext("2d")!;
    ctx.scale(dpr, dpr);
    redraw();
  };

  // Smooths a raw pointer path with a quadratic midpoint curve for clean strokes.
  const drawStroke = (ctx: CanvasRenderingContext2D, pts: Pt[]) => {
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length - 1; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      ctx.quadraticCurveTo(pts[i].x, pts[i].y, mid.x, mid.y);
    }
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  };

  const redraw = () => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d")!;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.fillStyle = getComputedStyle(document.body).backgroundColor || "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.strokeStyle = getComputedStyle(document.body).color || "#000";
    ctx.lineWidth = 2.5;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    strokes.current.forEach((s) => drawStroke(ctx, s));
  };

  useEffect(() => {
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pos = (e: React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const down = (e: React.PointerEvent) => { drawing.current = true; current.current = [pos(e)]; canvasRef.current?.setPointerCapture(e.pointerId); };
  const move = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    current.current.push(pos(e));
    const ctx = canvasRef.current!.getContext("2d")!;
    redraw();
    drawStroke(ctx, current.current);
  };
  const up = () => { if (!drawing.current) return; drawing.current = false; if (current.current.length > 1) strokes.current.push(current.current); current.current = []; };

  const clear = () => { strokes.current = []; redraw(); };

  const runOcr = async () => {
    if (!strokes.current.length) return toast.error("Draw something first.");
    setOcrBusy(true);
    try {
      await loadScript(CDN.tesseract);
      const T = (window as any).Tesseract;
      const dataUrl = canvasRef.current!.toDataURL("image/png");
      const { data } = await T.recognize(dataUrl, "eng");
      const text = (data.text || "").trim();
      if (!text) toast.error("No text recognized — try writing larger.");
      else { onInsertText(text); toast.success("Handwriting converted"); onClose(); }
    } catch {
      toast.error("OCR failed to load.");
    } finally {
      setOcrBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background/95 backdrop-blur">
      <div className="flex items-center justify-between border-b border-border p-3">
        <span className="font-display text-lg font-semibold">Handwriting canvas</span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={clear}><Eraser className="mr-1 h-4 w-4" />Clear</Button>
          <Button size="sm" onClick={runOcr} disabled={ocrBusy}>
            {ocrBusy ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <ScanText className="mr-1 h-4 w-4" />}
            Convert to text
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="h-5 w-5" /></Button>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerLeave={up}
        className="flex-1 touch-none"
        style={{ touchAction: "none" }}
      />
      <p className="border-t border-border p-2 text-center text-xs text-muted-foreground">
        <Check className="mr-1 inline h-3 w-3" />Strokes are smoothed automatically. Write clearly for best OCR results.
      </p>
    </div>
  );
}
