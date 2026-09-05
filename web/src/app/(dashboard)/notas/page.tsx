"use client";

import React, { useState, useEffect, useRef, useCallback, useTransition } from "react";
import Link from "next/link";
import {
  Search,
  Plus,
  Share2,
  Pin,
  PinOff,
  Trash2,
  Archive,
  Tag,
  Link2,
  FileText,
  Clock,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  PanelRightClose,
  PanelRightOpen,
  Save,
  Check,
  AlertCircle,
  FolderOpen,
  HelpCircle,
  BookOpen,
  ArrowLeft,
} from "lucide-react";
import {
  LifeTrackerApiClient,
  type NoteListItem,
  type NoteDetail,
  type GraphData,
  type GraphNode,
} from "@/lib/api-client";
import { MarkdownEditor, type EditorViewMode } from "@/components/notes/MarkdownEditor";
import { BacklinksPanel } from "@/components/notes/BacklinksPanel";
import { GraphView } from "@/components/notes/GraphView";

export default function NotesPage() {
  // Notes list state
  const [notes, setNotes] = useState<NoteListItem[]>([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<"all" | "pinned" | "stubs">("all");

  // Selected / Active Note
  const [activeNote, setActiveNote] = useState<NoteDetail | null>(null);
  const [isLoadingDetail, setIsLoadingDetail] = useState(false);

  // Editor Draft State
  const [draftTitle, setDraftTitle] = useState("");
  const [draftContent, setDraftContent] = useState("");
  const [draftPinned, setDraftPinned] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "unsaved">("saved");
  const [editorMode, setEditorMode] = useState<EditorViewMode>("split");

  // Panels layout state
  const [showRightPanel, setShowRightPanel] = useState(true);
  const [showGraphModal, setShowGraphModal] = useState(false);
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [isLoadingGraph, setIsLoadingGraph] = useState(false);

  const [, startTransition] = useTransition();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch notes list with search and filter
  const fetchNotes = useCallback(async (search?: string, tag?: string) => {
    try {
      setIsLoadingNotes(true);
      const data = await LifeTrackerApiClient.getNotes(
        search || undefined,
        tag || undefined,
        false, // do not include archived
        true   // include stubs
      );
      setNotes(data);
      return data;
    } catch (err) {
      console.error("Error fetching notes:", err);
      return [];
    } finally {
      setIsLoadingNotes(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    fetchNotes().then((loaded) => {
      if (loaded.length > 0) {
        // Select first note if available
        selectNote(loaded[0].slug);
      }
    });
  }, [fetchNotes]);

  // Handle Search Input with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchNotes(searchQuery, selectedTag || undefined);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, selectedTag, fetchNotes]);

  // 2. Select and load Note Detail
  const selectNote = async (idOrSlug: string) => {
    try {
      setIsLoadingDetail(true);
      const detail = await LifeTrackerApiClient.getNote(idOrSlug);
      setActiveNote(detail);
      setDraftTitle(detail.title);
      setDraftContent(detail.content || "");
      setDraftPinned(detail.pinned);
      setIsDirty(false);
      setSaveStatus("saved");
    } catch (err) {
      console.error("Error loading note detail:", err);
    } finally {
      setIsLoadingDetail(false);
    }
  };

  // 3. Save Note (Atomic update or create)
  const handleSave = useCallback(
    async (manual = false) => {
      if (!activeNote || !isDirty) return;

      try {
        setSaveStatus("saving");
        const updated = await LifeTrackerApiClient.updateNote(activeNote.id, {
          title: draftTitle.trim() || "Nota sin título",
          content: draftContent,
          pinned: draftPinned,
        });

        setActiveNote(updated);
        setIsDirty(false);
        setSaveStatus("saved");

        // Refresh list silently
        fetchNotes(searchQuery, selectedTag || undefined);
      } catch (err) {
        console.error("Error saving note:", err);
        setSaveStatus("unsaved");
      }
    },
    [activeNote, isDirty, draftTitle, draftContent, draftPinned, fetchNotes, searchQuery, selectedTag]
  );

  // Auto-save debounce effect (1500ms after user stops typing)
  useEffect(() => {
    if (!isDirty || !activeNote) return;

    setSaveStatus("unsaved");
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(() => {
      handleSave(false);
    }, 1500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [draftTitle, draftContent, draftPinned, isDirty, activeNote, handleSave]);

  // Keyboard shortcut Ctrl+S / Cmd+S
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSave]);

  // 4. Create New Note
  const handleCreateNote = async () => {
    try {
      const newNote = await LifeTrackerApiClient.createNote({
        title: "Nueva Nota",
        content: "# Nueva Nota\n\nComienza a escribir tus ideas aquí...",
        pinned: false,
      });

      await fetchNotes(searchQuery, selectedTag || undefined);
      await selectNote(newNote.slug);
    } catch (err) {
      console.error("Error creating new note:", err);
    }
  };

  // 5. Delete Note
  const handleDeleteNote = async () => {
    if (!activeNote) return;
    const confirm = window.confirm(`¿Estás seguro de archivar la nota "${activeNote.title}"?`);
    if (!confirm) return;

    try {
      await LifeTrackerApiClient.deleteNote(activeNote.id, false);
      const remaining = await fetchNotes(searchQuery, selectedTag || undefined);
      if (remaining.length > 0) {
        selectNote(remaining[0].slug);
      } else {
        setActiveNote(null);
      }
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  // 6. Load Graph Data for Modal
  const handleOpenGraph = async () => {
    try {
      setShowGraphModal(true);
      setIsLoadingGraph(true);
      const data = await LifeTrackerApiClient.getNotesGraph();
      setGraphData(data);
    } catch (err) {
      console.error("Error loading graph:", err);
    } finally {
      setIsLoadingGraph(false);
    }
  };

  // Navigate to wikilink target
  const handleNavigateToNote = async (targetTitleOrSlug: string) => {
    // Check if it matches an existing note
    const found = notes.find(
      (n) =>
        n.slug.toLowerCase() === targetTitleOrSlug.toLowerCase() ||
        n.title.toLowerCase() === targetTitleOrSlug.toLowerCase()
    );

    if (found) {
      selectNote(found.slug);
    } else {
      // Create as a real note or open directly
      try {
        const created = await LifeTrackerApiClient.createNote({
          title: targetTitleOrSlug,
          content: `# ${targetTitleOrSlug}\n\nNota creada desde enlace del Segundo Cerebro.`,
        });
        await fetchNotes(searchQuery, selectedTag || undefined);
        selectNote(created.slug);
      } catch {
        selectNote(targetTitleOrSlug);
      }
    }

    if (showGraphModal) {
      setShowGraphModal(false);
    }
  };

  // Extract all unique tags for filter chips
  const allTags = Array.from(
    new Set(notes.flatMap((n) => n.tags || []).filter(Boolean))
  ).slice(0, 8);

  // Filter notes based on active filter
  const displayedNotes = notes.filter((n) => {
    if (filterType === "pinned") return n.pinned;
    if (filterType === "stubs") return n.isStub;
    return true;
  });

  return (
    <div className="flex flex-col h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans">
      {/* Top Application Bar */}
      <header className="h-14 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-md px-4 flex items-center justify-between shrink-0 select-none z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition"
            title="Volver al Dashboard"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none flex items-center gap-2">
                <span>Segundo Cerebro</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
                  Obsidian Style
                </span>
              </h1>
            </div>
          </div>
        </div>

        {/* Global actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenGraph}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-medium transition shadow-sm"
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Red de Notas</span>
          </button>
          <button
            type="button"
            onClick={handleCreateNote}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nueva Nota</span>
          </button>
        </div>
      </header>

      {/* Main 3-Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* ============================================================================== */}
        {/* LEFT COLUMN: Notes List & Search */}
        {/* ============================================================================== */}
        <aside className="w-80 sm:w-88 border-r border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0">
          {/* Search & Filter Bar */}
          <div className="p-3 border-b border-zinc-800/80 space-y-2.5">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar notas, tags o texto..."
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 transition"
              />
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none text-[11px]">
              <button
                type="button"
                onClick={() => {
                  setFilterType("all");
                  setSelectedTag(null);
                }}
                className={`px-2.5 py-1 rounded-lg transition font-medium ${
                  filterType === "all" && !selectedTag
                    ? "bg-zinc-800 text-white border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                Todas ({notes.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterType("pinned")}
                className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  filterType === "pinned"
                    ? "bg-zinc-800 text-amber-300 border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <Pin className="w-3 h-3" />
                <span>Fijadas</span>
              </button>
              <button
                type="button"
                onClick={() => setFilterType("stubs")}
                className={`px-2.5 py-1 rounded-lg transition font-medium flex items-center gap-1 ${
                  filterType === "stubs"
                    ? "bg-zinc-800 text-zinc-200 border border-zinc-700"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900"
                }`}
              >
                <HelpCircle className="w-3 h-3" />
                <span>Stubs</span>
              </button>
            </div>

            {/* Tag Pills */}
            {allTags.length > 0 && (
              <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-zinc-900">
                {allTags.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                    className={`text-[10px] px-2 py-0.5 rounded-md transition font-medium ${
                      selectedTag === tag
                        ? "bg-indigo-600 text-white"
                        : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                    }`}
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Notes List */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            {isLoadingNotes && notes.length === 0 ? (
              <div className="p-6 text-center text-xs text-zinc-500">Cargando notas...</div>
            ) : displayedNotes.length === 0 ? (
              <div className="p-8 text-center text-xs text-zinc-500 space-y-2">
                <FolderOpen className="w-6 h-6 mx-auto opacity-40 text-zinc-400" />
                <p>No se encontraron notas con este criterio.</p>
              </div>
            ) : (
              displayedNotes.map((note) => {
                const isSelected = activeNote?.id === note.id;
                return (
                  <div
                    key={note.id}
                    onClick={() => selectNote(note.slug)}
                    className={`group p-3 rounded-xl border transition cursor-pointer select-none relative ${
                      isSelected
                        ? "bg-zinc-900/95 border-indigo-500/50 shadow-sm"
                        : "bg-zinc-950 hover:bg-zinc-900/60 border-zinc-850 hover:border-zinc-800"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5 mb-1">
                      <div className="flex items-center gap-1.5 min-w-0">
                        {note.pinned && (
                          <Pin className="w-3 h-3 shrink-0 text-amber-400 fill-amber-400/30" />
                        )}
                        <h3
                          className={`text-xs font-semibold truncate ${
                            isSelected
                              ? "text-indigo-300"
                              : note.isStub
                              ? "text-zinc-400 italic"
                              : "text-zinc-200 group-hover:text-zinc-100"
                          }`}
                        >
                          {note.title}
                        </h3>
                      </div>

                      {note.isStub && (
                        <span className="shrink-0 text-[9px] px-1.5 rounded bg-zinc-850 text-zinc-400 border border-zinc-750">
                          Stub
                        </span>
                      )}
                    </div>

                    {/* Snippet */}
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed mb-2 font-normal">
                      {note.snippet || "Sin contenido..."}
                    </p>

                    {/* Footer metadata: date, backlinks & tags */}
                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono">
                      <span className="flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {new Date(note.updatedAt).toLocaleDateString("es-ES", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>

                      <div className="flex items-center gap-2">
                        {note.backlinksCount > 0 && (
                          <span
                            title={`${note.backlinksCount} backlinks`}
                            className="flex items-center gap-0.5 text-indigo-400/80"
                          >
                            <Link2 className="w-3 h-3" />
                            <span>{note.backlinksCount}</span>
                          </span>
                        )}

                        {note.tags && note.tags.length > 0 && (
                          <span className="text-zinc-400 font-sans">
                            #{note.tags[0]}
                            {note.tags.length > 1 ? ` +${note.tags.length - 1}` : ""}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </aside>

        {/* ============================================================================== */}
        {/* CENTER COLUMN: Note Editor & Preview */}
        {/* ============================================================================== */}
        <main className="flex-1 flex flex-col bg-zinc-950 overflow-hidden relative">
          {activeNote ? (
            <>
              {/* Note Header Bar */}
              <div className="px-6 py-3 border-b border-zinc-800/80 bg-zinc-900/30 flex items-center justify-between gap-4 shrink-0">
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setDraftPinned(!draftPinned);
                      setIsDirty(true);
                    }}
                    title={draftPinned ? "Desanclar nota" : "Fijar nota al inicio"}
                    className={`p-1.5 rounded-lg transition ${
                      draftPinned
                        ? "text-amber-400 bg-amber-400/10 hover:bg-amber-400/20"
                        : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800"
                    }`}
                  >
                    {draftPinned ? <Pin className="w-4 h-4 fill-amber-400/30" /> : <PinOff className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    value={draftTitle}
                    onChange={(e) => {
                      setDraftTitle(e.target.value);
                      setIsDirty(true);
                    }}
                    placeholder="Título de la nota..."
                    className="flex-1 text-lg sm:text-xl font-bold bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:ring-0 border-none truncate"
                  />
                </div>

                {/* Status & Action buttons */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* Save state badge */}
                  <span className="text-xs flex items-center gap-1 font-mono text-zinc-500">
                    {saveStatus === "saving" && (
                      <>
                        <Sparkles className="w-3 h-3 text-indigo-400 animate-spin" />
                        <span className="text-indigo-400">Guardando...</span>
                      </>
                    )}
                    {saveStatus === "saved" && (
                      <>
                        <Check className="w-3 h-3 text-emerald-400" />
                        <span className="text-zinc-400">Guardado</span>
                      </>
                    )}
                    {saveStatus === "unsaved" && (
                      <>
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
                        <span className="text-amber-400">Sin guardar</span>
                      </>
                    )}
                  </span>

                  <button
                    type="button"
                    onClick={() => handleSave(true)}
                    disabled={!isDirty || saveStatus === "saving"}
                    title="Guardar ahora (Ctrl+S)"
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <Save className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={handleDeleteNote}
                    title="Archivar nota"
                    className="p-1.5 rounded-lg text-zinc-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="w-[1px] h-4 bg-zinc-800 mx-1" />

                  {/* Toggle Inspector panel button */}
                  <button
                    type="button"
                    onClick={() => setShowRightPanel(!showRightPanel)}
                    title={showRightPanel ? "Ocultar panel lateral" : "Mostrar panel de conexiones"}
                    className={`p-1.5 rounded-lg transition ${
                      showRightPanel
                        ? "text-indigo-400 bg-indigo-500/10"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
                    }`}
                  >
                    {showRightPanel ? (
                      <PanelRightClose className="w-4 h-4" />
                    ) : (
                      <PanelRightOpen className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Editor Workspace */}
              <div className="flex-1 p-4 overflow-hidden">
                <MarkdownEditor
                  value={draftContent}
                  onChange={(val) => {
                    setDraftContent(val);
                    setIsDirty(true);
                  }}
                  onNavigateToNote={handleNavigateToNote}
                  mode={editorMode}
                  onModeChange={setEditorMode}
                  className="h-full shadow-lg"
                />
              </div>
            </>
          ) : (
            /* No Note Selected Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
              <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-4 text-indigo-400 shadow-xl">
                <BookOpen className="w-7 h-7" />
              </div>
              <h2 className="text-lg font-bold text-zinc-200 mb-1">Segundo Cerebro</h2>
              <p className="text-xs text-zinc-400 max-w-sm mb-6 leading-relaxed">
                Organiza tus notas, pensamientos y proyectos usando enlaces bidireccionales y red neuronal estilo Obsidian.
              </p>
              <button
                type="button"
                onClick={handleCreateNote}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/20 transition"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Primera Nota</span>
              </button>
            </div>
          )}
        </main>

        {/* ============================================================================== */}
        {/* RIGHT COLUMN: Backlinks & Connections Inspector */}
        {/* ============================================================================== */}
        {showRightPanel && activeNote && (
          <aside className="w-72 sm:w-80 border-l border-zinc-800/80 bg-zinc-950 flex flex-col shrink-0 p-3">
            <BacklinksPanel
              backlinks={activeNote.backlinks || []}
              outgoingLinks={activeNote.outgoingLinks || []}
              onSelectNote={selectNote}
              className="h-full shadow-md"
            />
          </aside>
        )}
      </div>

      {/* ============================================================================== */}
      {/* MODAL: Fullscreen Graph View */}
      {/* ============================================================================== */}
      {showGraphModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-150">
          <div className="relative w-full h-full max-w-6xl max-h-[90vh] bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col">
            {isLoadingGraph || !graphData ? (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 space-y-3">
                <Share2 className="w-8 h-8 text-indigo-400 animate-pulse" />
                <p className="text-sm">Generando topología de red...</p>
              </div>
            ) : (
              <GraphView
                data={graphData}
                currentNoteId={activeNote?.id}
                onSelectNode={(node) => handleNavigateToNote(node.slug)}
                onClose={() => setShowGraphModal(false)}
                className="flex-1"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
