"use client";

import React, { useState } from "react";
import { Sparkles, User, Copy, Check, Terminal } from "lucide-react";
import type { AiMessage } from "@/lib/api-client";
import { RichToolCards } from "./RichToolCards";

interface ChatMessageProps {
  message: AiMessage;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === "user";
  const isAssistant = message.role === "model" || message.role === "system";
  const isTool = message.role === "tool_call" || message.role === "tool_result";

  // Check if this message has tools executed
  const hasToolCalls = Boolean(message.toolCallsJson && message.toolCallsJson !== "[]");
  const hasToolResults = Boolean(message.toolResultsJson && message.toolResultsJson !== "[]");

  return (
    <div
      className={`flex items-start gap-3 my-4 group ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Avatar Icon */}
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
          isUser
            ? "bg-indigo-600 text-white"
            : "bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 text-white shadow-purple-500/20"
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
      </div>

      {/* Message Content Container */}
      <div
        className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 transition-all duration-200 ${
          isUser
            ? "bg-indigo-950/40 border border-indigo-500/30 text-zinc-100 rounded-tr-sm"
            : "bg-zinc-900/90 border border-zinc-800 text-zinc-200 rounded-tl-sm shadow-sm"
        }`}
      >
        {/* Role identifier / Author line for assistant */}
        {!isUser && (
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-[11px] font-semibold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              Gemini 2.5 Flash
            </span>
            <span className="text-[10px] text-zinc-500">• Asistente Holístico</span>
          </div>
        )}

        {/* Rich Tool Cards (if assistant invoked or executed tools) */}
        {(hasToolResults || hasToolCalls || isTool) && (
          <RichToolCards
            toolResultsJson={message.toolResultsJson}
            toolCallsJson={message.toolCallsJson}
          />
        )}

        {/* Message Markdown Body */}
        {message.content && (
          <div className="text-sm leading-relaxed space-y-2 break-words">
            <LightweightMarkdown content={message.content} isUser={isUser} />
          </div>
        )}

        {/* Timestamp */}
        <div
          className={`mt-2 text-[10px] text-zinc-500 flex items-center gap-1 ${
            isUser ? "justify-end" : "justify-start"
          }`}
        >
          <span>
            {new Date(message.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </div>
    </div>
  );
}

// -----------------------------------------------------------------------------
// Lightweight Markdown Renderer with Fenced Code Blocks & Copy Button
// -----------------------------------------------------------------------------
interface LightweightMarkdownProps {
  content: string;
  isUser: boolean;
}

function LightweightMarkdown({ content, isUser }: LightweightMarkdownProps) {
  // Split content by code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    const textBefore = content.substring(lastIndex, match.index);
    if (textBefore) {
      parts.push(
        <TextMarkdown key={`text-${lastIndex}`} raw={textBefore} isUser={isUser} />
      );
    }

    const language = match[1] || "code";
    const codeContent = match[2].trimEnd();
    parts.push(
      <CodeBlock
        key={`code-${match.index}`}
        language={language}
        code={codeContent}
      />
    );

    lastIndex = match.index + match[0].length;
  }

  const remaining = content.substring(lastIndex);
  if (remaining) {
    parts.push(
      <TextMarkdown key={`text-${lastIndex}`} raw={remaining} isUser={isUser} />
    );
  }

  return <>{parts}</>;
}

// Code Block with Copy Feedback
function CodeBlock({ language, code }: { language: string; code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl bg-black/70 border border-zinc-800 overflow-hidden font-mono text-xs">
      <div className="px-3 py-1.5 bg-zinc-950/80 border-b border-zinc-800/80 flex items-center justify-between text-[11px] text-zinc-400">
        <div className="flex items-center gap-1.5">
          <Terminal className="w-3.5 h-3.5 text-zinc-500" />
          <span className="uppercase tracking-wider font-semibold text-zinc-400">
            {language}
          </span>
        </div>

        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-800/60 hover:bg-zinc-700 text-zinc-300 hover:text-white transition active:scale-95"
          title="Copiar código"
        >
          {copied ? (
            <>
              <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
              <span className="text-emerald-400 font-semibold">Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>

      <div className="p-3 overflow-x-auto text-zinc-200 leading-relaxed max-h-96">
        <pre>{code}</pre>
      </div>
    </div>
  );
}

// Markdown formatting for paragraphs, headers, bold, italics, lists, blockquotes
function TextMarkdown({ raw, isUser }: { raw: string; isUser: boolean }) {
  const lines = raw.split("\n");
  const renderedLines: React.ReactNode[] = [];

  let inList = false;
  let listItems: React.ReactNode[] = [];

  const flushList = () => {
    if (inList) {
      renderedLines.push(
        <ul key={`ul-${renderedLines.length}`} className="list-disc list-inside space-y-1 my-1 pl-1">
          {listItems}
        </ul>
      );
      inList = false;
      listItems = [];
    }
  };

  lines.forEach((line, idx) => {
    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      return;
    }

    // Headers
    if (trimmed.startsWith("### ")) {
      flushList();
      renderedLines.push(
        <h4 key={idx} className="font-bold text-sm text-zinc-100 mt-2 mb-1">
          {formatInline(trimmed.substring(4))}
        </h4>
      );
      return;
    }

    if (trimmed.startsWith("## ")) {
      flushList();
      renderedLines.push(
        <h3 key={idx} className="font-bold text-base text-zinc-100 mt-3 mb-1">
          {formatInline(trimmed.substring(3))}
        </h3>
      );
      return;
    }

    if (trimmed.startsWith("# ")) {
      flushList();
      renderedLines.push(
        <h2 key={idx} className="font-bold text-lg text-white mt-3 mb-1">
          {formatInline(trimmed.substring(2))}
        </h2>
      );
      return;
    }

    // Blockquote
    if (trimmed.startsWith("> ")) {
      flushList();
      renderedLines.push(
        <blockquote
          key={idx}
          className="border-l-2 border-indigo-500/50 pl-3 py-0.5 my-1.5 italic text-zinc-400 bg-indigo-950/10 rounded-r-lg"
        >
          {formatInline(trimmed.substring(2))}
        </blockquote>
      );
      return;
    }

    // Unordered List (- or *)
    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      inList = true;
      listItems.push(
        <li key={`li-${idx}`} className="text-zinc-300">
          {formatInline(trimmed.substring(2))}
        </li>
      );
      return;
    }

    // Normal Paragraph
    flushList();
    renderedLines.push(
      <p key={idx} className={`${isUser ? "text-zinc-100" : "text-zinc-300"} my-0.5`}>
        {formatInline(trimmed)}
      </p>
    );
  });

  flushList();

  return <>{renderedLines}</>;
}

// Formats inline text: **bold**, *italic*, `code`, [[wikilinks]]
function formatInline(text: string): React.ReactNode {
  // Regex to match bold, italic, code, wikilinks
  const inlineRegex = /(\*\*.*?\*\*|\*.*?\*|`.*?`|\[\[.*?\]\])/g;
  const parts = text.split(inlineRegex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part.substring(2, part.length - 2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return (
        <em key={i} className="italic text-zinc-200">
          {part.substring(1, part.length - 1)}
        </em>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 rounded bg-black/60 border border-zinc-800 text-indigo-300 font-mono text-xs"
        >
          {part.substring(1, part.length - 1)}
        </code>
      );
    }
    if (part.startsWith("[[") && part.endsWith("]]")) {
      const target = part.substring(2, part.length - 2);
      return (
        <span
          key={i}
          className="inline-flex items-center px-1.5 py-0.2 rounded font-mono text-xs bg-indigo-500/15 text-indigo-300 border border-indigo-500/30"
        >
          [[{target}]]
        </span>
      );
    }
    return part;
  });
}
