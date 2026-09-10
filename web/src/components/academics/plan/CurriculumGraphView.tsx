"use client";

import React, { useState, useMemo, useRef } from "react";
import { 
  Lock, 
  Unlock, 
  CheckCircle2, 
  Clock, 
  BookOpen, 
  HelpCircle, 
  Sparkles, 
  ArrowRight,
  Info,
  Layers,
  ChevronRight,
  X
} from "lucide-react";
import { 
  type CurriculumSubjectItem, 
  type CurriculumPrerequisiteItem 
} from "@/lib/api-client";

interface CurriculumGraphViewProps {
  subjects: CurriculumSubjectItem[];
}

const CARD_WIDTH = 190;
const CARD_HEIGHT = 76;
const GAP_X = 52;
const GAP_Y = 16;
const PADDING = 32;

export function CurriculumGraphView({ subjects }: CurriculumGraphViewProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Group subjects by column: (Year - 1) * 2 + (Period - 1)
  const columns = useMemo(() => {
    const maxYear = Math.max(...subjects.map((s) => s.yearLevel), 1);
    const totalCols = maxYear * 2;
    const cols: { colIndex: number; year: number; period: number; subjects: CurriculumSubjectItem[] }[] = [];

    for (let c = 0; c < totalCols; c++) {
      const year = Math.floor(c / 2) + 1;
      const period = (c % 2) + 1;
      const colSubjects = subjects
        .filter((s) => s.yearLevel === year && s.periodNumber === period)
        .sort((a, b) => a.orderIndex - b.orderIndex || a.name.localeCompare(b.name));
      cols.push({ colIndex: c, year, period, subjects: colSubjects });
    }

    // Filter out trailing empty columns if any
    while (cols.length > 2 && cols[cols.length - 1].subjects.length === 0) {
      cols.pop();
    }

    return cols;
  }, [subjects]);

  // Map each subject to its grid position: colIndex, rowIndex
  const subjectPositions = useMemo(() => {
    const posMap = new Map<string, { col: number; row: number; x: number; y: number }>();
    columns.forEach((col) => {
      col.subjects.forEach((subj, rIndex) => {
        const x = PADDING + col.colIndex * (CARD_WIDTH + GAP_X);
        const y = PADDING + 40 + rIndex * (CARD_HEIGHT + GAP_Y);
        posMap.set(subj.id, { col: col.colIndex, row: rIndex, x, y });
      });
    });
    return posMap;
  }, [columns]);

  // Compute bounding box for SVG canvas
  const maxRows = Math.max(...columns.map((c) => c.subjects.length), 1);
  const canvasWidth = PADDING * 2 + columns.length * (CARD_WIDTH + GAP_X);
  const canvasHeight = PADDING * 2 + 50 + maxRows * (CARD_HEIGHT + GAP_Y);

  // Directed edges from requiredSubject -> subject
  const edges = useMemo(() => {
    const edgeList: {
      fromId: string;
      toId: string;
      requirementType: string;
      isSatisfied: boolean;
    }[] = [];

    subjects.forEach((subj) => {
      subj.prerequisites.forEach((p) => {
        edgeList.push({
          fromId: p.requiredSubjectId,
          toId: subj.id,
          requirementType: p.requirementType,
          isSatisfied: p.isSatisfied,
        });
      });
    });

    return edgeList;
  }, [subjects]);

  // Transitive closure helpers for selection
  const { ancestorIds, descendantIds } = useMemo(() => {
    if (!selectedSubjectId) {
      return { ancestorIds: new Set<string>(), descendantIds: new Set<string>() };
    }

    // Predecessors (Ancestors)
    const ancestors = new Set<string>();
    const queueA = [selectedSubjectId];
    while (queueA.length > 0) {
      const curr = queueA.shift()!;
      const currSubj = subjects.find((s) => s.id === curr);
      if (currSubj) {
        currSubj.prerequisites.forEach((p) => {
          if (!ancestors.has(p.requiredSubjectId)) {
            ancestors.add(p.requiredSubjectId);
            queueA.push(p.requiredSubjectId);
          }
        });
      }
    }

    // Successors (Descendants)
    const descendants = new Set<string>();
    const queueD = [selectedSubjectId];
    while (queueD.length > 0) {
      const curr = queueD.shift()!;
      const unlocked = subjects.filter((s) =>
        s.prerequisites.some((p) => p.requiredSubjectId === curr)
      );
      unlocked.forEach((u) => {
        if (!descendants.has(u.id)) {
          descendants.add(u.id);
          queueD.push(u.id);
        }
      });
    }

    return { ancestorIds: ancestors, descendantIds: descendants };
  }, [selectedSubjectId, subjects]);

  const selectedSubject = useMemo(
    () => subjects.find((s) => s.id === selectedSubjectId) || null,
    [selectedSubjectId, subjects]
  );

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "aprobada":
        return {
          badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          cardBorder: "border-emerald-500/30",
          bg: "bg-emerald-950/20",
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />,
        };
      case "regularizada":
        return {
          badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          cardBorder: "border-sky-500/30",
          bg: "bg-sky-950/20",
          icon: <Clock className="w-3.5 h-3.5 text-sky-400" />,
        };
      case "en_curso":
        return {
          badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          cardBorder: "border-amber-500/30",
          bg: "bg-amber-950/20",
          icon: <BookOpen className="w-3.5 h-3.5 text-amber-400" />,
        };
      case "habilitada":
        return {
          badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
          cardBorder: "border-indigo-500/30",
          bg: "bg-neutral-900/90",
          icon: <Unlock className="w-3.5 h-3.5 text-indigo-400" />,
        };
      case "bloqueada":
      default:
        return {
          badge: "bg-neutral-800 text-neutral-400 border-neutral-700",
          cardBorder: "border-neutral-800",
          bg: "bg-neutral-950/40",
          icon: <Lock className="w-3.5 h-3.5 text-neutral-500" />,
        };
    }
  };

  return (
    <div className="space-y-4">
      {/* Top Controls & Legend Bar */}
      <div className="p-4 rounded-2xl bg-neutral-900/80 border border-neutral-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-neutral-300 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-sky-400" />
            Interacción del Grafo:
          </span>
          <span className="text-neutral-400">
            Haz clic en una materia para iluminar en <span className="font-semibold text-amber-400">naranja</span> sus correlativas previas y en <span className="font-semibold text-emerald-400">verde</span> las que desbloquea.
          </span>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <span className="text-neutral-400">Aprobada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
            <span className="text-neutral-400">Regular</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            <span className="text-neutral-400">Habilitada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-neutral-600" />
            <span className="text-neutral-400">Bloqueada</span>
          </div>
          <div className="h-4 w-px bg-neutral-800 mx-1 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 bg-neutral-400" />
            <span className="text-neutral-400">Aprobada</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-4 h-0.5 border-t border-dashed border-neutral-400" />
            <span className="text-neutral-400">Regularizada</span>
          </div>
        </div>
      </div>

      {/* Graph Viewport */}
      <div 
        ref={containerRef}
        className="relative bg-neutral-950 border border-neutral-800 rounded-3xl overflow-x-auto overflow-y-hidden shadow-inner p-2 select-none min-h-[520px]"
      >
        <div 
          className="relative"
          style={{ width: `${canvasWidth}px`, height: `${canvasHeight}px` }}
        >
          {/* Column Headers */}
          {columns.map((col) => {
            const x = PADDING + col.colIndex * (CARD_WIDTH + GAP_X);
            return (
              <div
                key={col.colIndex}
                className="absolute top-4 text-center pointer-events-none"
                style={{ left: `${x}px`, width: `${CARD_WIDTH}px` }}
              >
                <div className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">
                  {col.year}° Año • {col.period}° Cuat.
                </div>
                <div className="text-[10px] text-neutral-600">
                  {col.subjects.length} materias
                </div>
              </div>
            );
          })}

          {/* SVG Connecting Edges */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none z-10"
            width={canvasWidth}
            height={canvasHeight}
          >
            <defs>
              <marker
                id="arrow-default"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#525252" />
              </marker>
              <marker
                id="arrow-ancestor"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#f59e0b" />
              </marker>
              <marker
                id="arrow-descendant"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 1.5 L 8 5 L 0 8.5 z" fill="#10b981" />
              </marker>
            </defs>

            {edges.map((edge, idx) => {
              const pFrom = subjectPositions.get(edge.fromId);
              const pTo = subjectPositions.get(edge.toId);
              if (!pFrom || !pTo) return null;

              const isConnectedToSelected = selectedSubjectId
                ? (edge.fromId === selectedSubjectId || edge.toId === selectedSubjectId ||
                   (ancestorIds.has(edge.fromId) && ancestorIds.has(edge.toId)) ||
                   (descendantIds.has(edge.fromId) && descendantIds.has(edge.toId)))
                : false;

              const isAncestorEdge = selectedSubjectId && (ancestorIds.has(edge.fromId) || edge.fromId === selectedSubjectId) && (edge.toId === selectedSubjectId || ancestorIds.has(edge.toId));
              const isDescendantEdge = selectedSubjectId && (edge.fromId === selectedSubjectId || descendantIds.has(edge.fromId)) && descendantIds.has(edge.toId);

              // Calculate start and end coordinates
              const x1 = pFrom.x + CARD_WIDTH;
              const y1 = pFrom.y + CARD_HEIGHT / 2;
              const x2 = pTo.x;
              const y2 = pTo.y + CARD_HEIGHT / 2;

              // Bezier control points
              const dx = Math.abs(x2 - x1);
              const cp1X = x1 + Math.max(dx * 0.4, 20);
              const cp2X = x2 - Math.max(dx * 0.4, 20);

              const pathD = `M ${x1} ${y1} C ${cp1X} ${y1}, ${cp2X} ${y2}, ${x2} ${y2}`;

              const isAprobada = edge.requirementType === "requiere_aprobada";

              let strokeColor = "#333333";
              let strokeWidth = 1.5;
              let markerEnd = "url(#arrow-default)";
              let opacity = selectedSubjectId ? 0.15 : 0.6;

              if (isAncestorEdge) {
                strokeColor = "#f59e0b"; // amber-500
                strokeWidth = 2.5;
                markerEnd = "url(#arrow-ancestor)";
                opacity = 1;
              } else if (isDescendantEdge) {
                strokeColor = "#10b981"; // emerald-500
                strokeWidth = 2.5;
                markerEnd = "url(#arrow-descendant)";
                opacity = 1;
              }

              return (
                <path
                  key={`${edge.fromId}-${edge.toId}-${idx}`}
                  d={pathD}
                  fill="none"
                  stroke={strokeColor}
                  strokeWidth={strokeWidth}
                  strokeDasharray={isAprobada ? "none" : "4 3"}
                  strokeOpacity={opacity}
                  markerEnd={markerEnd}
                  className="transition-all duration-300"
                />
              );
            })}
          </svg>

          {/* Subject Cards */}
          {subjects.map((subj) => {
            const pos = subjectPositions.get(subj.id);
            if (!pos) return null;

            const isSelected = selectedSubjectId === subj.id;
            const isAncestor = ancestorIds.has(subj.id);
            const isDescendant = descendantIds.has(subj.id);
            const isFaded = selectedSubjectId && !isSelected && !isAncestor && !isDescendant;

            const style = getStatusColor(subj.status);

            let cardBorder = style.cardBorder;
            let cardBg = style.bg;
            let ringClass = "";

            if (isSelected) {
              ringClass = "ring-2 ring-sky-400 shadow-xl shadow-sky-500/20 scale-[1.03] z-30";
              cardBorder = "border-sky-400";
            } else if (isAncestor) {
              ringClass = "ring-2 ring-amber-400/80 shadow-lg shadow-amber-500/10 scale-[1.02] z-20";
              cardBorder = "border-amber-400";
              cardBg = "bg-amber-950/40";
            } else if (isDescendant) {
              ringClass = "ring-2 ring-emerald-400/80 shadow-lg shadow-emerald-500/10 scale-[1.02] z-20";
              cardBorder = "border-emerald-400";
              cardBg = "bg-emerald-950/40";
            }

            return (
              <div
                key={subj.id}
                onClick={() => setSelectedSubjectId(isSelected ? null : subj.id)}
                style={{
                  left: `${pos.x}px`,
                  top: `${pos.y}px`,
                  width: `${CARD_WIDTH}px`,
                  height: `${CARD_HEIGHT}px`,
                }}
                className={`absolute rounded-2xl border p-2.5 flex flex-col justify-between cursor-pointer transition-all duration-200 ${cardBg} ${cardBorder} ${ringClass} ${
                  isFaded ? "opacity-30 hover:opacity-75" : "opacity-100"
                }`}
              >
                {/* Header: Code & Status Badge */}
                <div className="flex items-center justify-between gap-1">
                  <span className="text-[10px] font-mono font-bold text-neutral-400 truncate max-w-[90px]">
                    {subj.code || `${subj.yearLevel}°A-${subj.periodNumber}C`}
                  </span>
                  <div className="flex items-center gap-1">
                    {isSelected && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-sky-500 text-black">
                        ACTIVA
                      </span>
                    )}
                    {isAncestor && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        PREVIA
                      </span>
                    )}
                    {isDescendant && (
                      <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        DESTINO
                      </span>
                    )}
                    {!isSelected && !isAncestor && !isDescendant && style.icon}
                  </div>
                </div>

                {/* Title */}
                <p 
                  className="text-xs font-semibold text-white truncate-2-lines leading-snug"
                  title={subj.name}
                >
                  {subj.name}
                </p>

                {/* Footer: Prereqs Count */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-800/40">
                  <span>{subj.credits ? `${subj.credits} cr.` : "Troncal"}</span>
                  <span>{subj.prerequisites.length} correlat.</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Subject Detail Drawer / Card */}
      {selectedSubject && (
        <div className="p-4 sm:p-5 rounded-2xl bg-neutral-900 border border-neutral-800 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-800 text-neutral-300">
                  {selectedSubject.code || "SIN CÓDIGO"}
                </span>
                <h3 className="text-base font-bold text-white">
                  {selectedSubject.name}
                </h3>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(selectedSubject.status).badge}`}>
                  {selectedSubject.status.toUpperCase()}
                </span>
              </div>
              <p className="text-xs text-neutral-400 mt-0.5">
                {selectedSubject.yearLevel}° Año • {selectedSubject.periodNumber}° Cuatrimestre • {selectedSubject.credits ?? 0} Créditos
              </p>
            </div>

            <button
              onClick={() => setSelectedSubjectId(null)}
              className="p-1.5 text-neutral-400 hover:text-white rounded-lg hover:bg-neutral-800 transition"
              title="Cerrar detalle"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-neutral-800">
            {/* Ancestors (Required Prerequisites) */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span>Materias Correlativas Previas ({selectedSubject.prerequisites.length})</span>
              </div>
              {selectedSubject.prerequisites.length === 0 ? (
                <p className="text-xs text-neutral-500 italic">No requiere ninguna materia previa.</p>
              ) : (
                <div className="space-y-1">
                  {selectedSubject.prerequisites.map((p) => (
                    <div
                      key={p.prerequisiteId}
                      className="p-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs flex items-center justify-between gap-2"
                    >
                      <span className="text-neutral-200 font-medium truncate">
                        {p.requiredSubjectName}
                      </span>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                          p.requirementType === "requiere_aprobada"
                            ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                            : "bg-sky-500/10 text-sky-300 border-sky-500/30"
                        }`}
                      >
                        {p.requirementType === "requiere_aprobada" ? "Final Aprobado" : "Cursada Regular"}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Descendants (Future Unlocked Subjects) */}
            <div className="space-y-1.5">
              <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>Materias Posteriores que Desbloquea ({descendantIds.size})</span>
              </div>
              {descendantIds.size === 0 ? (
                <p className="text-xs text-neutral-500 italic">Es una materia terminal (no bloquea otras materias).</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {Array.from(descendantIds).map((dId) => {
                    const dSubj = subjects.find((s) => s.id === dId);
                    if (!dSubj) return null;
                    return (
                      <span
                        key={dId}
                        className="px-2.5 py-1 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-medium"
                      >
                        {dSubj.name} ({dSubj.yearLevel}° Año)
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
