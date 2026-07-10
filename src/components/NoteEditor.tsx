import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Bold, Italic, Heading1, Heading2, List, ListOrdered, Image as Img, Paperclip, CheckSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type NoteEditorHandle = {
  insertText: (text: string) => void;
  insertHtml: (html: string) => void;
  getHtml: () => string;
};

export const NoteEditor = forwardRef<NoteEditorHandle, { initialHtml: string; onChange: (html: string) => void }>(
  ({ initialHtml, onChange }, ref) => {
    const elRef = useRef<HTMLDivElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);
    const attachRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
      if (elRef.current && elRef.current.innerHTML !== initialHtml) elRef.current.innerHTML = initialHtml || "";
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [initialHtml]);

    const emit = () => onChange(elRef.current?.innerHTML ?? "");

    useImperativeHandle(ref, () => ({
      insertText: (text) => { elRef.current?.focus(); document.execCommand("insertText", false, text); emit(); },
      insertHtml: (html) => { elRef.current?.focus(); document.execCommand("insertHTML", false, html); emit(); },
      getHtml: () => elRef.current?.innerHTML ?? "",
    }));

    const cmd = (c: string, v?: string) => { elRef.current?.focus(); document.execCommand(c, false, v); emit(); };

    // Native markdown shortcuts: "- " / "* " => bullet, "1. " => numbered, "[] " => checkbox, "# " => heading.
    const onInput = (e: React.FormEvent<HTMLDivElement>) => {
      const sel = window.getSelection();
      if (sel && sel.rangeCount && (e.nativeEvent as InputEvent).data === " ") {
        const node = sel.anchorNode;
        const line = node?.textContent ?? "";
        const apply = (run: () => void) => {
          const r = sel.getRangeAt(0);
          r.setStart(node!, 0);
          r.deleteContents();
          run();
        };
        if (/^-\s$/.test(line) || /^\*\s$/.test(line)) apply(() => cmd("insertUnorderedList"));
        else if (/^1\.\s$/.test(line)) apply(() => cmd("insertOrderedList"));
        else if (/^#\s$/.test(line)) apply(() => cmd("formatBlock", "<h1>"));
        else if (/^##\s$/.test(line)) apply(() => cmd("formatBlock", "<h2>"));
        else if (/^\[\]\s$/.test(line)) apply(() => cmd("insertHTML", '<input type="checkbox" /> '));
      }
      emit();
    };

    const uploadAndInsert = async (file: File, kind: "image" | "video" | "file") => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id;
        if (!uid) throw new Error();
        const path = `${uid}/media/${Date.now()}-${file.name}`;
        const { error } = await supabase.storage.from("media").upload(path, file, { contentType: file.type });
        if (error) throw error;
        const { data } = await supabase.storage.from("media").createSignedUrl(path, 60 * 60 * 24 * 365);
        const url = data?.signedUrl;
        if (!url) throw new Error();
        if (kind === "image") cmd("insertHTML", `<img src="${url}" alt="${file.name}" style="max-width:100%;border-radius:8px" />`);
        else if (kind === "video") cmd("insertHTML", `<video src="${url}" controls style="max-width:100%;border-radius:8px"></video>`);
        else cmd("insertHTML", `<a href="${url}" target="_blank" rel="noopener">📎 ${file.name}</a>`);
        toast.success("Inserted");
      } catch { toast.error("Upload failed"); }
    };

    return (
      <div className="flex flex-col">
        <div className="sticky top-0 z-10 flex flex-wrap items-center gap-1 border-b border-border bg-card/80 p-2 backdrop-blur">
          <Button variant="ghost" size="icon" onClick={() => cmd("bold")}><Bold className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => cmd("italic")}><Italic className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => cmd("formatBlock", "<h1>")}><Heading1 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => cmd("formatBlock", "<h2>")}><Heading2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => cmd("insertUnorderedList")}><List className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => cmd("insertOrderedList")}><ListOrdered className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => cmd("insertHTML", '<input type="checkbox" /> ')}><CheckSquare className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => fileRef.current?.click()}><Img className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => attachRef.current?.click()}><Paperclip className="h-4 w-4" /></Button>
          <input ref={fileRef} type="file" accept="image/*,video/*" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndInsert(f, f.type.startsWith("video") ? "video" : "image"); e.target.value = ""; }} />
          <input ref={attachRef} type="file" hidden onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAndInsert(f, "file"); e.target.value = ""; }} />
        </div>
        <div
          ref={elRef}
          contentEditable
          suppressContentEditableWarning
          onInput={onInput}
          onBlur={emit}
          data-placeholder="Start writing, or type '- ' for a list, '# ' for a heading…"
          className="prose-note min-h-[50vh] flex-1 px-6 py-5 text-foreground outline-none"
        />
      </div>
    );
  },
);
NoteEditor.displayName = "NoteEditor";
