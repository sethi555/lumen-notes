import { loadScript, CDN } from "./cdn";

// Universal PDF export using html2canvas + jsPDF from CDN (multi-page).
export async function exportElementToPdf(el: HTMLElement, filename = "note.pdf") {
  await Promise.all([loadScript(CDN.html2canvas), loadScript(CDN.jspdf)]);
  const w = window as unknown as {
    html2canvas: (e: HTMLElement, o?: Record<string, unknown>) => Promise<HTMLCanvasElement>;
    jspdf: { jsPDF: new (o: Record<string, unknown>) => any };
  };
  const bg = getComputedStyle(document.body).backgroundColor || "#ffffff";
  const canvas = await w.html2canvas(el, { scale: 2, backgroundColor: bg, useCORS: true });
  const img = canvas.toDataURL("image/png");
  const pdf = new w.jspdf.jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  const imgH = (canvas.height * pageW) / canvas.width;
  let left = imgH;
  let pos = 0;
  pdf.addImage(img, "PNG", 0, pos, pageW, imgH);
  left -= pageH;
  while (left > 0) {
    pos -= pageH;
    pdf.addPage();
    pdf.addImage(img, "PNG", 0, pos, pageW, imgH);
    left -= pageH;
  }
  pdf.save(filename);
}
