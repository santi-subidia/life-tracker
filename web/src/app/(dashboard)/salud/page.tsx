"use client";

import { useState, useEffect } from "react";
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
  AlertCircle
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type ExtractedStudyResult, 
  type HealthStudy, 
  type MetricComparison 
} from "@/lib/api-client";

export default function HealthPage() {
  const [studies, setStudies] = useState<HealthStudy[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewData, setPreviewData] = useState<ExtractedStudyResult | null>(null);
  const [selectedMetric, setSelectedMetric] = useState<string>("");
  const [availableMetrics, setAvailableMetrics] = useState<string[]>([]);
  const [comparison, setComparison] = useState<MetricComparison | null>(null);
  const [activeTab, setActiveTab] = useState<"history" | "compare">("history");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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
      const result = await LifeTrackerApiClient.extractStudy(file);
      setPreviewData(result);
    } catch (err: any) {
      setErrorMessage(err.message || "Error al procesar el estudio con IA.");
    } finally {
      setUploading(false);
    }
  }

  async function handleConfirmSave() {
    if (!previewData) return;

    try {
      setLoading(true);
      await LifeTrackerApiClient.saveStudy({
        studyType: previewData.studyType,
        studyDate: previewData.studyDate,
        fileUrl: previewData.fileUrl,
        institution: previewData.institution,
        clinicalValues: previewData.clinicalValues,
      });

      setPreviewData(null);
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

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-20">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-semibold text-base">Salud & Estudios Médicos</h1>
              <p className="text-xs text-neutral-400">Seguimiento clínico y comparador multianual</p>
            </div>
          </div>

          <label className="cursor-pointer inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs shadow-lg shadow-rose-600/20 transition">
            <Upload className="w-4 h-4" />
            <span>Subir Estudio</span>
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
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Upload Loading Spinner */}
        {uploading && (
          <div className="p-8 rounded-2xl bg-neutral-900/60 border border-neutral-800 text-center space-y-3">
            <div className="w-10 h-10 border-2 border-rose-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-neutral-100 flex items-center justify-center gap-2">
                <Sparkles className="w-4 h-4 text-rose-400" />
                Analizando con Google Gemini 2.5 Flash...
              </h3>
              <p className="text-xs text-neutral-400">Extrayendo tipo de estudio, fecha y valores clínicos medidos.</p>
            </div>
          </div>
        )}

        {/* Preview Modal / Card when Gemini extracted data */}
        {previewData && (
          <section className="p-6 rounded-2xl bg-neutral-900 border border-rose-500/30 space-y-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-neutral-800 pb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse" />
                <h2 className="text-base font-semibold text-white">Revisar Estudio Extraído</h2>
              </div>
              <span className="text-xs text-neutral-400">Verifica los datos antes de guardar</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-xs text-neutral-400">Tipo de Estudio</label>
                <input 
                  type="text" 
                  value={previewData.studyType} 
                  onChange={(e) => setPreviewData({ ...previewData, studyType: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Fecha de Realización</label>
                <input 
                  type="date" 
                  value={previewData.studyDate} 
                  onChange={(e) => setPreviewData({ ...previewData, studyDate: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
              <div>
                <label className="text-xs text-neutral-400">Institución / Laboratorio</label>
                <input 
                  type="text" 
                  value={previewData.institution || ""} 
                  onChange={(e) => setPreviewData({ ...previewData, institution: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Extracted Clinical Values Table */}
            <div>
              <h3 className="text-xs font-semibold text-neutral-300 mb-2">Valores Clínicos Extraídos ({previewData.clinicalValues.length})</h3>
              <div className="border border-neutral-800 rounded-xl overflow-hidden divide-y divide-neutral-800/60">
                {previewData.clinicalValues.map((val, idx) => (
                  <div key={idx} className="p-3 bg-neutral-950/50 flex items-center justify-between gap-4 text-xs">
                    <span className="font-medium text-neutral-200">{val.metricName}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-rose-400">{val.value}</span>
                      {val.unit && <span className="text-neutral-500">{val.unit}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button 
                onClick={() => setPreviewData(null)}
                className="px-4 py-2 rounded-xl border border-neutral-800 hover:bg-neutral-800 text-neutral-400 hover:text-white text-xs transition"
              >
                Cancelar
              </button>
              <button 
                onClick={handleConfirmSave}
                disabled={loading}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-medium text-xs flex items-center gap-2 transition"
              >
                <Check className="w-4 h-4" />
                <span>Confirmar y Guardar Estudio</span>
              </button>
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
            Historial de Estudios
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

        {/* Tab 1: Historial de Estudios */}
        {activeTab === "history" && (
          <section className="space-y-4">
            {studies.length === 0 ? (
              <div className="p-12 rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center space-y-3">
                <FileText className="w-10 h-10 text-neutral-600 mx-auto" />
                <h3 className="text-sm font-medium text-neutral-300">Aún no hay estudios registrados</h3>
                <p className="text-xs text-neutral-500 max-w-sm mx-auto">
                  Sube tu primer análisis de sangre o estudio médico en PDF o foto para que Gemini extraiga los valores automáticamente.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {studies.map((study) => (
                  <div key={study.id} className="p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800/80 space-y-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="font-semibold text-sm text-white">{study.studyType}</h4>
                        <div className="flex items-center gap-3 text-xs text-neutral-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {study.studyDate}
                          </span>
                          {study.institution && (
                            <span className="flex items-center gap-1">
                              <Building2 className="w-3.5 h-3.5" />
                              {study.institution}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Values Pill preview */}
                    <div className="flex flex-wrap gap-1.5">
                      {study.clinicalValues.slice(0, 6).map((v) => (
                        <span key={v.id} className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] text-neutral-300">
                          {v.metricName}: <strong className="text-rose-400">{v.value}</strong> {v.unit}
                        </span>
                      ))}
                      {study.clinicalValues.length > 6 && (
                        <span className="px-2 py-0.5 rounded-md bg-neutral-800 text-[11px] text-neutral-400">
                          +{study.clinicalValues.length - 6} más
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* Tab 2: Comparativa de Métricas */}
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
    </div>
  );
}
