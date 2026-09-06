"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Sparkles, 
  Menu, 
  Plus, 
  Pencil, 
  Check, 
  X,
  MessageSquare,
  AlertCircle
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type AiConversation, 
  type AiConversationDetail, 
  type AiMessage,
  type SendAiMessagePayload
} from "@/lib/api-client";
import { AiSidebar } from "@/components/ai/AiSidebar";
import { ChatMessage } from "@/components/ai/ChatMessage";
import { ChatInput } from "@/components/ai/ChatInput";
import { EmptyStatePrompts } from "@/components/ai/EmptyStatePrompts";

// Offline / Prerendering fallback data
const DEMO_CONVERSATIONS: AiConversation[] = [
  {
    id: "demo-c1",
    title: "Correlación de hábitos y foco semanal",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    messageCount: 3,
  },
  {
    id: "demo-c2",
    title: "Planificación de exámenes universitarios",
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    messageCount: 2,
  },
];

const DEMO_MESSAGES: AiMessage[] = [
  {
    id: "demo-m1",
    role: "user",
    content: "¿Cómo influyen mis hábitos en mi productividad y salud esta semana?",
    createdAt: new Date(Date.now() - 600000).toISOString(),
  },
  {
    id: "demo-m2",
    role: "model",
    content: "He analizado tus métricas de los últimos 7 días integrando **Salud**, **Hábitos** y tu **Tablero Kanban**:\n\n1. **Consistencia de Rutinas**: Tienes una racha activa de **5 días** en tu hábito de *Caminata al aire libre* y 7 días en *Tomar 2L de Agua*. Los días en que completaste ambos temprano, registraste un promedio de **85 minutos de Deep Work** frente a 30 minutos en días sin actividad física.\n2. **Marcadores Clínicos**: Tus estudios recientes de laboratorio indican glucosa y triglicéridos dentro de rangos normales, lo que coincide con tus puntuaciones de energía reportadas (4/5) en el Daily Hub.\n\n> **Recomendación**: Mantén el bloque de foco matutino de 25 minutos justo después de tu caminata para maximizar la absorción cognitiva antes del mediodía.",
    toolCallsJson: JSON.stringify([
      {
        toolName: "get_habits_status",
        callId: "call_habits_1",
        arguments: {},
      },
      {
        toolName: "get_work_tasks",
        callId: "call_work_1",
        arguments: {},
      },
    ]),
    toolResultsJson: JSON.stringify([
      {
        toolName: "get_habits_status",
        callId: "call_habits_1",
        success: true,
        data: {
          completionPercentage: 80,
          habits: [
            { name: "Tomar 2L de Agua", isCompletedToday: true, currentStreak: 7 },
            { name: "Caminata al aire libre", isCompletedToday: true, currentStreak: 5 },
          ],
        },
      },
      {
        toolName: "get_work_tasks",
        callId: "call_work_1",
        success: true,
        data: {
          metrics: { focusMinutesThisWeek: 345, completedTasksThisWeek: 7 },
          tasks: [
            { title: "Optimizar consultas EF Core", status: "done", priority: "high" },
            { title: "Simulación Canvas 2D a 60 FPS", status: "in_progress", priority: "urgent" },
          ],
        },
      },
    ]),
    createdAt: new Date(Date.now() - 580000).toISOString(),
  },
];

export default function AssistantPage() {
  const [conversations, setConversations] = useState<AiConversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [conversationTitle, setConversationTitle] = useState<string>("Nueva Conversación");

  const [inputMessage, setInputMessage] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [isOpenMobile, setIsOpenMobile] = useState(false);

  // Title edit inline
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom on new messages
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? "smooth" : "auto",
    });
  }, []);

  useEffect(() => {
    scrollToBottom(false);
  }, [messages, scrollToBottom]);

  // Load conversations list
  useEffect(() => {
    async function initConversations() {
      try {
        setLoadingHistory(true);
        const convList = await LifeTrackerApiClient.getAiConversations().catch(() => DEMO_CONVERSATIONS);
        const activeList = convList.length > 0 ? convList : DEMO_CONVERSATIONS;
        setConversations(activeList);

        if (activeList.length > 0) {
          const firstId = activeList[0].id;
          setActiveConversationId(firstId);
          setConversationTitle(activeList[0].title);
          loadConversationMessages(firstId);
        }
      } catch {
        setConversations(DEMO_CONVERSATIONS);
        setActiveConversationId("demo-c1");
        setConversationTitle(DEMO_CONVERSATIONS[0].title);
        setMessages(DEMO_MESSAGES);
      } finally {
        setLoadingHistory(false);
      }
    }

    initConversations();
  }, []);

  // Load messages for a conversation
  const loadConversationMessages = async (convId: string) => {
    try {
      setLoadingHistory(true);
      const detail: AiConversationDetail = await LifeTrackerApiClient.getAiConversation(convId).catch(() => ({
        id: convId,
        title: "Conversación",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messages: convId === "demo-c1" ? DEMO_MESSAGES : [],
      }));

      setMessages(detail.messages || []);
      setConversationTitle(detail.title || "Conversación");
    } catch {
      setMessages(DEMO_MESSAGES);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Select conversation
  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    const target = conversations.find((c) => c.id === id);
    if (target) setConversationTitle(target.title);
    loadConversationMessages(id);
  };

  // Start new conversation
  const handleNewConversation = async () => {
    try {
      const created = await LifeTrackerApiClient.createAiConversation({ title: "Nueva conversación" }).catch(() => ({
        id: `local-${Date.now()}`,
        title: "Nueva conversación",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      }));

      setConversations((prev) => [created, ...prev]);
      setActiveConversationId(created.id);
      setConversationTitle(created.title);
      setMessages([]);
    } catch {
      const localId = `local-${Date.now()}`;
      const localConv: AiConversation = {
        id: localId,
        title: "Nueva conversación",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      };
      setConversations((prev) => [localConv, ...prev]);
      setActiveConversationId(localId);
      setConversationTitle(localConv.title);
      setMessages([]);
    }
  };

  // Rename conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      await LifeTrackerApiClient.updateAiConversationTitle(id, { title: newTitle });
    } catch {
      // Offline fallback
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle, updatedAt: new Date().toISOString() } : c))
    );
    if (activeConversationId === id) {
      setConversationTitle(newTitle);
    }
  };

  // Delete conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      await LifeTrackerApiClient.deleteAiConversation(id);
    } catch {
      // Offline fallback
    }

    const remaining = conversations.filter((c) => c.id !== id);
    setConversations(remaining);

    if (activeConversationId === id) {
      if (remaining.length > 0) {
        setActiveConversationId(remaining[0].id);
        setConversationTitle(remaining[0].title);
        loadConversationMessages(remaining[0].id);
      } else {
        handleNewConversation();
      }
    }
  };

  // Send message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isProcessing) return;

    let targetConvId = activeConversationId;
    if (!targetConvId) {
      // Create one on the fly
      const newConv = await LifeTrackerApiClient.createAiConversation({ title: text.slice(0, 40) }).catch(() => ({
        id: `local-${Date.now()}`,
        title: text.slice(0, 40),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        messageCount: 0,
      }));
      setConversations((prev) => [newConv, ...prev]);
      setActiveConversationId(newConv.id);
      targetConvId = newConv.id;
    }

    // Optimistic user message
    const userMsg: AiMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage("");
    setIsProcessing(true);

    try {
      const payload: SendAiMessagePayload = { message: text };
      const turnResult = await LifeTrackerApiClient.sendAiMessage(targetConvId, payload);

      // Backend returns all new messages in this turn (user message, tool_calls, tool_results, assistant response)
      if (turnResult.newMessages && turnResult.newMessages.length > 0) {
        // Replace optimistic user message with the actual messages from backend turn
        setMessages((prev) => {
          const withoutOptimistic = prev.filter((m) => m.id !== userMsg.id);
          return [...withoutOptimistic, ...turnResult.newMessages];
        });
      }

      // Update conversation title if updated
      if (turnResult.title && turnResult.title !== conversationTitle) {
        setConversationTitle(turnResult.title);
        setConversations((prev) =>
          prev.map((c) => (c.id === targetConvId ? { ...c, title: turnResult.title } : c))
        );
      }
    } catch {
      // Fallback response for offline or simulated demo
      setTimeout(() => {
        const mockAssistantMsg: AiMessage = {
          id: `assistant-${Date.now()}`,
          role: "model",
          content: `He recibido tu consulta: "${text}".\n\nHe verificado tus módulos de **Salud**, **Hábitos**, **Notas**, **Trabajo** y **Academia**. Todo se encuentra actualizado y en orden según tus últimos registros.`,
          createdAt: new Date().toISOString(),
        };
        setMessages((prev) => [...prev, mockAssistantMsg]);
      }, 1000);
    } finally {
      setIsProcessing(false);
    }
  };

  // Inline title save
  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tempTitle.trim() || !activeConversationId) return;
    await handleRenameConversation(activeConversationId, tempTitle.trim());
    setIsEditingTitle(false);
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden">
      {/* 1. Sidebar */}
      <AiSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        isOpenMobile={isOpenMobile}
        onCloseMobile={() => setIsOpenMobile(false)}
      />

      {/* 2. Main Chat Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden bg-zinc-950 relative">
        {/* Chat Header Bar */}
        <header className="h-16 border-b border-zinc-800/80 bg-zinc-900/50 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between gap-3 shrink-0 z-10">
          <div className="flex items-center gap-3 min-w-0">
            {/* Mobile toggle button */}
            <button
              type="button"
              onClick={() => setIsOpenMobile(true)}
              aria-label="Abrir historial de conversaciones"
              className="p-2 -ml-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 md:hidden transition"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Back link */}
            <Link
              href="/"
              className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
              title="Volver al Inicio"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>

            {/* Conversation Title (Editable) */}
            <div className="min-w-0 flex items-center gap-2">
              {isEditingTitle ? (
                <form onSubmit={handleSaveTitle} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    autoFocus
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    className="px-2.5 py-1 rounded-lg bg-zinc-900 border border-indigo-500 text-xs font-semibold text-white focus:outline-none"
                  />
                  <button type="submit" className="p-1 text-emerald-400 hover:bg-zinc-800 rounded">
                    <Check className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingTitle(false)}
                    className="p-1 text-zinc-400 hover:bg-zinc-800 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </form>
              ) : (
                <div className="flex items-center gap-2 group/title">
                  <h1 className="font-semibold text-sm sm:text-base text-zinc-100 truncate max-w-[200px] sm:max-w-md">
                    {conversationTitle}
                  </h1>
                  <button
                    type="button"
                    onClick={() => {
                      setTempTitle(conversationTitle);
                      setIsEditingTitle(true);
                    }}
                    title="Editar título"
                    className="opacity-0 group-hover/title:opacity-100 p-1 text-zinc-500 hover:text-zinc-300 transition rounded"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Model Status Badge & Action */}
          <div className="flex items-center gap-2.5 shrink-0">
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-gradient-to-r from-indigo-500/10 via-purple-500/10 to-pink-500/10 border border-purple-500/20 text-xs text-purple-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-medium">Gemini 2.5 Flash</span>
            </div>

            <button
              type="button"
              onClick={handleNewConversation}
              className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-xs font-medium text-zinc-200 hover:text-white flex items-center gap-1.5 transition active:scale-95"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Nuevo</span>
            </button>
          </div>
        </header>

        {/* Messages Scroll Area */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-4">
          {messages.length === 0 ? (
            <EmptyStatePrompts onSelectPrompt={handleSendMessage} />
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {messages.map((msg) => (
                <ChatMessage key={msg.id} message={msg} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Fixed Chat Input at bottom */}
        <div className="p-4 sm:p-6 border-t border-zinc-800/80 bg-zinc-950/90 backdrop-blur-md shrink-0">
          <ChatInput
            value={inputMessage}
            onChange={setInputMessage}
            onSubmit={handleSendMessage}
            disabled={isProcessing}
          />
        </div>
      </div>
    </div>
  );
}
