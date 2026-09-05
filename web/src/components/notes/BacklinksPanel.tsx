"use client";

import React, { useState } from "react";
import {
  Link2,
  ArrowDownLeft,
  ArrowUpRight,
  FileText,
  HelpCircle,
  Hash,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import type { BacklinkItem, OutgoingLink } from "@/lib/api-client";

export interface BacklinksPanelProps {
  backlinks: BacklinkItem[];
  outgoingLinks?: OutgoingLink[];
  onSelectNote: (slugOrId: string) => void;
  className?: string;
}

export function BacklinksPanel({
  backlinks,
  outgoingLinks = [],
  onSelectNote,
  className = "",
}: BacklinksPanelProps) {
  const [activeTab, setActiveTab] = useState<"backlinks" | "outgoing">("backlinks");

  return (
    <aside
      className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden h-full ${className}`}
    >
      {/* Header with Navigation Tabs */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-zinc-300">
            <Link2 className="w-3.5 h-3.5 text-indigo-400" />
            <span>Conexiones de Segundo Cerebro</span>
          </div>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/60">
            {backlinks.length + outgoingLinks.length} total
          </span>
        </div>

        {/* Tab switcher */}
        <div className="grid grid-cols-2 gap-1 bg-zinc-900 border border-zinc-800 p-0.5 rounded-lg text-xs">
          <button
            type="button"
            onClick={() => setActiveTab("backlinks")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition font-medium ${
              activeTab === "backlinks"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5" />
            <span>Entrantes</span>
            <span
              className={`text-[10px] px-1 rounded-full ${
                activeTab === "backlinks" ? "bg-indigo-700 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {backlinks.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("outgoing")}
            className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-md transition font-medium ${
              activeTab === "outgoing"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Salientes</span>
            <span
              className={`text-[10px] px-1 rounded-full ${
                activeTab === "outgoing" ? "bg-indigo-700 text-white" : "bg-zinc-800 text-zinc-400"
              }`}
            >
              {outgoingLinks.length}
            </span>
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {activeTab === "backlinks" ? (
          /* Backlinks Section */
          backlinks.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-1">
                Notas que mencionan esta idea ({backlinks.length})
              </div>
              {backlinks.map((link) => (
                <div
                  key={`${link.sourceNoteId}-${link.sourceSlug}`}
                  onClick={() => onSelectNote(link.sourceSlug || link.sourceNoteId)}
                  className="group p-2.5 rounded-xl bg-zinc-900/70 hover:bg-zinc-850 border border-zinc-800 hover:border-indigo-500/40 transition cursor-pointer"
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 text-zinc-200 group-hover:text-indigo-300 font-medium text-xs truncate transition">
                      <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                      <span className="truncate">{link.sourceTitle}</span>
                    </div>
                    <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                  </div>

                  {/* Context snippet with highlighted mention */}
                  {link.contextSnippet && (
                    <div className="text-xs text-zinc-400 bg-zinc-950/80 p-2 rounded-lg border border-zinc-800/80 font-mono text-[11px] leading-relaxed">
                      <HighlightedSnippet
                        snippet={link.contextSnippet}
                        mention={link.linkText || link.sourceTitle}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            /* Empty State for Backlinks */
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                <Link2 className="w-5 h-5 opacity-40" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-300 mb-1">Sin referencias entrantes</h4>
              <p className="text-[11px] text-zinc-500 leading-normal max-w-[200px]">
                Ninguna otra nota enlaza a esta todavía. Usa <code className="text-indigo-400">[[Esta Nota]]</code> en otros documentos.
              </p>
            </div>
          )
        ) : (
          /* Outgoing Links Section */
          outgoingLinks.length > 0 ? (
            <div className="space-y-2">
              <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider px-1">
                Ideas enlazadas desde aquí ({outgoingLinks.length})
              </div>
              {outgoingLinks.map((out) => (
                <div
                  key={`${out.targetNoteId}-${out.targetSlug}`}
                  onClick={() => onSelectNote(out.targetSlug || out.targetNoteId)}
                  className={`group p-2.5 rounded-xl border transition cursor-pointer ${
                    out.isStub
                      ? "bg-zinc-900/40 hover:bg-zinc-900 border-dashed border-zinc-700/70 hover:border-zinc-500"
                      : "bg-zinc-900/70 hover:bg-zinc-850 border-zinc-800 hover:border-indigo-500/40"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 text-zinc-200 group-hover:text-indigo-300 font-medium text-xs truncate">
                      {out.isStub ? (
                        <HelpCircle className="w-3.5 h-3.5 shrink-0 text-zinc-500" />
                      ) : (
                        <FileText className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                      )}
                      <span className="truncate">{out.alias ? `${out.alias} (${out.targetTitle})` : out.targetTitle}</span>
                    </div>

                    {out.isStub ? (
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-medium">
                        Stub
                      </span>
                    ) : (
                      <ChevronRight className="w-3 h-3 text-zinc-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                    )}
                  </div>
                  <div className="text-[10px] text-zinc-500 mt-1 pl-5">
                    slug: /{out.targetSlug}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Empty State for Outgoing Links */
            <div className="h-full min-h-[220px] flex flex-col items-center justify-center text-center p-6 text-zinc-500">
              <div className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-3 text-zinc-500">
                <Sparkles className="w-5 h-5 opacity-40" />
              </div>
              <h4 className="text-xs font-semibold text-zinc-300 mb-1">Sin enlaces salientes</h4>
              <p className="text-[11px] text-zinc-500 leading-normal max-w-[200px]">
                Escribe <code className="text-indigo-400">[[Concepto]]</code> en tu nota para conectar con otras páginas.
              </p>
            </div>
          )
        )}
      </div>
    </aside>
  );
}

/**
 * Highlights wikilinks and mention texts inside backlink context snippets.
 */
function HighlightedSnippet({ snippet, mention }: { snippet: string; mention: string }) {
  // Regex to match [[...]]
  const wikilinkRegex = /(\[\[[^\]]+\]\])/g;
  const parts = snippet.split(wikilinkRegex);

  return (
    <span>
      {parts.map((part, i) => {
        if (part.startsWith("[[") && part.endsWith("]]")) {
          return (
            <mark
              key={i}
              className="bg-indigo-500/25 text-indigo-300 px-1 py-0.5 rounded border border-indigo-500/30 font-semibold not-italic"
            >
              {part}
            </mark>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}
