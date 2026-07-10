import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* AI research lookup via Lovable AI Gateway (replaces the PHP curl→AI proxy). */
export const aiResearch = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { query: string; context?: string }) =>
    z.object({ query: z.string().min(1).max(4000), context: z.string().max(8000).optional() }).parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) return { answer: "", error: "AI is not configured." };
    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            {
              role: "system",
              content:
                "You are a concise research companion inside a note-taking app. Answer clearly with short paragraphs and bullet points where useful. If the user supplied note context, ground your answer in it.",
            },
            {
              role: "user",
              content: data.context ? `Note context:\n${data.context}\n\nQuestion: ${data.query}` : data.query,
            },
          ],
        }),
      });
      if (res.status === 429) return { answer: "", error: "Rate limit reached. Please retry shortly." };
      if (res.status === 402) return { answer: "", error: "AI credits exhausted. Add credits to continue." };
      if (!res.ok) return { answer: "", error: `Lookup failed (${res.status}).` };
      const json = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      return { answer: json.choices?.[0]?.message?.content ?? "", error: null as string | null };
    } catch (e) {
      return { answer: "", error: e instanceof Error ? e.message : "Lookup failed." };
    }
  });

/* Safe server-side web fetch proxy (replaces PHP curl) — returns readable text. */
export const fetchWebPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { url: string }) => z.object({ url: z.string().url().max(2000) }).parse(d))
  .handler(async ({ data }) => {
    let parsed: URL;
    try {
      parsed = new URL(data.url);
    } catch {
      return { title: "", text: "", error: "Invalid URL." };
    }
    if (!["http:", "https:"].includes(parsed.protocol)) return { title: "", text: "", error: "Only http(s) URLs allowed." };
    const host = parsed.hostname;
    if (/^(localhost|127\.|0\.0\.0\.0|10\.|192\.168\.|169\.254\.|::1)/i.test(host))
      return { title: "", text: "", error: "Blocked host." };
    try {
      const res = await fetch(parsed.toString(), { headers: { "User-Agent": "LumenNotes/1.0" } });
      if (!res.ok) return { title: "", text: "", error: `Fetch failed (${res.status}).` };
      const html = await res.text();
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? parsed.hostname;
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 12000);
      return { title, text, error: null as string | null };
    } catch (e) {
      return { title: "", text: "", error: e instanceof Error ? e.message : "Fetch failed." };
    }
  });
