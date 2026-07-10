import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  listFolders, createFolder, deleteFolder, listTags, createTag,
  listNotes, getNote, createNote, saveNote, setNoteFlag, deleteNote,
} from "@/lib/notes.functions";
import { NoteEditor, type NoteEditorHandle } from "@/components/NoteEditor";
import { DrawCanvas } from "@/components/DrawCanvas";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { SpreadsheetBlock, type SheetData } from "@/components/SpreadsheetBlock";
import { SlidesView } from "@/components/SlidesView";
import { ResearchPanel } from "@/components/ResearchPanel";
import { VaultLock } from "@/components/VaultLock";
import { exportElementToPdf } from "@/lib/pdf";
import { useTheme, THEMES } from "@/lib/theme";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Leaf, Plus, FolderPlus, Search, Pin, Star, Lock, Trash2, PenLine, Table2,
  Presentation, FileDown, Sparkles, LogOut, Palette, Folder, Save,
  Menu, X, ChevronLeft,
} from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app")({ component: App });

type NoteRow = { id: string; title: string; folder_id: string | null; is_private: boolean; is_pinned: boolean; is_favorite: boolean; updated_at: string };
type FolderRow = { id: string; name: string; color: string | null; parent_id: string | null; position: number };
type TagRow = { id: string; name: string; color: string | null };

function App() {
  const navigate = useNavigate();
  const { theme, setTheme } = useTheme();
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [tags, setTags] = useState<TagRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [active, setActive] = useState<{ title: string; content: string; layout: any; is_private: boolean } | null>(null);
  const [search, setSearch] = useState("");
  const [folderFilter, setFolderFilter] = useState<string | null>(null);
  const [showCanvas, setShowCanvas] = useState(false);
  const [showSlides, setShowSlides] = useState(false);
  const [showResearch, setShowResearch] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [token, setToken] = useState<string>();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const editorRef = useRef<NoteEditorHandle>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const refreshNotes = useCallback(async () => {
    const res = await listNotes();
    setNotes(Array.isArray(res) ? res as NoteRow[] : []);
  }, []);

  useEffect(() => {
    (async () => {
      const [f, t] = await Promise.all([listFolders(), listTags()]);
      setFolders(Array.isArray(f) ? f as FolderRow[] : []);
      setTags(Array.isArray(t) ? t as TagRow[] : []);
      await refreshNotes();
      const { data } = await supabase.auth.getSession();
      setToken(data.session?.access_token);
    })();
  }, [refreshNotes]);

  // Three-finger swipe-down gesture instantly hides private notes.
  useEffect(() => {
    let startY = 0, three = false;
    const ts = (e: TouchEvent) => { three = e.touches.length === 3; startY = e.touches[0]?.clientY ?? 0; };
    const te = (e: TouchEvent) => {
      if (three && e.changedTouches[0] && e.changedTouches[0].clientY - startY > 80) {
        document.body.classList.toggle("hide-private");
        toast.message(document.body.classList.contains("hide-private") ? "Private notes hidden" : "Private notes shown");
      }
      three = false;
    };
    window.addEventListener("touchstart", ts); window.addEventListener("touchend", te);
    return () => { window.removeEventListener("touchstart", ts); window.removeEventListener("touchend", te); };
  }, []);

  const openNote = async (id: string) => {
    setActiveId(id); setUnlocked(false); setShowResearch(false); setShowSheet(false);
    setSidebarOpen(false);
    const n = await getNote({ data: { id } }) as any;
    setActive({ title: n.title, content: n.content ?? "", layout: n.layout ?? { blocks: [] }, is_private: n.is_private });
    setShowSheet(!!n.layout?.sheet);
  };

  const queueSave = useCallback((patch: Record<string, unknown>) => {
    if (!activeId) return;
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      await saveNote({ data: { id: activeId, ...patch } as any });
      refreshNotes();
    }, 700);
  }, [activeId, refreshNotes]);

  const onEditorChange = (html: string) => {
    setActive((a) => a && { ...a, content: html });
    queueSave({ content: html });
  };

  const newNote = async () => {
    const row = await createNote({ data: { folder_id: folderFilter } }) as NoteRow;
    await refreshNotes();
    openNote(row.id);
  };

  const addFolder = async () => {
    const name = prompt("Folder name");
    if (!name) return;
    const row = await createFolder({ data: { name } }) as FolderRow;
    setFolders((f) => [...f, row]);
  };

  const addTag = async () => {
    const name = prompt("Tag name");
    if (!name) return;
    const row = await createTag({ data: { name } }) as TagRow;
    setTags((t) => [...t, row]);
  };

  const toggleFlag = async (n: NoteRow, flag: "is_pinned" | "is_favorite" | "is_private") => {
    await setNoteFlag({ data: { id: n.id, flag, value: !n[flag] } });
    refreshNotes();
    if (n.id === activeId && flag === "is_private") setActive((a) => a && { ...a, is_private: !a.is_private });
  };

  const removeNote = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    await deleteNote({ data: { id } });
    if (id === activeId) { setActiveId(null); setActive(null); }
    refreshNotes();
  };

  const setSheet = (sheet: SheetData) => {
    setActive((a) => a && { ...a, layout: { ...a.layout, sheet } });
    queueSave({ layout: { ...(active?.layout ?? { blocks: [] }), sheet } });
  };

  const addSheet = () => {
    if (!active?.layout?.sheet) setSheet({ rows: 4, cols: 4, cells: {} });
    setShowSheet(true);
  };

  const exportPdf = async () => {
    if (!printRef.current) return;
    toast.message("Building PDF…");
    try { await exportElementToPdf(printRef.current, `${active?.title || "note"}.pdf`); }
    catch { toast.error("PDF export failed"); }
  };

  const insertToEditor = (text: string) => editorRef.current?.insertText(text);

  const closeNote = () => { setActiveId(null); setActive(null); };

  const filtered = notes.filter((n) =>
    (!folderFilter || n.folder_id === folderFilter) &&
    (!search || n.title.toLowerCase().includes(search.toLowerCase())),
  );

  const signOut = async () => { await supabase.auth.signOut(); navigate({ to: "/auth" }); };
  const composedHtml = `<h1>${active?.title ?? ""}</h1>${active?.content ?? ""}`;

  // ---------- Sidebar content (reused for both desktop & mobile drawer) ----------
  const SidebarContent = () => (
    <div className="flex h-full flex-col">
      {/* Logo + actions */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Leaf className="h-4 w-4" />
          </div>
          <span className="font-display text-lg font-semibold">Lumen</span>
        </div>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={signOut} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
          {/* Close drawer on mobile */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="px-3 pt-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search notes…" className="pl-8 h-9" />
        </div>
      </div>

      {/* New note + folder */}
      <div className="mt-2 flex items-center gap-1 px-3">
        <Button size="sm" className="flex-1 h-8" onClick={newNote}><Plus className="mr-1 h-3.5 w-3.5" />New Note</Button>
        <Button size="sm" variant="outline" className="h-8 px-2" onClick={addFolder} title="New folder"><FolderPlus className="h-3.5 w-3.5" /></Button>
      </div>

      {/* Scrollable list area */}
      <div className="mt-2 flex-1 overflow-auto px-3 pb-3 space-y-4">
        {/* Folders */}
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Folders</div>
          <button
            onClick={() => setFolderFilter(null)}
            className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${!folderFilter ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
          >
            <Folder className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">All notes</span>
            <span className="ml-auto text-xs text-muted-foreground">{notes.length}</span>
          </button>
          {folders.map((f) => (
            <div key={f.id} className="group flex items-center">
              <button
                onClick={() => setFolderFilter(f.id)}
                className={`flex flex-1 items-center gap-2 rounded-lg px-2 py-2 text-sm transition-colors ${folderFilter === f.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-muted"}`}
              >
                <Folder className="h-3.5 w-3.5 shrink-0" style={{ color: f.color ?? undefined }} />
                <span className="truncate">{f.name}</span>
              </button>
              <button
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                onClick={() => { deleteFolder({ data: { id: f.id } }); setFolders((x) => x.filter((y) => y.id !== f.id)); }}
              >
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
          ))}
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div>
            <div className="mb-1 flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Tags
              <button onClick={addTag} className="hover:text-foreground transition-colors"><Plus className="h-3 w-3" /></button>
            </div>
            <div className="flex flex-wrap gap-1">
              {tags.map((t) => (
                <span key={t.id} className="rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">#{t.name}</span>
              ))}
            </div>
          </div>
        )}
        {tags.length === 0 && (
          <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
            Tags
            <button onClick={addTag} className="hover:text-foreground transition-colors"><Plus className="h-3 w-3" /></button>
          </div>
        )}

        {/* Notes list */}
        <div>
          <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Notes</div>
          {filtered.length === 0 && (
            <p className="px-2 py-4 text-center text-xs text-muted-foreground">No notes yet. Create one above!</p>
          )}
          <div className="space-y-0.5">
            {filtered.map((n) => (
              <div
                key={n.id}
                className={`group flex items-center rounded-lg transition-colors ${n.is_private ? "private-note" : ""} ${activeId === n.id ? "bg-primary/10" : "hover:bg-muted"}`}
              >
                <button onClick={() => openNote(n.id)} className="flex flex-1 items-center gap-1.5 px-2 py-2 text-left text-sm min-w-0">
                  {n.is_pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                  {n.is_private && <Lock className="h-3 w-3 shrink-0 text-muted-foreground" />}
                  <div className="min-w-0 flex-1">
                    <div className={`truncate text-sm font-medium ${activeId === n.id ? "text-primary" : ""}`}>{n.title || "Untitled"}</div>
                    <div className="truncate text-xs text-muted-foreground">{new Date(n.updated_at).toLocaleDateString()}</div>
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-0.5 pr-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button onClick={() => toggleFlag(n, "is_favorite")} title="Favorite" className="p-1 rounded hover:bg-muted">
                    <Star className={`h-3 w-3 ${n.is_favorite ? "fill-current text-primary" : "text-muted-foreground"}`} />
                  </button>
                  <button onClick={() => toggleFlag(n, "is_pinned")} title="Pin" className="p-1 rounded hover:bg-muted">
                    <Pin className={`h-3 w-3 ${n.is_pinned ? "text-primary" : "text-muted-foreground"}`} />
                  </button>
                  <button onClick={() => removeNote(n.id)} title="Delete" className="p-1 rounded hover:bg-destructive/10">
                    <Trash2 className="h-3 w-3 text-muted-foreground" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Theme switcher at bottom */}
      <div className="border-t border-border p-3">
        <div className="mb-2 flex items-center gap-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          <Palette className="h-3 w-3" /> Theme
        </div>
        <div className="grid grid-cols-3 gap-1">
          {THEMES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTheme(t.id)}
              className={`rounded-lg border py-1.5 text-xs font-medium transition-colors ${theme === t.id ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  // ---------- Note toolbar buttons ----------
  const ToolbarButtons = () => (
    <>
      <Button variant="ghost" size="sm" onClick={() => setShowCanvas(true)} className="h-8 gap-1 px-2 text-xs">
        <PenLine className="h-3.5 w-3.5" /><span className="hidden sm:inline">Draw</span>
      </Button>
      <VoiceRecorder
        onTranscript={insertToEditor}
        onAudioSaved={(url) => editorRef.current?.insertHtml(`<audio src="${url}" controls></audio>`)}
      />
      <Button variant="ghost" size="sm" onClick={addSheet} className="h-8 gap-1 px-2 text-xs">
        <Table2 className="h-3.5 w-3.5" /><span className="hidden sm:inline">Sheet</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setShowSlides(true)} className="h-8 gap-1 px-2 text-xs">
        <Presentation className="h-3.5 w-3.5" /><span className="hidden sm:inline">Slides</span>
      </Button>
      <Button variant="ghost" size="sm" onClick={exportPdf} className="h-8 gap-1 px-2 text-xs">
        <FileDown className="h-3.5 w-3.5" /><span className="hidden sm:inline">PDF</span>
      </Button>
      <Button
        variant={showResearch ? "secondary" : "ghost"}
        size="sm"
        onClick={() => setShowResearch((s) => !s)}
        className="h-8 gap-1 px-2 text-xs"
      >
        <Sparkles className="h-3.5 w-3.5" /><span className="hidden sm:inline">Research</span>
      </Button>
    </>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">

      {/* ── Mobile drawer overlay ── */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar (desktop: static | mobile: slide-in drawer) ── */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border
          transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0 md:flex md:flex-col md:shrink-0
          ${sidebarOpen ? "translate-x-0 flex flex-col" : "-translate-x-full"}
        `}
      >
        <SidebarContent />
      </aside>

      {/* ── Main panel ── */}
      <main className="flex flex-1 flex-col overflow-hidden min-w-0">
        {!active ? (
          /* Empty state — show a mobile-friendly top bar too */
          <div className="flex flex-1 flex-col">
            {/* Mobile top bar (only when no note open) */}
            <div className="flex items-center gap-2 border-b border-border bg-card px-3 py-2 md:hidden">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-1.5">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <Leaf className="h-3.5 w-3.5" />
                </div>
                <span className="font-semibold text-sm">Lumen</span>
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center text-center p-6">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 mb-4">
                <PenLine className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-1">No note selected</h2>
              <p className="text-muted-foreground text-sm mb-4">Select a note from the sidebar or create a new one.</p>
              <div className="flex gap-2">
                <Button onClick={newNote} size="sm"><Plus className="mr-1 h-4 w-4" />New Note</Button>
                <Button variant="outline" size="sm" className="md:hidden" onClick={() => setSidebarOpen(true)}>
                  <Menu className="mr-1 h-4 w-4" />Browse
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* ── Note toolbar / header ── */}
            <div className="flex items-center border-b border-border bg-card">
              {/* Mobile back button */}
              <button
                className="flex shrink-0 items-center gap-1 border-r border-border px-3 py-2 text-sm text-muted-foreground hover:bg-muted transition-colors md:hidden"
                onClick={closeNote}
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="text-xs">Notes</span>
              </button>

              {/* Mobile menu hamburger (when note is open) */}
              <button
                className="flex shrink-0 items-center justify-center border-r border-border px-2.5 py-2 text-muted-foreground hover:bg-muted transition-colors md:hidden"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="h-4 w-4" />
              </button>

              {/* Toolbar buttons — scrollable on mobile */}
              <div className="flex flex-1 items-center gap-0.5 overflow-x-auto px-2 py-1 scrollbar-none">
                <ToolbarButtons />
              </div>

              {/* Save button — always visible */}
              <div className="shrink-0 border-l border-border px-2 py-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1 px-3 text-xs font-medium text-primary hover:bg-primary/10"
                  onClick={closeNote}
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save</span>
                </Button>
              </div>
            </div>

            {/* ── Note content ── */}
            {active.is_private && !unlocked ? (
              <VaultLock onUnlock={() => setUnlocked(true)} />
            ) : (
              <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 overflow-auto">
                  <div ref={printRef} className="mx-auto max-w-3xl px-4 md:px-6">
                    <input
                      value={active.title}
                      onChange={(e) => { setActive({ ...active, title: e.target.value }); queueSave({ title: e.target.value }); }}
                      placeholder="Untitled"
                      className="w-full bg-transparent pt-6 pb-2 font-display text-2xl md:text-3xl font-semibold outline-none placeholder:text-muted-foreground"
                    />
                    <NoteEditor ref={editorRef} initialHtml={active.content} onChange={onEditorChange} />
                    {showSheet && active.layout?.sheet && (
                      <div className="pb-8">
                        <SpreadsheetBlock value={active.layout.sheet as SheetData} onChange={setSheet} />
                      </div>
                    )}
                  </div>
                </div>
                {showResearch && (
                  <div className="w-80 shrink-0 border-l border-border md:w-96">
                    <ResearchPanel noteContext={active.content} onInsert={insertToEditor} clipperToken={token} />
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </main>

      {showCanvas && <DrawCanvas onInsertText={(t) => insertToEditor(t)} onClose={() => setShowCanvas(false)} />}
      {showSlides && <SlidesView html={composedHtml} onClose={() => setShowSlides(false)} />}
    </div>
  );
}
