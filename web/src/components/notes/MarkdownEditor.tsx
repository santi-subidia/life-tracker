"use client";

import React, { useState, useEffect, useRef, useTransition, useCallback } from "react";
import {
  Edit3,
  Eye,
  Columns,
  Bold,
  Italic,
  Heading1,
  Heading2,
  List,
  CheckSquare,
  Quote,
  Code,
  Link as LinkIcon,
  Sparkles,
  ExternalLink,
  Copy,
  Check,
} from "lucide-react";
import { LifeTrackerApiClient, type NoteAutocompleteItem } from "@/lib/api-client";

export type EditorViewMode = "write" | "preview" | "split";

export interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  onNavigateToNote?: (target: string) => void;
  placeholder?: string;
  className?: string;
  mode?: EditorViewMode;
  onModeChange?: (mode: EditorViewMode) => void;
  readOnly?: boolean;
}

interface CaretCoordinates {
  top: number;
  left: number;
}

export function MarkdownEditor({
  value,
  onChange,
  onNavigateToNote,
  placeholder = "Escribe tu nota aquí... Usa [[Título]] para enlazar ideas o crear stubs.",
  className = "",
  mode: controlledMode,
  onModeChange,
  readOnly = false,
}: MarkdownEditorProps) {
  const [internalMode, setInternalMode] = useState<EditorViewMode>("split");
  const activeMode = controlledMode ?? internalMode;

  const handleSetMode = (m: EditorViewMode) => {
    if (onModeChange) onModeChange(m);
    else setInternalMode(m);
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Autocomplete state
  const [isAutocompleteOpen, setIsAutocompleteOpen] = useState(false);
  const [autocompleteQuery, setAutocompleteQuery] = useState("");
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<NoteAutocompleteItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [linkStartIndex, setLinkStartIndex] = useState<number | null>(null);
  const [popoverCoords, setPopoverCoords] = useState<CaretCoordinates>({ top: 40, left: 16 });
  const [isSearching, startSearchTransition] = useTransition();

  // Toolbar insertion helper
  const insertText = useCallback(
    (prefix: string, suffix = "", defaultText = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = value.slice(start, end) || defaultText;
      const replacement = `${prefix}${selected}${suffix}`;
      const nextValue = value.slice(0, start) + replacement + value.slice(end);

      onChange(nextValue);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length);
      }, 0);
    },
    [value, onChange]
  );

  // Check cursor position for [[ pattern
  const checkForWikilinkTrigger = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const cursor = textarea.selectionStart;
    const textBeforeCursor = value.slice(0, cursor);

    // Look for [[ without preceding escape and without newline or closing ]]
    const match = textBeforeCursor.match(/(?:^|[^\\])\[\[([^\]\n]*)$/);

    if (match) {
      const matchText = match[0];
      const linkStart = cursor - match[1].length - (matchText.startsWith("[[") ? 2 : 2);
      const query = match[1];

      setLinkStartIndex(linkStart);
      setAutocompleteQuery(query);
      setIsAutocompleteOpen(true);
      setSelectedIndex(0);

      // Estimate coordinates based on line calculation
      const lines = textBeforeCursor.split("\n");
      const currentLineIndex = lines.length - 1;
      const currentLine = lines[currentLineIndex] || "";
      const approxTop = Math.min(Math.max(10, textarea.clientHeight - 200), Math.max(36, (currentLineIndex + 1) * 22 + 40));
      const maxAvailableLeft = Math.max(8, textarea.clientWidth - 295);
      const approxLeft = Math.max(8, Math.min(maxAvailableLeft, currentLine.length * 8));
      setPopoverCoords({ top: approxTop, left: approxLeft });
    } else {
      setIsAutocompleteOpen(false);
    }
  }, [value]);

  // Fetch autocomplete suggestions with debounce
  useEffect(() => {
    if (!isAutocompleteOpen) {
      setAutocompleteSuggestions([]);
      return;
    }

    const timer = setTimeout(() => {
      startSearchTransition(async () => {
        try {
          const results = await LifeTrackerApiClient.autocompleteNotes(autocompleteQuery);
          setAutocompleteSuggestions(results);
        } catch {
          setAutocompleteSuggestions([]);
        }
      });
    }, 180);

    return () => clearTimeout(timer);
  }, [autocompleteQuery, isAutocompleteOpen]);

  // Apply selected autocomplete suggestion
  const applySuggestion = useCallback(
    (title: string) => {
      const textarea = textareaRef.current;
      if (!textarea || linkStartIndex === null) return;

      const cursor = textarea.selectionStart;
      const beforeLink = value.slice(0, linkStartIndex);
      const afterCursor = value.slice(cursor);

      // If user typed closing brackets or part of them right after cursor, adjust
      let postText = afterCursor;
      if (postText.startsWith("]]")) {
        postText = postText.slice(2);
      } else if (postText.startsWith("]")) {
        postText = postText.slice(1);
      }

      const inserted = `[[${title}]]`;
      const nextValue = beforeLink + inserted + postText;
      const newCursorPos = beforeLink.length + inserted.length;

      onChange(nextValue);
      setIsAutocompleteOpen(false);
      setAutocompleteQuery("");
      setLinkStartIndex(null);

      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }, 0);
    },
    [value, linkStartIndex, onChange]
  );

  // Keyboard navigation for autocomplete popover
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (isAutocompleteOpen) {
      const totalOptions = autocompleteSuggestions.length + (autocompleteQuery.trim() ? 1 : 0);

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, totalOptions));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + totalOptions) % Math.max(1, totalOptions));
        return;
      }
      if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (autocompleteSuggestions.length > 0 && selectedIndex < autocompleteSuggestions.length) {
          applySuggestion(autocompleteSuggestions[selectedIndex].title);
        } else if (autocompleteQuery.trim()) {
          applySuggestion(autocompleteQuery.trim());
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setIsAutocompleteOpen(false);
        return;
      }
    }

    // Support Tab key indentation inside textarea
    if (e.key === "Tab" && !isAutocompleteOpen) {
      e.preventDefault();
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const nextValue = value.slice(0, start) + "  " + value.slice(end);
      onChange(nextValue);
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={`flex flex-col h-full bg-zinc-950 border border-zinc-800 rounded-xl overflow-hidden ${className}`}>
      {/* Editor Header / Action Bar */}
      <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 border-b border-zinc-800 bg-zinc-900/60 backdrop-blur-sm select-none">
        {/* Formatting tools */}
        <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none touch-pan-x flex-1 min-w-0 pr-1">
          <button
            type="button"
            title="Negrita (Ctrl+B)"
            onClick={() => insertText("**", "**", "texto")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Cursiva (Ctrl+I)"
            onClick={() => insertText("*", "*", "texto")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-zinc-800 mx-1 shrink-0" />
          <button
            type="button"
            title="Título 1"
            onClick={() => insertText("\n# ", "", "Título")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <Heading1 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Título 2"
            onClick={() => insertText("\n## ", "", "Subtítulo")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-4 bg-zinc-800 mx-1 shrink-0" />
          <button
            type="button"
            title="Wikilink / Enlace de Segundo Cerebro"
            onClick={() => insertText("[[", "]]", "Nota o Idea")}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-indigo-400 bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/20 transition shrink-0"
          >
            <LinkIcon className="w-3 h-3" />
            <span>[[Enlace]]</span>
          </button>
          <button
            type="button"
            title="Lista con viñetas"
            onClick={() => insertText("\n- ", "", "Elemento")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Lista de tareas"
            onClick={() => insertText("\n- [ ] ", "", "Nueva tarea")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <CheckSquare className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Cita"
            onClick={() => insertText("\n> ", "", "Cita")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <Quote className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title="Bloque de código"
            onClick={() => insertText("\n```ts\n", "\n```\n", "// código")}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition shrink-0"
          >
            <Code className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center gap-0.5 bg-zinc-900 border border-zinc-800 rounded-lg p-0.5 text-xs shrink-0">
          <button
            type="button"
            onClick={() => handleSetMode("write")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
              activeMode === "write"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Edit3 className="w-3 h-3" />
            <span>Escribir</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetMode("preview")}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
              activeMode === "preview"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Eye className="w-3 h-3" />
            <span>Vista Previa</span>
          </button>
          <button
            type="button"
            onClick={() => handleSetMode("split")}
            className={`hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md transition font-medium ${
              activeMode === "split"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
            }`}
          >
            <Columns className="w-3 h-3" />
            <span>Doble Columna</span>
          </button>
        </div>
      </div>

      {/* Editor / Preview Content Area */}
      <div className="relative flex-1 min-h-0 overflow-hidden">
        <div className="grid h-full grid-cols-1 md:grid-cols-2">
          {/* Write Column */}
          {(activeMode === "write" || activeMode === "split") && (
            <div
              className={`relative h-full flex flex-col ${
                activeMode === "split" ? "md:border-r md:border-zinc-800 col-span-1" : "col-span-full"
              }`}
            >
              <textarea
                ref={textareaRef}
                value={value}
                disabled={readOnly}
                onChange={(e) => {
                  onChange(e.target.value);
                  checkForWikilinkTrigger();
                }}
                onKeyUp={checkForWikilinkTrigger}
                onClick={checkForWikilinkTrigger}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                spellCheck={false}
                className="w-full h-full p-3 sm:p-4 bg-zinc-950 text-zinc-100 font-mono text-base md:text-sm leading-relaxed resize-none focus:outline-none focus:ring-0 placeholder:text-zinc-600 selection:bg-indigo-500/30"
              />

              {/* Autocomplete Popover */}
              {isAutocompleteOpen && (
                <div
                  style={{
                    top: `${popoverCoords.top}px`,
                    left: `${popoverCoords.left}px`,
                  }}
                  className="absolute z-50 w-72 max-w-[calc(100vw-32px)] sm:max-w-[calc(100%-32px)] bg-zinc-900/95 backdrop-blur-md border border-indigo-500/30 rounded-xl shadow-2xl shadow-indigo-950/50 p-1 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100"
                >
                  <div className="flex items-center justify-between px-2 py-1.5 text-[11px] font-medium text-zinc-400 border-b border-zinc-800/80 mb-1">
                    <span className="flex items-center gap-1 text-indigo-400">
                      <Sparkles className="w-3 h-3" />
                      Enlazar a nota
                    </span>
                    <span className="text-[10px] text-zinc-500">↑↓ navegar · ↵ insertar</span>
                  </div>

                  <div className="max-h-52 overflow-y-auto space-y-0.5">
                    {autocompleteSuggestions.map((item, idx) => {
                      const isSelected = idx === selectedIndex;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => applySuggestion(item.title)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-lg flex flex-col gap-0.5 transition ${
                            isSelected ? "bg-indigo-600 text-white" : "text-zinc-300 hover:bg-zinc-800/80"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-semibold truncate">{item.title}</span>
                            <span className={`text-[10px] ${isSelected ? "text-indigo-200" : "text-zinc-500"}`}>
                              /{item.slug}
                            </span>
                          </div>
                          {item.tags && item.tags.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap mt-0.5">
                              {item.tags.slice(0, 3).map((t) => (
                                <span
                                  key={t}
                                  className={`text-[9px] px-1 rounded ${
                                    isSelected
                                      ? "bg-indigo-700/50 text-indigo-100"
                                      : "bg-zinc-800 text-zinc-400 border border-zinc-700"
                                  }`}
                                >
                                  #{t}
                                </span>
                              ))}
                            </div>
                          )}
                        </button>
                      );
                    })}

                    {/* Fallback option to create stub if user typed something new */}
                    {autocompleteQuery.trim() && (
                      <button
                        type="button"
                        onClick={() => applySuggestion(autocompleteQuery.trim())}
                        className={`w-full text-left px-2.5 py-2 rounded-lg flex items-center gap-2 transition ${
                          selectedIndex === autocompleteSuggestions.length
                            ? "bg-indigo-600 text-white"
                            : "text-indigo-300 hover:bg-zinc-800/80 border border-dashed border-indigo-500/30"
                        }`}
                      >
                        <Sparkles className="w-3.5 h-3.5 shrink-0 text-indigo-400" />
                        <span className="truncate">
                          Crear stub: <strong className="underline">[[{autocompleteQuery.trim()}]]</strong>
                        </span>
                      </button>
                    )}

                    {!isSearching &&
                      autocompleteSuggestions.length === 0 &&
                      !autocompleteQuery.trim() && (
                        <div className="px-3 py-4 text-center text-zinc-500 text-xs">
                          Escribe para buscar o enlazar notas...
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Preview Column */}
          {(activeMode === "preview" || activeMode === "split") && (
            <div
              className={`h-full overflow-y-auto p-4 sm:p-6 bg-zinc-950/80 ${
                activeMode === "split" ? "hidden md:block col-span-1" : "col-span-full"
              }`}
            >
              <MarkdownRenderer content={value} onNavigateToNote={onNavigateToNote} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Native, secure and reactive Markdown renderer with bidirectional Wikilink parsing.
 */
export function MarkdownRenderer({
  content,
  onNavigateToNote,
}: {
  content: string;
  onNavigateToNote?: (target: string) => void;
}) {
  if (!content || !content.trim()) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-center p-8 text-zinc-500">
        <Sparkles className="w-8 h-8 mb-2 text-zinc-700" />
        <p className="text-sm">La vista previa aparecerá aquí a medida que escribas.</p>
        <p className="text-xs text-zinc-600 mt-1">Soporta encabezados, listas, código y wikilinks [[Nota]].</p>
      </div>
    );
  }

  // Parse lines into blocks
  const lines = content.split(/\r?\n/);
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];

  const flushCodeBlock = (key: string) => {
    if (codeBlockLines.length > 0 || inCodeBlock) {
      const codeText = codeBlockLines.join("\n");
      elements.push(
        <CodeBlockView key={key} code={codeText} language={codeBlockLang} />
      );
      codeBlockLines = [];
      codeBlockLang = "";
      inCodeBlock = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block detection
    const fenceMatch = line.match(/^```(\w*)/);
    if (fenceMatch) {
      if (inCodeBlock) {
        flushCodeBlock(`code-${i}`);
      } else {
        inCodeBlock = true;
        codeBlockLang = fenceMatch[1] || "";
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Horizontal Rule
    if (/^(---|___|\*\*\*)\s*$/.test(line)) {
      elements.push(<hr key={`hr-${i}`} className="my-4 border-zinc-800" />);
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const headingClass =
        level === 1
          ? "text-2xl font-bold text-zinc-100 tracking-tight mt-5 mb-2 pb-1 border-b border-zinc-800"
          : level === 2
          ? "text-xl font-semibold text-zinc-100 tracking-tight mt-4 mb-2"
          : level === 3
          ? "text-lg font-medium text-zinc-200 mt-3 mb-1.5"
          : "text-base font-medium text-zinc-300 mt-2 mb-1";

      elements.push(
        <div key={`h-${i}`} className={headingClass}>
          <InlineContent text={text} onNavigateToNote={onNavigateToNote} />
        </div>
      );
      continue;
    }

    // Blockquote
    const quoteMatch = line.match(/^>\s?(.*)$/);
    if (quoteMatch) {
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-2 pl-3 py-1 border-l-2 border-indigo-500 bg-indigo-500/5 text-zinc-300 italic text-sm rounded-r"
        >
          <InlineContent text={quoteMatch[1]} onNavigateToNote={onNavigateToNote} />
        </blockquote>
      );
      continue;
    }

    // Task list item
    const taskMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const isChecked = taskMatch[1].toLowerCase() === "x";
      elements.push(
        <div key={`task-${i}`} className="flex items-start gap-2.5 my-1 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={isChecked}
            readOnly
            className="mt-1 rounded border-zinc-700 bg-zinc-900 text-indigo-600 focus:ring-0 focus:ring-offset-0 cursor-default"
          />
          <span className={isChecked ? "line-through text-zinc-500" : ""}>
            <InlineContent text={taskMatch[2]} onNavigateToNote={onNavigateToNote} />
          </span>
        </div>
      );
      continue;
    }

    // Unordered List item
    const ulMatch = line.match(/^[-*]\s+(.*)$/);
    if (ulMatch) {
      elements.push(
        <div key={`ul-${i}`} className="flex items-start gap-2 my-1 text-sm text-zinc-300 pl-2">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-2 shrink-0" />
          <span>
            <InlineContent text={ulMatch[1]} onNavigateToNote={onNavigateToNote} />
          </span>
        </div>
      );
      continue;
    }

    // Ordered List item
    const olMatch = line.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      elements.push(
        <div key={`ol-${i}`} className="flex items-start gap-2 my-1 text-sm text-zinc-300 pl-2">
          <span className="text-xs font-mono text-zinc-500 mt-0.5 shrink-0">{olMatch[1]}.</span>
          <span>
            <InlineContent text={olMatch[2]} onNavigateToNote={onNavigateToNote} />
          </span>
        </div>
      );
      continue;
    }

    // Empty line
    if (!line.trim()) {
      elements.push(<div key={`blank-${i}`} className="h-2.5" />);
      continue;
    }

    // Standard paragraph
    elements.push(
      <p key={`p-${i}`} className="my-1.5 text-sm text-zinc-300 leading-relaxed">
        <InlineContent text={line} onNavigateToNote={onNavigateToNote} />
      </p>
    );
  }

  // Flush open code block if reached EOF
  if (inCodeBlock) {
    flushCodeBlock("code-eof");
  }

  return <div className="space-y-0.5 text-zinc-200">{elements}</div>;
}

/**
 * Inline text parser with Wikilink [[Target|Alias]], bold, italic, code and standard links.
 */
function InlineContent({
  text,
  onNavigateToNote,
}: {
  text: string;
  onNavigateToNote?: (target: string) => void;
}) {
  // Regex to tokenize Wikilinks [[Target|Alias]], Inline Code `code`, Bold **bold**, Italic *italic*, and Links [text](url)
  const tokenRegex = /(\[\[(?:[^\]\n]+)\]\]|`[^`\n]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\)|#[a-zA-Z0-9_-]+)/g;

  const parts = text.split(tokenRegex);

  return (
    <>
      {parts.map((part, index) => {
        if (!part) return null;

        // Wikilink [[Target|Alias]]
        if (part.startsWith("[[") && part.endsWith("]]")) {
          const inner = part.slice(2, -2).trim();
          const pipeIndex = inner.indexOf("|");
          const target = pipeIndex !== -1 ? inner.slice(0, pipeIndex).trim() : inner;
          const label = pipeIndex !== -1 ? inner.slice(pipeIndex + 1).trim() : target;

          return (
            <button
              key={index}
              type="button"
              onClick={() => onNavigateToNote && onNavigateToNote(target)}
              title={`Ir a nota: ${target}`}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5 rounded bg-indigo-500/15 text-indigo-400 hover:text-indigo-200 hover:bg-indigo-500/25 border border-indigo-500/30 transition font-medium text-xs sm:text-sm cursor-pointer align-baseline group"
            >
              <LinkIcon className="w-3 h-3 text-indigo-400 group-hover:scale-110 transition-transform" />
              <span className="underline decoration-indigo-400/40 group-hover:decoration-indigo-300">
                {label}
              </span>
            </button>
          );
        }

        // Inline Code `code`
        if (part.startsWith("`") && part.endsWith("`") && part.length > 2) {
          return (
            <code
              key={index}
              className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/90 text-indigo-300 font-mono text-xs border border-zinc-700/60"
            >
              {part.slice(1, -1)}
            </code>
          );
        }

        // Bold **text**
        if (part.startsWith("**") && part.endsWith("**") && part.length > 4) {
          return (
            <strong key={index} className="font-bold text-zinc-100">
              {part.slice(2, -2)}
            </strong>
          );
        }

        // Italic *text*
        if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
          return (
            <em key={index} className="italic text-zinc-200">
              {part.slice(1, -1)}
            </em>
          );
        }

        // Tag #tag
        if (part.startsWith("#") && part.length > 1 && !part.includes(" ")) {
          return (
            <span
              key={index}
              className="inline-block px-1.5 py-0.2 mx-0.5 rounded text-[11px] font-medium bg-zinc-800 text-zinc-400 border border-zinc-700/80"
            >
              {part}
            </span>
          );
        }

        // Standard link [text](url)
        const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
        if (linkMatch) {
          return (
            <a
              key={index}
              href={linkMatch[2]}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 text-indigo-400 hover:text-indigo-300 underline text-sm"
            >
              <span>{linkMatch[1]}</span>
              <ExternalLink className="w-2.5 h-2.5" />
            </a>
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function CodeBlockView({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="relative my-3 rounded-xl bg-zinc-900 border border-zinc-800 overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-zinc-900/90 border-b border-zinc-800/80 text-zinc-400 font-mono">
        <span className="text-[11px] font-semibold uppercase">{language || "text"}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] hover:text-zinc-200 transition"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-400">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-zinc-200 font-mono leading-relaxed selection:bg-indigo-500/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}
