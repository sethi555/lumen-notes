import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const uuid = z.string().uuid();

/* ---------- Folders ---------- */
export const listFolders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("folders")
      .select("id,name,color,parent_id,position")
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; parent_id?: string | null; color?: string | null }) =>
    z.object({ name: z.string().min(1).max(120), parent_id: uuid.nullish(), color: z.string().max(40).nullish() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("folders")
      .insert({ name: data.name, parent_id: data.parent_id ?? null, color: data.color ?? null, user_id: context.userId })
      .select("id,name,color,parent_id,position")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFolder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("folders").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/* ---------- Tags ---------- */
export const listTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.from("tags").select("id,name,color").order("name");
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const createTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { name: string; color?: string | null }) =>
    z.object({ name: z.string().min(1).max(60), color: z.string().max(40).nullish() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("tags")
      .insert({ name: data.name, color: data.color ?? null, user_id: context.userId })
      .select("id,name,color")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/* ---------- Notes ---------- */
export const listNotes = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("notes")
      .select("id,title,folder_id,is_private,is_pinned,is_favorite,updated_at")
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const getNote = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("notes")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const createNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { folder_id?: string | null; title?: string }) =>
    z.object({ folder_id: uuid.nullish(), title: z.string().max(200).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { data: row, error } = await context.supabase
      .from("notes")
      .insert({ user_id: context.userId, folder_id: data.folder_id ?? null, title: data.title ?? "Untitled" })
      .select("id,title,folder_id,is_private,is_pinned,is_favorite,updated_at")
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

const layoutSchema = z.object({ blocks: z.array(z.any()) }).passthrough();
export const saveNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    (d: {
      id: string;
      title?: string;
      content?: string;
      layout?: unknown;
      folder_id?: string | null;
      audio_url?: string | null;
    }) =>
      z
        .object({
          id: uuid,
          title: z.string().max(200).optional(),
          content: z.string().optional(),
          layout: layoutSchema.optional(),
          folder_id: uuid.nullish(),
          audio_url: z.string().max(2000).nullish(),
        })
        .parse(d),
  )
  .handler(async ({ data, context }) => {
    const patch: Record<string, unknown> = {};
    if (data.title !== undefined) patch.title = data.title;
    if (data.content !== undefined) patch.content = data.content;
    if (data.layout !== undefined) patch.layout = data.layout;
    if (data.folder_id !== undefined) patch.folder_id = data.folder_id;
    if (data.audio_url !== undefined) patch.audio_url = data.audio_url;
    const { error } = await context.supabase.from("notes").update(patch as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setNoteFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; flag: "is_pinned" | "is_favorite" | "is_private"; value: boolean }) =>
    z.object({ id: uuid, flag: z.enum(["is_pinned", "is_favorite", "is_private"]), value: z.boolean() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notes").update({ [data.flag]: data.value } as any).eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteNote = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: uuid }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("notes").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
