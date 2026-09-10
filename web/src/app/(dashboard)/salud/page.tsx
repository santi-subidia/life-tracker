"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { 
  Activity, 
  Upload, 
  FileText, 
  TrendingUp, 
  Sparkles, 
  Check, 
  Calendar, 
  Building2, 
  ArrowLeft, 
  Plus, 
  Trash2,
  AlertCircle,
  ExternalLink,
  X,
  Search,
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck,
  RotateCw
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type ExtractedClinicalValue,
  type ExtractedStudyResult, 
  type HealthStudy, 
  type MetricComparison 
} from "@/lib/api-client";

export default function HealthPage() {
  const [studies, setStudies] = useState<HealthStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loadingExistingStudy, setLoadingExistingStudy] = useState(false);
  const [previewData, setPreviewData] = useState<ExtractedStudyResult | null>(null);
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  const [previewSearch, setPreviewSearch] = useState<string>("");

  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [comparison, setComparison] = useState<MetricComparison | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "compare">("history");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modal de desglose detallado de estudio guardado
  const [selectedStudyForDetail, setSelectedStudyForDetail] = useState<HealthStudy | null>(null);
  const [detailSearch, setDetailSearch] = useState<string>("");
  const [detailFilter, setDetailFilter] = useState<"all" | "abnormal" | "normal">("all");
  const [deletingStudyId, setDeletingStudyId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const [studiesData, metricsData] = await Promise.all([
        LifeTrackerApiClient.getStudies().catch(() => []),
        LifeTrackerApiClient.getAvailableMetrics().catch(() => []),
      ]);
      setStudies(studiesData);
      setAvailableMetrics(metricsData);
      if (metricsData.length > 0 && !selectedMetric) {
        setSelectedMetric(metricsData[0]);
        loadMetricComparison(metricsData[0]);
      }
    } catch {
      // API might be offline or starting up
    } finally {
      setLoading(false);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setUploading(true);
      setErrorMessage(null);
      setSelectedFile(file);
      const localUrl = URL.createObjectURL(file);
      setUploadedFileUrl(localUrl);

      const result = await LifeTrackerApiClient.extractStudy(file);
      setPreviewData(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el estudio con IA.");
    } finally {
      setUploading(false);
    }
  }

  async function handleForceReextract() {
    if (!selectedFile) return;
    try {
      setUploading(true);
      setErrorMessage(null);
      const result = await LifeTrackerApiClient.extractStudy(selectedFile, true);
      setPreviewData(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al re-analizar el estudio.");
    } finally {
      setUploading(false);
    }
  }

  async function handleOpenExistingStudy(studyId: string) {
    try {
      setLoadingExistingStudy(true);
      const existing = await LifeTrackerApiClient.getStudy(studyId);
      if (existing) {
        setSelectedStudyForDetail(existing);
      }
    } catch (err: any) {
      setErrorMessage("No se pudo cargar el estudio guardado: " + err.message);
    } finally {
      setLoadingExistingStudy(false);
    }
  }

  // --- MÉTODOS DE EDICIÓN EN CALIENTE DEL PREVIEW ---
  function updateClinicalValue(index: number, field: keyof ExtractedClinicalValue, value: any) {
    if (!previewData) return;
    const updatedValues = [...previewData.clinicalValues];
    updatedValues[index] = {
      ...updatedValues[index],
      [field]: value
    };
    setPreviewData({ ...previewData, clinicalValues: updatedValues });
  }

  function toggleAbnormal(index: number) {
    if (!previewData) return;
    const current = previewData.clinicalValues[index].isAbnormal;
    updateClinicalValue(index, "isAbnormal", !current);
  }

  function removeClinicalValue(index: number) {
    if (!previewData) return;
    const updatedValues = previewData.clinicalValues.filter((_, idx) => idx !== index);
    setPreviewData({ ...previewData, clinicalValues: updatedValues });
  }

  function addClinicalValue() {
    if (!previewData) return;
    const newMetric: ExtractedClinicalValue = {
      metricName: "",
      value: "",
      unit: "",
      category: "General",
      isAbnormal: false
    };
    setPreviewData({
      ...previewData,
      clinicalValues: [newMetric, ...previewData.clinicalValues]
    });
  }

  async function handleConfirmSave(replaceExisting: boolean = false) {
    if (!previewData) return;

    const cleanedValues = previewData.clinicalValues.filter(v => v.metricName.trim() !== "");
    if (cleanedValues.length === 0) {
      setErrorMessage("Debes incluir al menos un valor clínico con nombre antes de guardar.");
      return;
    }

    try {
      setLoading(true);
      setErrorMessage(null);
      await LifeTrackerApiClient.saveStudy({
        studyType: previewData.studyType || "Estudio Clínico",
        studyDate: previewData.studyDate || new Date().toISOString().slice(0, 10),
        fileUrl: previewData.fileUrl,
        institution: previewData.institution,
        fileHash: previewData.fileHash,
        replaceStudyId: replaceExisting && previewData.existingStudy ? previewData.existingStudy.id : undefined,
        clinicalValues: cleanedValues,
      });

      setPreviewData(null);
      setUploadedFileUrl(null);
      setSelectedFile(null);
      setPreviewSearch("");
      await loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Error al guardar el estudio.");
    } finally {
      setLoading(false);
    }
  }

  async function loadMetricComparison(metricName: string) {
    if (!metricName) return;
    try {
      const comp = await LifeTrackerApiClient.compareMetric(metricName);
      setComparison(comp);
    } catch {
      // Metric might have no data yet
    }
  }

  async function handleDeleteStudy(studyId: string) {
    if (!confirm("¿Estás seguro de que deseas eliminar este estudio médico?")) return;
    try {
      setDeletingStudyId(studyId);
      await LifeTrackerApiClient.deleteStudy(studyId);
      if (selectedStudyForDetail?.id === studyId) {
        setSelectedStudyForDetail(null);
      }
      await loadData();
    } catch (err: any) {
      alert(err.message || "Error al eliminar el estudio.");
    } finally {
      setDeletingStudyId(null);
    }
  }

  // Filtrado de valores en preview
  const filteredPreviewValues = useMemo(() => {
    if (!previewData) return [];
    if (!previewSearch.trim()) return previewData.clinicalValues.map((v, i) => ({ ...v, originalIndex: i }));
    const q = previewSearch.toLowerCase();
    return previewData.clinicalValues
      .map((v, i) => ({ ...v, originalIndex: i }))
      .filter(v => v.metricName.toLowerCase().includes(q) || (v.unit && v.unit.toLowerCase().includes(q)));
  }, [previewData, previewSearch]);

  // Filtrado de valores en modal de detalle
  const filteredDetailValues = useMemo(() => {
    if (!selectedStudyForDetail) return [];
    let list = selectedStudyForDetail.clinicalValues;

    if (detailFilter === "abnormal") {
      list = list.filter(v => v.isAbnormal);
    } else if (detailFilter === "normal") {
      list = list.filter(v => !v.isAbnormal);
    }

    if (detailSearch.trim()) {
      const q = detailSearch.toLowerCase();
      list = list.filter(v => 
        v.metricName.toLowerCase().includes(q) || 
        (v.unit && v.unit.toLowerCase().includes(q)) ||
        (v.category && v.category.toLowerCase().includes(q))
      );
    }

    return list;
  }, [selectedStudyForDetail, detailSearch, detailFilter]);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <Link href="/" className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition shrink-0">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-sm sm:text-base truncate">Salud & Estudios</h1>
              <p className="text-xs text-neutral-400 hidden sm:block truncate">Seguimiento clínico y comparador multianual</p>
            </div>
          </div>

          <label className="cursor-pointer inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-600/20 transition shrink-0 whitespace-nowrap">
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Subir Estudio</span>
            <span className="sm:hidden">Subir</span>
            <input 
              type="file" 
              accept=".pdf,image/*" 
              className="hidden" 
              onChange={handleFileUpload} 
              disabled={uploading} 
            />
          </label>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto px-4 pt-6 space-y-6">
        {/* Error Alert */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            <p className="flex-1">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Upload Loading Spinner */}
        {uploading && (
          <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                Analizando con Google Gemini...
              </h3>
              <p className="text-xs text-neutral-400">Extrayendo tipo de estudio, fecha y determinaciones clínicas.</p>
            </div>
          </div>
        )}

        {/* ============================================================================== */}
        {/* PREVIEW CARD: EDICIÓN EN CALIENTE ANTES DE GUARDAR */}
        {/* ============================================================================== */}
        {previewData && (
          <section className="p-6 rounded-2xl bg-neutral-900 border border-rose-500/40 space-y-5 shadow-2xl animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                  <h2 className="text-base font-semibold text-white">Revisar y Editar Estudio Extraído</h2>
                </div>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Puedes corregir valores, unidades o agregar determinaciones antes de confirmar el guardado.
                </p>
              </div>

              {uploadedFileUrl && (
                <a
                  href={uploadedFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition"
                >
                  <Eye className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ver PDF Subido</span>
                  <ExternalLink className="w-3 h-3 text-neutral-400" />
                </a>
              )}
            </div>

            {/* BANNER DE DUPLICADO EXACTO (SHA-256) */}
            {previewData.duplicateStatus === "EXACT_FILE" && previewData.existingStudy && (
              <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/50 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 flex-shrink-0 text-amber-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-amber-300">
                      Archivo físico idéntico ya registrado
                    </p>
                    <p className="text-amber-200/80 leading-relaxed">
                      Este archivo exacto ya existe en tu historial como <strong className="text-white">"{previewData.existingStudy.studyType}"</strong> con fecha <strong className="text-white">{previewData.existingStudy.studyDate}</strong> (subido el {new Date(previewData.existingStudy.createdAt).toLocaleDateString()}). Se cargaron los valores existentes para evitar re-análisis redundantes.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenExistingStudy(previewData.existingStudy!.id)}
                    disabled={loadingExistingStudy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{loadingExistingStudy ? "Cargando..." : "Ver Estudio Guardado"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleForceReextract}
                    disabled={uploading}
                    title="Re-ejecutar extracción con Google Gemini ignorando el duplicado en caché"
                    className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 font-medium transition"
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${uploading ? "animate-spin" : ""}`} />
                    <span>Re-analizar con IA</span>
                  </button>
                </div>
              </div>
            )}

            {/* BANNER DE POSIBLE DUPLICADO SEMÁNTICO (MISMA FECHA Y TIPO) */}
            {previewData.duplicateStatus === "POSSIBLE_DUPLICATE" && previewData.existingStudy && (
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-500/40 text-blue-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 flex-shrink-0 text-blue-400 mt-0.5" />
                  <div className="space-y-1">
                    <p className="font-semibold text-blue-300">
                      Posible estudio duplicado detectado
                    </p>
                    <p className="text-blue-200/80 leading-relaxed">
                      Ya tienes registrado un estudio de tipo <strong className="text-white">"{previewData.existingStudy.studyType}"</strong> para la fecha <strong className="text-white">{previewData.existingStudy.studyDate}</strong> ({previewData.existingStudy.institution || "Sin institución"}). Comprueba si se trata del mismo estudio para evitar registrarlo dos veces.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => handleOpenExistingStudy(previewData.existingStudy!.id)}
                    disabled={loadingExistingStudy}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/40 font-medium transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{loadingExistingStudy ? "Cargando..." : "Ver Estudio Previo"}</span>
                  </button>
                </div>
              </div>
            )}

            {/* Datos Principales del Estudio */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-neutral-950/40 p-4 rounded-xl border border-neutral-800/80">
              <div>
                <label className="text-xs text-neutral-400 block font-medium">Tipo de Estudio</label>
                <input 
                  type="text" 
                  value={previewData.studyType} 
                  onChange={(e) => setPreviewData({ ...previewData, studyType: e.target.value })}
                  placeholder="ej. Hemograma Completo"
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block font-medium">Fecha de Realización</label>
                <input 
                  type="date" 
                  value={previewData.studyDate} 
                  onChange={(e) => setPreviewData({ ...previewData, studyDate: e.target.value })}
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400 block font-medium">Institución / Laboratorio</label>
                <input 
                  type="text" 
                  value={previewData.institution || ""} 
                  onChange={(e) => setPreviewData({ ...previewData, institution: e.target.value })}
                  placeholder="ej. Laboratorio Central"
                  className="w-full mt-1.5 px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Tabla Editable de Valores Clínicos */}
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-semibold text-neutral-200">
                    Determinaciones Extraídas ({previewData.clinicalValues.length})
                  </h3>
                  {previewData.clinicalValues.some(v => v.isAbnormal) && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/30 text-[11px] font-medium text-rose-400">
                      {previewData.clinicalValues.filter(v => v.isAbnormal).length} fuera de rango
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {previewData.clinicalValues.length > 5 && (
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input 
                        type="text"
                        value={previewSearch}
                        onChange={(e) => setPreviewSearch(e.target.value)}
                        placeholder="Filtrar métricas..."
                        className="pl-8 pr-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 w-44"
                      />
                    </div>
                  )}

                  <button
                    type="button"
                    onClick={addClinicalValue}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-medium border border-neutral-700 transition"
                  >
                    <Plus className="w-3.5 h-3.5 text-rose-400" />
                    <span>Agregar Métrica</span>
                  </button>
                </div>
              </div>

              {/* Contenedor con scroll para editar filas */}
              <div className="border border-neutral-800 rounded-xl overflow-hidden bg-neutral-950/70 max-h-[420px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="sticky top-0 bg-neutral-900 border-b border-neutral-800 text-neutral-400 font-medium z-10">
                    <tr>
                      <th className="p-3">Métrica / Analito</th>
                      <th className="p-3 w-32">Valor</th>
                      <th className="p-3 w-28">Unidad</th>
                      <th className="p-3 w-36 text-center">Estado Clínico</th>
                      <th className="p-3 w-12 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60">
                    {filteredPreviewValues.map((val) => {
                      const idx = val.originalIndex;
                      return (
                        <tr key={idx} className="hover:bg-neutral-900/40 transition-colors">
                          <td className="p-2.5">
                            <input 
                              type="text" 
                              value={val.metricName} 
                              onChange={(e) => updateClinicalValue(idx, "metricName", e.target.value)}
                              placeholder="Nombre de la prueba"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-200 text-xs focus:outline-none focus:border-rose-500"
                            />
                          </td>
                          <td className="p-2.5">
                            <input 
                              type="text" 
                              value={val.value} 
                              onChange={(e) => updateClinicalValue(idx, "value", e.target.value)}
                              placeholder="ej. 14.2"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 font-semibold text-rose-400 text-xs focus:outline-none focus:border-rose-500"
                            />
                          </td>
                          <td className="p-2.5">
                            <input 
                              type="text" 
                              value={val.unit || ""} 
                              onChange={(e) => updateClinicalValue(idx, "unit", e.target.value)}
                              placeholder="ej. mg/dL"
                              className="w-full px-2.5 py-1.5 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-300 text-xs focus:outline-none focus:border-rose-500"
                            />
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => toggleAbnormal(idx)}
                              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition inline-flex items-center gap-1.5 ${
                                val.isAbnormal 
                                  ? "bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500/30" 
                                  : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200 border border-neutral-700/60"
                              }`}
                            >
                              {val.isAbnormal ? (
                                <>
                                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                                  <span>Fuera de Rango</span>
                                </>
                              ) : (
                                <>
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Normal</span>
                                </>
                              )}
                            </button>
                          </td>
                          <td className="p-2.5 text-center">
                            <button
                              type="button"
                              onClick={() => removeClinicalValue(idx)}
                              title="Eliminar fila"
                              className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Acciones de Confirmación */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-neutral-800 pt-4">
              <span className="text-xs text-neutral-400">
                Se registrarán {previewData.clinicalValues.filter(v => v.metricName.trim() !== "").length} determinaciones clínicas.
              </span>

              <div className="flex flex-wrap items-center gap-2.5">
                <button 
                  type="button"
                  onClick={() => {
                    setPreviewData(null);
                    setUploadedFileUrl(null);
                    setSelectedFile(null);
                  }}
                  className="px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs transition"
                >
                  Cancelar
                </button>

                {previewData.existingStudy && (
                  <button
                    type="button"
                    onClick={() => handleConfirmSave(true)}
                    disabled={loading}
                    title="Actualizar el registro existente con los datos corregidos de este archivo"
                    className="px-4 py-2 rounded-xl bg-amber-600/90 hover:bg-amber-500 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-amber-600/20 transition disabled:opacity-50"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                    <span>Reemplazar Existente</span>
                  </button>
                )}

                <button 
                  type="button"
                  onClick={() => handleConfirmSave(false)}
                  disabled={loading}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-rose-600/20 transition disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>{previewData.existingStudy ? "Guardar como Nueva Copia" : "Confirmar y Guardar Estudio"}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-neutral-800 pb-2">
          <button 
            onClick={() => setActiveTab("history")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === "history" 
                ? "bg-neutral-800 text-white" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Historial de Estudios ({studies.length})
          </button>
          <button 
            onClick={() => setActiveTab("compare")}
            className={`px-4 py-2 rounded-xl text-xs font-medium transition ${
              activeTab === "compare" 
                ? "bg-neutral-800 text-white" 
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Comparar Métricas por Año
          </button>
        </div>

        {/* ============================================================================== */}
        {/* TAB 1: HISTORIAL DE ESTUDIOS */}
        {/* ============================================================================== */}
        {activeTab === "history" && (
          <section className="space-y-4">
            {studies.length === 0 ? (
              <div className="p-12 rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center space-y-3">
                <FileText className="w-10 h-10 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-medium text-neutral-300">Aún no hay estudios registrados</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Sube tu primer análisis de sangre o estudio médico en PDF para que Gemini extraiga los valores automáticamente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studies.map((study) => {
                  const abnormalCount = study.clinicalValues.filter(v => v.isAbnormal).length;
                  const fileUrl = LifeTrackerApiClient.getStudyFileUrl(study.id);

                  return (
                    <div 
                      key={study.id} 
                      className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 hover:border-neutral-700/80 transition space-y-4 flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <h4 className="font-semibold text-sm text-white">{study.studyType}</h4>
                            <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 mt-1">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5 text-neutral-500" />
                                {study.studyDate}
                              </span>
                              {study.institution && (
                                <span className="flex items-center gap-1">
                                  <Building2 className="w-3.5 h-3.5 text-neutral-500" />
                                  {study.institution}
                                </span>
                              )}
                            </div>
                          </div>

                          {abnormalCount > 0 ? (
                            <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-medium flex items-center gap-1 flex-shrink-0">
                              <AlertTriangle className="w-3 h-3" />
                              {abnormalCount} fuera de rango
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-medium flex items-center gap-1 flex-shrink-0">
                              <CheckCircle2 className="w-3 h-3" />
                              Valores normales
                            </span>
                          )}
                        </div>

                        {/* Values Pill preview */}
                        <div className="flex flex-wrap gap-1.5">
                          {study.clinicalValues.slice(0, 6).map((v) => (
                            <span 
                              key={v.id} 
                              className={`px-2 py-0.5 rounded-md text-[11px] ${
                                v.isAbnormal 
                                  ? "bg-rose-950/40 border border-rose-800/50 text-rose-300" 
                                  : "bg-neutral-800 text-neutral-300"
                              }`}
                            >
                              {v.metricName}: <strong className={v.isAbnormal ? "text-rose-400" : "text-neutral-200"}>{v.value}</strong> {v.unit}
                            </span>
                          ))}
                          {study.clinicalValues.length > 6 && (
                            <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] text-neutral-400 font-medium">
                              +{study.clinicalValues.length - 6} más
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between border-t border-neutral-800/80 pt-3 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedStudyForDetail(study);
                            setDetailSearch("");
                            setDetailFilter("all");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-rose-400 hover:text-rose-300 transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver Desglose Completo ({study.clinicalValues.length})</span>
                        </button>

                        <div className="flex items-center gap-2">
                          {study.fileUrl && (
                            <a
                              href={fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              title="Abrir archivo PDF original"
                              className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-xs inline-flex items-center gap-1.5 transition"
                            >
                              <FileText className="w-3.5 h-3.5 text-rose-400" />
                              <span>Abrir PDF</span>
                              <ExternalLink className="w-3 h-3 text-neutral-500" />
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteStudy(study.id)}
                            disabled={deletingStudyId === study.id}
                            title="Eliminar estudio"
                            className="p-1.5 rounded-lg text-neutral-500 hover:text-rose-400 hover:bg-rose-500/10 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        )}

        {/* ============================================================================== */}
        {/* TAB 2: COMPARATIVA DE MÉTRICAS */}
        {/* ============================================================================== */}
        {activeTab === "compare" && (
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <label className="text-xs text-neutral-400">Seleccionar Métrica a comparar:</label>
              <select 
                value={selectedMetric} 
                onChange={(e) => {
                  setSelectedMetric(e.target.value);
                  loadMetricComparison(e.target.value);
                }}
                className="px-3 py-2 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                {availableMetrics.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
                {availableMetrics.length === 0 && (
                  <option value="">(Sin métricas registradas aún)</option>
                )}
              </select>
            </div>

            {comparison && comparison.history.length > 0 ? (
              <div className="p-6 rounded-2xl bg-neutral-900/60 border border-neutral-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-sm text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-rose-400" />
                    Evolución de {comparison.metricName} a lo largo del tiempo
                  </h3>
                  {comparison.unit && (
                    <span className="text-xs px-2.5 py-1 rounded-full bg-neutral-800 text-neutral-300">
                      Unidad: {comparison.unit}
                    </span>
                  )}
                </div>

                <div className="divide-y divide-neutral-800 border border-neutral-800 rounded-xl overflow-hidden">
                  {comparison.history.map((dp, idx) => (
                    <div key={idx} className="p-3.5 bg-neutral-950/40 flex items-center justify-between text-xs">
                      <div className="space-y-0.5">
                        <span className="font-medium text-neutral-200">{dp.studyDate} ({dp.year})</span>
                        <p className="text-[11px] text-neutral-500">{dp.studyType} - {dp.institution || "Sin institución"}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-bold text-rose-400">{dp.value}</span>
                        {dp.unit && <span className="ml-1 text-neutral-500">{dp.unit}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-10 rounded-2xl bg-neutral-900/40 border border-neutral-800 text-center text-neutral-500 text-xs">
                Selecciona una métrica o carga más estudios para ver la evolución comparada entre diferentes años.
              </div>
            )}
          </section>
        )}
      </main>

      {/* ============================================================================== */}
      {/* MODAL DE DESGLOSE COMPLETO DE ESTUDIO GUARDADO */}
      {/* ============================================================================== */}
      {selectedStudyForDetail && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-5 border-b border-neutral-800 flex items-start justify-between gap-4 bg-neutral-900/90">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-rose-500/10 text-rose-500 flex items-center justify-center">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-semibold text-base text-white">{selectedStudyForDetail.studyType}</h3>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-400 pl-10">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    {selectedStudyForDetail.studyDate}
                  </span>
                  {selectedStudyForDetail.institution && (
                    <span className="flex items-center gap-1">
                      <Building2 className="w-3.5 h-3.5" />
                      {selectedStudyForDetail.institution}
                    </span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {selectedStudyForDetail.fileUrl && (
                  <a
                    href={LifeTrackerApiClient.getStudyFileUrl(selectedStudyForDetail.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-medium shadow-md shadow-rose-600/20 transition"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Abrir PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedStudyForDetail(null)}
                  className="p-1.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Stats & Filters Bar */}
            <div className="p-4 bg-neutral-950/60 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Filtros por pestaña */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setDetailFilter("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    detailFilter === "all"
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Todas ({selectedStudyForDetail.clinicalValues.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter("abnormal")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition flex items-center gap-1.5 ${
                    detailFilter === "abnormal"
                      ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>Fuera de rango ({selectedStudyForDetail.clinicalValues.filter(v => v.isAbnormal).length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDetailFilter("normal")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                    detailFilter === "normal"
                      ? "bg-neutral-800 text-white"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  Normales ({selectedStudyForDetail.clinicalValues.filter(v => !v.isAbnormal).length})
                </button>
              </div>

              {/* Buscador dentro del modal */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="text"
                  value={detailSearch}
                  onChange={(e) => setDetailSearch(e.target.value)}
                  placeholder="Buscar analito (ej: glucemia, plaquetas)..."
                  className="pl-9 pr-3 py-1.5 rounded-xl bg-neutral-900 border border-neutral-800 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500 w-full sm:w-64"
                />
              </div>
            </div>

            {/* Modal Content: Table of All Metrics */}
            <div className="flex-1 overflow-y-auto p-4">
              {filteredDetailValues.length === 0 ? (
                <div className="p-12 text-center text-neutral-500 text-xs">
                  No se encontraron métricas con el filtro aplicado.
                </div>
              ) : (
                <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800/60">
                  <div className="grid grid-cols-12 bg-neutral-900/90 text-neutral-400 font-medium text-xs p-3">
                    <div className="col-span-5 sm:col-span-6">Determinación / Analito</div>
                    <div className="col-span-3 sm:col-span-3 text-right">Resultado</div>
                    <div className="col-span-4 sm:col-span-3 text-center">Estado</div>
                  </div>
                  {filteredDetailValues.map((val) => (
                    <div 
                      key={val.id} 
                      className={`grid grid-cols-12 items-center p-3 text-xs transition-colors ${
                        val.isAbnormal ? "bg-rose-950/20 hover:bg-rose-950/30" : "bg-neutral-950/30 hover:bg-neutral-900/40"
                      }`}
                    >
                      <div className="col-span-5 sm:col-span-6 space-y-0.5 pr-2">
                        <span className={`font-medium ${val.isAbnormal ? "text-rose-200" : "text-neutral-200"}`}>
                          {val.metricName}
                        </span>
                        {val.category && (
                          <p className="text-[11px] text-neutral-500">{val.category}</p>
                        )}
                      </div>

                      <div className="col-span-3 sm:col-span-3 text-right pr-3">
                        <span className={`font-bold ${val.isAbnormal ? "text-rose-400" : "text-white"}`}>
                          {val.value}
                        </span>
                        {val.unit && <span className="text-neutral-500 ml-1 text-[11px]">{val.unit}</span>}
                      </div>

                      <div className="col-span-4 sm:col-span-3 text-center">
                        {val.isAbnormal ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-medium border border-rose-500/20">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Fuera de rango</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-neutral-800/80 text-neutral-400 text-[11px] font-medium">
                            <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                            <span>Normal</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-neutral-800 bg-neutral-950/80 flex items-center justify-between text-xs">
              <button
                type="button"
                onClick={() => handleDeleteStudy(selectedStudyForDetail.id)}
                className="text-neutral-500 hover:text-rose-400 inline-flex items-center gap-1.5 transition"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Eliminar este estudio</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedStudyForDetail(null)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 font-medium transition"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
