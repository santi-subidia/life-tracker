"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Plus, 
  GraduationCap, 
  Filter, 
  BookOpen, 
  X, 
  Award, 
  Calendar,
  Sparkles,
  ChevronRight
} from "lucide-react";
import { 
  LifeTrackerApiClient, 
  type AcademicSubject, 
  type AcademicSubjectDetail,
  type AcademicMilestone, 
  type AcademicMetrics,
  type CreateAcademicSubjectPayload,
  type UpdateAcademicSubjectPayload,
  type CreateAcademicMilestonePayload,
  type UpdateAcademicMilestonePayload,
  type AssignGradePayload
} from "@/lib/api-client";
import { CareerSummaryCard } from "@/components/academics/CareerSummaryCard";
import { SubjectCard } from "@/components/academics/SubjectCard";
import { MilestonesList } from "@/components/academics/MilestonesList";
import { MilestoneGradeModal } from "@/components/academics/MilestoneGradeModal";
import { CreateSubjectModal } from "@/components/academics/CreateSubjectModal";
import { CreateMilestoneModal } from "@/components/academics/CreateMilestoneModal";

// Fallback demo data for static prerendering / offline preview
const DEMO_SUBJECTS: AcademicSubject[] = [
  {
    id: "subj-1",
    name: "Algoritmos y Estructuras de Datos",
    code: "COMP-201",
    term: "2026-1C",
    professor: "Dra. Ada Lovelace",
    status: "en_curso",
    color: "indigo",
    average: 8.5,
    totalMilestones: 3,
    completedMilestones: 2,
  },
  {
    id: "subj-2",
    name: "Sistemas Distribuidos & Cloud",
    code: "COMP-304",
    term: "2026-1C",
    professor: "Dr. Leslie Lamport",
    status: "en_curso",
    color: "sky",
    average: 9.0,
    totalMilestones: 2,
    completedMilestones: 1,
  },
  {
    id: "subj-3",
    name: "Bases de Datos & Arquitectura",
    code: "BD-102",
    term: "2025-2C",
    professor: "Dr. Edgar Codd",
    status: "aprobada",
    color: "emerald",
    average: 8.75,
    totalMilestones: 3,
    completedMilestones: 3,
  },
  {
    id: "subj-4",
    name: "Probabilidad & Estadística",
    code: "MAT-105",
    term: "2025-2C",
    professor: "Dr. Thomas Bayes",
    status: "regularizada",
    color: "amber",
    average: 7.25,
    totalMilestones: 2,
    completedMilestones: 2,
  },
];

const DEMO_MILESTONES: AcademicMilestone[] = [
  {
    id: "m-1",
    subjectId: "subj-1",
    title: "Primer Parcial: Grafos y Árboles",
    milestoneType: "parcial",
    dueDate: new Date(Date.now() - 86400000 * 14).toISOString().split("T")[0],
    grade: 8.5,
    weightPercentage: 35,
    status: "calificado",
    notes: "Excelente desarrollo de algoritmos Dijkstra y Floyd.",
  },
  {
    id: "m-2",
    subjectId: "subj-1",
    title: "Entrega Trabajo Práctico Integrador",
    milestoneType: "entrega",
    dueDate: new Date(Date.now() - 86400000 * 2).toISOString().split("T")[0],
    grade: 8.5,
    weightPercentage: 25,
    status: "calificado",
  },
  {
    id: "m-3",
    subjectId: "subj-1",
    title: "Segundo Parcial: Programación Dinámica",
    milestoneType: "parcial",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0],
    weightPercentage: 40,
    status: "pendiente",
    notes: "Mochila 0/1, LCS y optimizaciones matriciales.",
  },
  {
    id: "m-4",
    subjectId: "subj-2",
    title: "Parcial Teórico: Consenso Raft & Paxos",
    milestoneType: "parcial",
    dueDate: new Date(Date.now() - 86400000 * 7).toISOString().split("T")[0],
    grade: 9.0,
    weightPercentage: 50,
    status: "calificado",
  },
  {
    id: "m-5",
    subjectId: "subj-2",
    title: "Entrega Final: Cluster Distribuido en Go",
    milestoneType: "entrega",
    dueDate: new Date(Date.now() + 86400000 * 12).toISOString().split("T")[0],
    weightPercentage: 50,
    status: "pendiente",
  },
];

const DEMO_METRICS: AcademicMetrics = {
  careerAverage: 8.38,
  approvedSubjectsCount: 8,
  inProgressSubjectsCount: 2,
  upcomingExamsCount: 2,
};

export default function AcademicsPage() {
  const [subjects, setSubjects] = useState<AcademicSubject[]>([]);
  const [milestones, setMilestones] = useState<AcademicMilestone[]>([]);
  const [metrics, setMetrics] = useState<AcademicMetrics | null>(null);
  const [selectedTerm, setSelectedTerm] = useState<string>("");
  const [loading, setLoading] = useState(true);

  // Detail Slide-over / Modal
  const [selectedSubject, setSelectedSubject] = useState<AcademicSubject | AcademicSubjectDetail | null>(null);

  // Modals
  const [isSubjectModalOpen, setIsSubjectModalOpen] = useState(false);
  const [subjectToEdit, setSubjectToEdit] = useState<AcademicSubject | null>(null);

  const [isMilestoneModalOpen, setIsMilestoneModalOpen] = useState(false);
  const [milestoneToEdit, setMilestoneToEdit] = useState<AcademicMilestone | null>(null);

  const [isGradeModalOpen, setIsGradeModalOpen] = useState(false);
  const [milestoneToGrade, setMilestoneToGrade] = useState<AcademicMilestone | null>(null);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const [fetchedSubjects, fetchedMetrics] = await Promise.all([
        LifeTrackerApiClient.getSubjects(selectedTerm || undefined).catch(() => DEMO_SUBJECTS),
        LifeTrackerApiClient.getAcademicMetrics().catch(() => DEMO_METRICS),
      ]);

      setSubjects(fetchedSubjects.length > 0 ? fetchedSubjects : DEMO_SUBJECTS);
      setMetrics(fetchedMetrics || DEMO_METRICS);

      // If a subject is selected, fetch its detail with milestones
      if (selectedSubject) {
        const detail = await LifeTrackerApiClient.getSubjectDetail(selectedSubject.id).catch(() => null);
        if (detail) {
          setSelectedSubject(detail);
          setMilestones(detail.milestones);
        } else {
          setMilestones(DEMO_MILESTONES.filter((m) => m.subjectId === selectedSubject.id));
        }
      } else {
        setMilestones(DEMO_MILESTONES);
      }
    } catch {
      setSubjects(DEMO_SUBJECTS);
      setMilestones(DEMO_MILESTONES);
      setMetrics(DEMO_METRICS);
    } finally {
      setLoading(false);
    }
  }, [selectedTerm, selectedSubject?.id]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Select a subject to view its detail and milestones
  const handleSelectSubject = async (subject: AcademicSubject) => {
    setSelectedSubject(subject);
    try {
      const detail = await LifeTrackerApiClient.getSubjectDetail(subject.id);
      setSelectedSubject(detail);
      setMilestones(detail.milestones);
    } catch {
      // Local fallback
      const subjectMilestones = DEMO_MILESTONES.filter((m) => m.subjectId === subject.id);
      setMilestones(subjectMilestones);
    }
  };

  // Close detail panel
  const handleCloseDetail = () => {
    setSelectedSubject(null);
  };

  // Subject CRUD Handlers
  const handleSubjectSubmit = async (
    payload: CreateAcademicSubjectPayload | UpdateAcademicSubjectPayload,
    subjectId?: string
  ) => {
    if (subjectId) {
      // Update
      try {
        const updated = await LifeTrackerApiClient.updateSubject(subjectId, payload as UpdateAcademicSubjectPayload);
        setSubjects((prev) => prev.map((s) => (s.id === subjectId ? updated : s)));
        if (selectedSubject?.id === subjectId) {
          setSelectedSubject((prev) => (prev ? { ...prev, ...updated } : null));
        }
      } catch {
        setSubjects((prev) =>
          prev.map((s) => (s.id === subjectId ? { ...s, ...payload } : s))
        );
      }
    } else {
      // Create
      try {
        const created = await LifeTrackerApiClient.createSubject(payload as CreateAcademicSubjectPayload);
        setSubjects((prev) => [...prev, created]);
      } catch {
        const newDemoSubject: AcademicSubject = {
          id: `subj-${Date.now()}`,
          name: payload.name,
          code: payload.code,
          term: payload.term,
          professor: payload.professor,
          status: payload.status || "en_curso",
          color: payload.color || "indigo",
          totalMilestones: 0,
          completedMilestones: 0,
        };
        setSubjects((prev) => [...prev, newDemoSubject]);
      }
    }
  };

  const handleDeleteSubject = async (subject: AcademicSubject) => {
    if (window.confirm(`¿Estás seguro de eliminar la materia "${subject.name}"?`)) {
      setSubjects((prev) => prev.filter((s) => s.id !== subject.id));
      if (selectedSubject?.id === subject.id) setSelectedSubject(null);
      try {
        await LifeTrackerApiClient.deleteSubject(subject.id);
      } catch {
        loadData();
      }
    }
  };

  // Milestone CRUD Handlers
  const handleMilestoneSubmit = async (
    payload: CreateAcademicMilestonePayload | UpdateAcademicMilestonePayload,
    milestoneId?: string
  ) => {
    if (milestoneId) {
      // Update
      try {
        const updated = await LifeTrackerApiClient.updateMilestone(
          milestoneId,
          payload as UpdateAcademicMilestonePayload
        );
        setMilestones((prev) => prev.map((m) => (m.id === milestoneId ? updated : m)));
      } catch {
        setMilestones((prev) =>
          prev.map((m) =>
            m.id === milestoneId
              ? {
                  ...m,
                  title: payload.title,
                  milestoneType: payload.milestoneType,
                  dueDate: payload.dueDate,
                  weightPercentage: payload.weightPercentage,
                  notes: payload.notes,
                }
              : m
          )
        );
      }
    } else {
      // Create
      try {
        const created = await LifeTrackerApiClient.createMilestone(
          payload as CreateAcademicMilestonePayload
        );
        setMilestones((prev) => [...prev, created]);
      } catch {
        const newDemoM: AcademicMilestone = {
          id: `m-${Date.now()}`,
          subjectId: (payload as CreateAcademicMilestonePayload).subjectId,
          title: payload.title,
          milestoneType: payload.milestoneType,
          dueDate: payload.dueDate,
          weightPercentage: payload.weightPercentage,
          status: "pendiente",
          notes: payload.notes,
        };
        setMilestones((prev) => [...prev, newDemoM]);
      }
    }
    // Refresh subjects to update milestone counts
    LifeTrackerApiClient.getSubjects(selectedTerm || undefined)
      .then(setSubjects)
      .catch(() => {});
  };

  const handleDeleteMilestone = async (milestone: AcademicMilestone) => {
    if (window.confirm(`¿Eliminar la evaluación "${milestone.title}"?`)) {
      setMilestones((prev) => prev.filter((m) => m.id !== milestone.id));
      try {
        await LifeTrackerApiClient.deleteMilestone(milestone.id);
        // Refresh subject detail
        if (selectedSubject) {
          const detail = await LifeTrackerApiClient.getSubjectDetail(selectedSubject.id).catch(() => null);
          if (detail) {
            setSelectedSubject(detail);
            setMilestones(detail.milestones);
          }
        }
      } catch {
        // Ignore
      }
    }
  };

  // Grade Assignment Handler
  const handleGradeAssigned = async (milestoneId: string, payload: AssignGradePayload) => {
    try {
      const updated = await LifeTrackerApiClient.assignGrade(milestoneId, payload);
      setMilestones((prev) => prev.map((m) => (m.id === milestoneId ? updated : m)));
    } catch {
      // Local optimistic update
      setMilestones((prev) =>
        prev.map((m) =>
          m.id === milestoneId
            ? { ...m, grade: payload.grade, status: "calificado", notes: payload.notes || m.notes }
            : m
        )
      );
    }

    // Refresh subjects and metrics to show updated GPA
    LifeTrackerApiClient.getSubjects(selectedTerm || undefined).then(setSubjects).catch(() => {});
    LifeTrackerApiClient.getAcademicMetrics().then(setMetrics).catch(() => {});
    if (selectedSubject) {
      LifeTrackerApiClient.getSubjectDetail(selectedSubject.id).then((d) => {
        setSelectedSubject(d);
        setMilestones(d.milestones);
      }).catch(() => {});
    }
  };

  // Unique terms list
  const uniqueTerms = Array.from(new Set(subjects.map((s) => s.term))).filter(Boolean);

  // Filtered subjects by term
  const filteredSubjects = selectedTerm
    ? subjects.filter((s) => s.term === selectedTerm)
    : subjects;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 pb-24">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-2 -ml-2 rounded-xl text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
              title="Volver al Inicio"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center">
                <GraduationCap className="w-4 h-4" />
              </div>
              <div>
                <h1 className="font-semibold text-base flex items-center gap-2">
                  Academia & Universidad
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                    Materias & Exámenes
                  </span>
                </h1>
                <p className="text-xs text-neutral-400">
                  Seguimiento de cursadas, calendario evaluativo y notas ponderadas
                </p>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setMilestoneToEdit(null);
                setIsMilestoneModalOpen(true);
              }}
              className="px-3 py-2 rounded-xl text-xs font-medium text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 transition flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Nuevo Hito</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setSubjectToEdit(null);
                setIsSubjectModalOpen(true);
              }}
              className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-lg shadow-sky-600/20 active:scale-95 transition flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Materia</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 pt-6 space-y-6">
        {/* Career Summary Card */}
        <CareerSummaryCard metrics={metrics} loading={loading} />

        {/* Filter Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-neutral-900/60 border border-neutral-800/80 rounded-2xl">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-neutral-800 text-neutral-400">
              <Filter className="w-4 h-4" />
            </div>
            <span className="text-xs font-medium text-neutral-400">Filtrar por período:</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-neutral-950 border border-neutral-800 text-neutral-200 text-xs font-medium focus:outline-none focus:border-sky-500 transition cursor-pointer"
            >
              <option value="">Todos los períodos ({subjects.length} materias)</option>
              {uniqueTerms.map((t) => (
                <option key={t} value={t}>
                  {t} ({subjects.filter((s) => s.term === t).length})
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs text-neutral-400 self-end sm:self-auto">
            <BookOpen className="w-4 h-4 text-sky-400" />
            <span>
              Mostrando <strong className="text-white">{filteredSubjects.length}</strong> materias
            </span>
          </div>
        </div>

        {/* Subjects Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider">
              Materias ({filteredSubjects.length})
            </h2>
            <button
              type="button"
              onClick={() => {
                setSubjectToEdit(null);
                setIsSubjectModalOpen(true);
              }}
              className="text-xs text-sky-400 hover:text-sky-300 transition"
            >
              + Añadir Materia
            </button>
          </div>

          {filteredSubjects.length === 0 ? (
            <div className="p-12 rounded-2xl bg-neutral-900/40 border border-dashed border-neutral-800 text-center space-y-2">
              <BookOpen className="w-8 h-8 text-neutral-600 mx-auto" />
              <p className="text-sm font-semibold text-neutral-300">No hay materias registradas</p>
              <p className="text-xs text-neutral-500">
                Registra tus materias para hacer el seguimiento de notas y evaluaciones.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSubjects.map((subject) => (
                <SubjectCard
                  key={subject.id}
                  subject={subject}
                  onSelect={handleSelectSubject}
                  onEdit={(s) => {
                    setSubjectToEdit(s);
                    setIsSubjectModalOpen(true);
                  }}
                  onDelete={handleDeleteSubject}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Slide-over Drawer for Subject Detail & Milestones */}
      {selectedSubject && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div
            className="w-full max-w-xl bg-neutral-900 border-l border-neutral-800 h-full overflow-y-auto p-6 shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="space-y-6">
              {/* Drawer Header */}
              <div className="flex items-start justify-between gap-3 border-b border-neutral-800 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    {selectedSubject.code && (
                      <span className="px-2 py-0.5 rounded-md text-[11px] font-mono font-bold bg-neutral-800 text-neutral-300 border border-neutral-700/60">
                        {selectedSubject.code}
                      </span>
                    )}
                    <span className="text-xs text-neutral-400 font-medium">
                      {selectedSubject.term}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-white">
                    {selectedSubject.name}
                  </h3>
                  {selectedSubject.professor && (
                    <p className="text-xs text-neutral-400 mt-0.5">
                      Profesor: {selectedSubject.professor}
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  aria-label="Cerrar detalle"
                  className="p-1.5 rounded-lg text-neutral-400 hover:text-white hover:bg-neutral-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Subject Stats Pill Box */}
              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-neutral-950/80 border border-neutral-800">
                <div>
                  <span className="text-xs text-neutral-400">Promedio de Materia</span>
                  <div className="text-2xl font-bold text-amber-400 font-mono mt-0.5">
                    {selectedSubject.average !== undefined && selectedSubject.average !== null
                      ? Number(selectedSubject.average).toFixed(2)
                      : "Sin notas"}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-neutral-400">Estado de Cursada</span>
                  <div className="text-sm font-semibold text-white capitalize mt-1.5">
                    {selectedSubject.status.replace("_", " ")}
                  </div>
                </div>
              </div>

              {/* Milestones Section */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-neutral-300 uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-4 h-4 text-purple-400" />
                    Hitos Evaluativos & Exámenes ({milestones.length})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setMilestoneToEdit(null);
                      setIsMilestoneModalOpen(true);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 transition"
                  >
                    + Agregar Hito
                  </button>
                </div>

                <MilestonesList
                  milestones={milestones}
                  onOpenGradeModal={(m) => {
                    setMilestoneToGrade(m);
                    setIsGradeModalOpen(true);
                  }}
                  onEditMilestone={(m) => {
                    setMilestoneToEdit(m);
                    setIsMilestoneModalOpen(true);
                  }}
                  onDeleteMilestone={handleDeleteMilestone}
                  onAddMilestone={() => {
                    setMilestoneToEdit(null);
                    setIsMilestoneModalOpen(true);
                  }}
                />
              </div>
            </div>

            {/* Drawer Footer */}
            <div className="pt-6 border-t border-neutral-800 flex justify-end">
              <button
                type="button"
                onClick={handleCloseDetail}
                className="px-5 py-2 rounded-xl text-xs font-semibold bg-neutral-800 hover:bg-neutral-700 text-white transition"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <CreateSubjectModal
        isOpen={isSubjectModalOpen}
        onClose={() => setIsSubjectModalOpen(false)}
        onSubmit={handleSubjectSubmit}
        subjectToEdit={subjectToEdit}
        defaultTerm={selectedTerm || "2026-1C"}
      />

      <CreateMilestoneModal
        isOpen={isMilestoneModalOpen}
        onClose={() => setIsMilestoneModalOpen(false)}
        onSubmit={handleMilestoneSubmit}
        subjects={subjects}
        defaultSubjectId={selectedSubject?.id}
        existingMilestonesForSubject={milestones}
        milestoneToEdit={milestoneToEdit}
      />

      <MilestoneGradeModal
        isOpen={isGradeModalOpen}
        onClose={() => setIsGradeModalOpen(false)}
        milestone={milestoneToGrade}
        onGradeAssigned={handleGradeAssigned}
      />
    </div>
  );
}
