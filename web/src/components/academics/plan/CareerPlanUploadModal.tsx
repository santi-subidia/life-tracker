"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { 
  UploadCloud, 
  FileText, 
  Image as ImageIcon, 
  X, 
  Sparkles, 
  AlertCircle, 
  Loader2, 
  CheckCircle2 
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type CareerPlanDraft 
} from "@/lib/api-client";

interface CareerPlanUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDraftExtracted: (draft: CareerPlanDraft) => void;
}

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const ALLOWED_EXTENSIONS = [".pdf", ".png", ".jpg", ".jpeg", ".webp"];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
];

export function CareerPlanUploadModal({
  isOpen,
  onClose,
  onDraftExtracted,
}: CareerPlanUploadModalProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>("Analizando documento...");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset state on modal open/close
  useEffect(() => {
    if (!isOpen) {
      setSelectedFile(null);
      setIsLoading(false);
      setErrorMessage(null);
      setIsDragging(false);
    }
  }, [isOpen]);

  // Handle ESC key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return `El archivo supera el límite de 10 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB).`;
    }
    const ext = "." + (file.name.split(".").pop()?.toLowerCase() || "");
    const isAllowedExt = ALLOWED_EXTENSIONS.includes(ext);
    const isAllowedMime = ALLOWED_MIME_TYPES.includes(file.type.toLowerCase());
    if (!isAllowedExt && !isAllowedMime) {
      return "Formato incompatible. Suba un documento PDF o imagen PNG, JPEG o WebP del plan de estudio.";
    }
    return null;
  };

  const handleFile = (file: File) => {
    const error = validateFile(file);
    if (error) {
      setErrorMessage(error);
      setSelectedFile(null);
      return;
    }
    setErrorMessage(null);
    setSelectedFile(file);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleProcess = async () => {
    if (!selectedFile) return;

    try {
      setIsLoading(true);
      setErrorMessage(null);
      setLoadingStep("Procesando documento con Gemini 2.5 Flash...");

      // Simulate helpful UX step updates while network is working
      const stepTimer1 = setTimeout(() => {
        setLoadingStep("Detectando materias, cuatrimestres y créditos...");
      }, 1500);

      const stepTimer2 = setTimeout(() => {
        setLoadingStep("Extrayendo correlatividades y reglas de aprobación...");
      }, 3500);

      const draft = await LifeTrackerApiClient.extractCareerPlan(selectedFile);

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      setLoadingStep("¡Malla extraída con éxito!");
      onDraftExtracted(draft);
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error inesperado al analizar el documento.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="upload-modal-title"
    >
      <div 
        className="w-full max-w-xl bg-neutral-900 border border-neutral-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 id="upload-modal-title" className="text-base font-semibold text-white">
                Subir Plan de Estudio
              </h2>
              <p className="text-xs text-neutral-400">
                Extracción automática con IA de materias y correlatividades
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-2 text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition disabled:opacity-50"
            aria-label="Cerrar modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 overflow-y-auto">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start gap-3">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1">
                <p className="font-medium text-rose-200">No se pudo procesar el archivo</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Dropzone */}
          <div
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => !isLoading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
              isDragging
                ? "border-sky-500 bg-sky-500/10 scale-[0.99]"
                : selectedFile
                ? "border-emerald-500/40 bg-emerald-500/5 hover:border-emerald-500/60"
                : "border-neutral-800 hover:border-neutral-700 bg-neutral-950/40"
            } ${isLoading ? "pointer-events-none opacity-60" : ""}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFile(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  {selectedFile.type.includes("pdf") ? (
                    <FileText className="w-7 h-7" />
                  ) : (
                    <ImageIcon className="w-7 h-7" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-white max-w-xs truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-neutral-400 mt-0.5">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Clic para cambiar de archivo
                  </p>
                </div>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-medium border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Archivo listo para extraer
                </div>
              </div>
            ) : (
              <div className="space-y-3 flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-neutral-800/80 border border-neutral-700/50 text-neutral-400 flex items-center justify-center group-hover:scale-105 transition">
                  <UploadCloud className="w-7 h-7 text-sky-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-neutral-200">
                    Arrastra aquí tu plan de carrera o{" "}
                    <span className="text-sky-400 hover:underline">haz clic para examinar</span>
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Formatos admitidos: PDF, PNG, JPG, WebP (hasta 10 MB)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Extraction Loader State */}
          {isLoading && (
            <div className="p-4 rounded-2xl bg-neutral-950/80 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-3">
                <Loader2 className="w-5 h-5 text-sky-400 animate-spin" />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-white">{loadingStep}</p>
                  <p className="text-[11px] text-neutral-400">
                    Esto suele tomar entre 3 y 8 segundos dependiendo del documento.
                  </p>
                </div>
              </div>
              <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                <div className="bg-sky-500 h-full w-2/3 rounded-full animate-pulse transition-all duration-700" />
              </div>
            </div>
          )}

          {/* Informational Guidance */}
          <div className="p-4 rounded-2xl bg-neutral-950/40 border border-neutral-800/70 text-neutral-400 text-xs space-y-1.5">
            <p className="font-semibold text-neutral-300">💡 ¿Qué pasa después de subir el archivo?</p>
            <p className="text-neutral-400">
              Nuestro motor con IA estructurará la lista de materias por año y período con sus correlativas. Podrás <strong>revisar, corregir y ajustar</strong> cada detalle en la pantalla de revisión antes de guardarlo en tu cuenta.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-900/50 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleProcess}
            disabled={!selectedFile || isLoading}
            className="px-5 py-2.5 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 disabled:opacity-50 disabled:pointer-events-none text-white shadow-lg shadow-sky-600/20 active:scale-95 transition flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizando...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-sky-200" />
                <span>Analizar Malla con IA</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
