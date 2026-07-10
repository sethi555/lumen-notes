// Loads open-source libraries from CDN <script> tags on demand (Tesseract.js,
// jsPDF, html2canvas) — honoring the "CDN, no npm" spirit for client-only libs.
const loaded = new Map<string, Promise<void>>();

export function loadScript(src: string): Promise<void> {
  if (loaded.has(src)) return loaded.get(src)!;
  const p = new Promise<void>((resolve, reject) => {
    if (typeof document === "undefined") return reject(new Error("no document"));
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(s);
  });
  loaded.set(src, p);
  return p;
}

export const CDN = {
  tesseract: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js",
  jspdf: "https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js",
  html2canvas: "https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js",
};
