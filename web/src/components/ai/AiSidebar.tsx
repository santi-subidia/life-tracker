"use client";

import React, { useState } from "react";
import { 
  Plus, 
  MessageSquare, 
  Trash2, 
  Pencil, 
  Check, 
  X, 
  Sparkles,
  ChevronRight,
  Clock
} from "lucide-react";
import type { AiConversation } from "@/lib/api-client";

interface AiSidebarProps {
  conversations: AiConversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  isOpenMobile: boolean;
  onCloseMobile: () => void;
}

export function AiSidebar({
  conversations,
  activeConversationId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isOpenMobile,
  onCloseMobile,
}: AiSidebarProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const startRename = (c: AiConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = async (id: string, e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!editTitle.trim()) return;

    try {
      setSavingEdit(true);
      await onRenameConversation(id, editTitle.trim());
      setEditingId(null);
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm("¿Eliminar esta conversación?")) {
      await onDeleteConversation(id);
    }
  };

  // Group conversations by date: Hoy, Ayer, Últimos 7 días, Anteriores
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const groups: { label: string; items: AiConversation[] }[] = [
    { label: "Hoy", items: [] },
    { label: "Ayer", items: [] },
    { label: "Últimos 7 días", items: [] },
    { label: "Anteriores", items: [] },
  ];

  conversations.forEach((c) => {
    const cDate = new Date(c.updatedAt || c.createdAt);
    cDate.setHours(0, 0, 0, 0);

    if (cDate.getTime() === today.getTime()) {
      groups[0].items.push(c);
    } else if (cDate.getTime() === yesterday.getTime()) {
      groups[1].items.push(c);
    } else if (cDate.getTime() >= sevenDaysAgo.getTime()) {
      groups[2].items.push(c);
    } else {
      groups[3].items.push(c);
    }
  });

  const sidebarContent = (
    <aside className="w-72 h-full bg-zinc-950/95 border-r border-zinc-800/80 flex flex-col justify-between select-none">
      {/* Top Header & New Conversation Button */}
      <div className="p-3.5 border-b border-zinc-800/80 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Historial IA
            </span>
          </div>

          <span className="text-[10px] text-zinc-500 font-mono">
            {conversations.length} hilos
          </span>
        </div>

        <button
          type="button"
          onClick={() => {
            onNewConversation();
            onCloseMobile();
          }}
          className="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-md shadow-indigo-600/20 active:scale-95 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Nueva Conversación</span>
        </button>
      </div>

      {/* Conversations List (Scrollable) */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-4">
        {conversations.length === 0 ? (
          <div className="p-6 text-center text-zinc-500 text-xs space-y-1">
            <MessageSquare className="w-6 h-6 mx-auto text-zinc-700" />
            <p>Sin conversaciones previas.</p>
            <p className="text-[11px] text-zinc-600">Comienza un nuevo hilo con Gemini.</p>
          </div>
        ) : (
          groups
            .filter((g) => g.items.length > 0)
            .map((group) => (
              <div key={group.label} className="space-y-1">
                <div className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
                  {group.label}
                </div>

                <div className="space-y-0.5">
                  {group.items.map((c) => {
                    const isActive = activeConversationId === c.id;
                    const isEditing = editingId === c.id;

                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          if (!isEditing) {
                            onSelectConversation(c.id);
                            onCloseMobile();
                          }
                        }}
                        className={`group relative rounded-xl px-2.5 py-2 text-xs transition-all duration-150 cursor-pointer flex items-center justify-between gap-2 ${
                          isActive
                            ? "bg-zinc-900 text-white font-medium shadow-sm border border-zinc-800"
                            : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/50"
                        }`}
                      >
                        {isEditing ? (
                          <form
                            onSubmit={(e) => handleSaveRename(c.id, e)}
                            className="flex items-center gap-1.5 w-full"
                          >
                            <input
                              type="text"
                              autoFocus
                              value={editTitle}
                              onChange={(e) => setEditTitle(e.target.value)}
                              className="w-full px-2 py-0.5 rounded bg-zinc-950 border border-indigo-500 text-xs text-white focus:outline-none"
                            />
                            <button
                              type="submit"
                              disabled={savingEdit}
                              className="p-1 rounded text-emerald-400 hover:bg-zinc-800"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingId(null);
                              }}
                              className="p-1 rounded text-zinc-400 hover:bg-zinc-800"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </form>
                        ) : (
                          <>
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <MessageSquare className="w-3.5 h-3.5 shrink-0 opacity-60" />
                              <span className="truncate">{c.title}</span>
                            </div>

                            {/* Actions on hover or active */}
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                              <button
                                type="button"
                                onClick={(e) => startRename(c, e)}
                                title="Renombrar título"
                                className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                              >
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(c.id, e)}
                                title="Eliminar conversación"
                                className="p-1 rounded hover:bg-rose-500/10 text-zinc-400 hover:text-rose-400"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}
      </div>

      {/* Footer Info */}
      <div className="p-3 border-t border-zinc-800/80 text-[11px] text-zinc-400 flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3 text-zinc-400" />
          <span>Memoria continua</span>
        </span>
        <span className="text-[10px] text-zinc-400 font-mono">20 turnos ctx</span>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop Persistent Sidebar */}
      <div className="hidden md:block h-full">
        {sidebarContent}
      </div>

      {/* Mobile Drawer */}
      {isOpenMobile && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150"
            onClick={onCloseMobile}
          />
          <div className="relative z-10 animate-in slide-in-from-left duration-200">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
