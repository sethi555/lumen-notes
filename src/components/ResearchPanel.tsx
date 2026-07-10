import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Sparkles, Globe, Bookmark, Loader2, Copy, Plus } from "lucide-react";
import { aiResearch, fetchWebPage } from "@/lib/research.functions";
import { toast } from "sonner";

export function ResearchPanel({ noteContext, onInsert, clipperToken }: {
  noteContext: string;
  onInsert: (text: string) => void;
  clipperToken?: string;
}) {
  const [q, setQ] = useState("");
  const [answer, setAnswer] = useState("");
  const [url, setUrl] = useState("");
  const [page, setPage] = useState<{ title: string; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const ask = async () => {
    if (!q.trim()) return;
    setBusy(true); setAnswer("");
    try {
      const res = await aiResearch({ data: { query: q, context: noteContext.slice(0, 6000) } });
      if (res.error) toast.error(res.error);
      setAnswer(res.answer || "");
    } finally { setBusy(false); }
  };

  const clip = async () => {
    if (!url.trim()) return;
    setBusy(true); setPage(null);
    try {
      const res = await fetchWebPage({ data: { url } });
      if (res.error) toast.error(res.error);
      else setPage({ title: res.title, text: res.text });
    } finally { setBusy(false); }
  };

  const bookmarklet = `javascript:(function(){var t=window.getSelection().toString()||document.body.innerText.slice(0,4000);fetch('${typeof window !== "undefined" ? window.location.origin : ""}/api/public/clipper',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer ${clipperToken ?? "YOUR_TOKEN"}'},body:JSON.stringify({title:document.title,source_url:location.href,content:t})}).then(function(){alert('Saved to Lumen Notes')}).catch(function(){alert('Clip failed')});})();`;

  return (
    <div className="flex h-full flex-col border-l border-border bg-card">
      <Tabs defaultValue="ai" className="flex flex-1 flex-col">
        <TabsList className="m-2 grid grid-cols-3">
          <TabsTrigger value="ai"><Sparkles className="mr-1 h-4 w-4" />AI</TabsTrigger>
          <TabsTrigger value="web"><Globe className="mr-1 h-4 w-4" />Web</TabsTrigger>
          <TabsTrigger value="clip"><Bookmark className="mr-1 h-4 w-4" />Clipper</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="flex-1 overflow-auto px-3 pb-3">
          <div className="flex gap-2">
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Ask about your note…" onKeyDown={(e) => e.key === "Enter" && ask()} />
            <Button onClick={ask} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ask"}</Button>
          </div>
          {answer && (
            <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
              <p className="whitespace-pre-wrap text-foreground">{answer}</p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => onInsert(answer)}><Plus className="mr-1 h-3 w-3" />Insert into note</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="web" className="flex-1 overflow-auto px-3 pb-3">
          <div className="flex gap-2">
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://…" onKeyDown={(e) => e.key === "Enter" && clip()} />
            <Button onClick={clip} disabled={busy}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Fetch"}</Button>
          </div>
          {page && (
            <div className="mt-3 rounded-lg border border-border bg-background p-3 text-sm">
              <h4 className="font-display font-semibold text-foreground">{page.title}</h4>
              <p className="mt-2 max-h-60 overflow-auto whitespace-pre-wrap text-muted-foreground">{page.text}</p>
              <Button size="sm" variant="ghost" className="mt-2" onClick={() => onInsert(`${page.title}\n${page.text.slice(0, 1500)}`)}><Plus className="mr-1 h-3 w-3" />Insert excerpt</Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clip" className="flex-1 overflow-auto px-3 pb-3">
          <p className="text-sm text-muted-foreground">Drag this bookmarklet to your bookmarks bar. Select text on any page and click it to clip into Lumen Notes.</p>
          <Textarea readOnly value={bookmarklet} className="mt-3 h-32 font-mono text-xs" />
          <Button size="sm" variant="outline" className="mt-2" onClick={() => { navigator.clipboard.writeText(bookmarklet); toast.success("Bookmarklet copied"); }}>
            <Copy className="mr-1 h-3 w-3" />Copy bookmarklet
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
}
