import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "authorization, content-type",
};

const payloadSchema = z.object({
  title: z.string().max(500).optional(),
  content: z.string().max(50000).default(""),
  source_url: z.string().url().max(2000).optional(),
});

export const Route = createFileRoute("/api/clipper")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: cors }),
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token || token.split(".").length !== 3)
          return new Response(JSON.stringify({ error: "Missing or invalid token" }), {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          });

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON" }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          });
        }
        const parsed = payloadSchema.safeParse(body);
        if (!parsed.success)
          return new Response(JSON.stringify({ error: "Invalid payload" }), {
            status: 400,
            headers: { ...cors, "Content-Type": "application/json" },
          });

        // Act as the user via their bearer token so RLS applies.
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const { data: userRes, error: userErr } = await supabase.auth.getUser(token);
        if (userErr || !userRes.user)
          return new Response(JSON.stringify({ error: "Unauthorized" }), {
            status: 401,
            headers: { ...cors, "Content-Type": "application/json" },
          });

        const { error } = await supabase.from("web_clips").insert({
          user_id: userRes.user.id,
          title: parsed.data.title ?? "Web clip",
          content: parsed.data.content,
          source_url: parsed.data.source_url ?? null,
        });
        if (error)
          return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...cors, "Content-Type": "application/json" },
          });

        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { ...cors, "Content-Type": "application/json" },
        });
      },
    },
  },
});
