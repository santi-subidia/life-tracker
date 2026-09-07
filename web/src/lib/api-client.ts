const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

// ==============================================================================
// HEALTH & MEDICAL STUDIES
// ==============================================================================

export interface ExtractedClinicalValue {
  metricName: string;
  value: string;
  unit?: string;
  category?: string;
  isAbnormal: boolean;
}

export interface DuplicateStudySummary {
  id: string;
  studyType: string;
  studyDate: string;
  institution?: string;
  fileUrl: string;
  createdAt: string;
}

export interface ExtractedStudyResult {
  fileUrl: string;
  fileName: string;
  fileHash?: string;
  duplicateStatus?: "NONE" | "EXACT_FILE" | "POSSIBLE_DUPLICATE";
  existingStudy?: DuplicateStudySummary;
  studyType: string;
  studyDate: string;
  institution?: string;
  clinicalValues: ExtractedClinicalValue[];
}

export interface HealthStudy {
  id: string;
  userId: string;
  studyType: string;
  studyDate: string;
  fileUrl: string;
  fileHash?: string;
  institution?: string;
  summary?: string;
  createdAt: string;
  clinicalValues: {
    id: string;
    studyId: string;
    metricName: string;
    value: string;
    unit?: string;
    category?: string;
    isAbnormal: boolean;
  }[];
}

export interface MetricDataPoint {
  studyId: string;
  studyDate: string;
  year: number;
  studyType: string;
  institution?: string;
  value: string;
  numericValue?: number;
  unit?: string;
  isAbnormal: boolean;
}

export interface MetricComparison {
  metricName: string;
  unit?: string;
  history: MetricDataPoint[];
}

// ==============================================================================
// HABITS & ROUTINES
// ==============================================================================

export interface HabitFrequency {
  type: "daily" | "specific_days" | "times_per_week";
  targetDaysPerWeek?: number;
  specificDays?: number[]; // 0=Sunday, 1=Monday...
}

export interface Habit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  category: string;
  frequency: HabitFrequency;
  color?: string;
  icon?: string;
  isArchived: boolean;
  currentStreak: number;
  longestStreak: number;
  isCompletedToday: boolean;
  createdAt: string;
}

export interface CreateHabitPayload {
  name: string;
  description?: string;
  category: string;
  frequencyType: string;
  targetDaysPerWeek?: number;
  specificDays?: number[];
  color?: string;
  icon?: string;
}

export interface ToggleHabitResult {
  habitId: string;
  date: string;
  status: "completed" | "pending";
  currentStreak: number;
  longestStreak: number;
}

// ==============================================================================
// DAILY HUB (VISTA HOY)
// ==============================================================================

export interface DailyLog {
  id: string;
  userId: string;
  date: string;
  moodScore?: number;
  energyScore?: number;
  summaryText?: string;
  updatedAt: string;
}

export interface TodayHabitItem {
  id: string;
  name: string;
  category: string;
  color?: string;
  icon?: string;
  isCompletedToday: boolean;
  currentStreak: number;
  longestStreak: number;
  frequencyDescription: string;
}

export interface TodayTimelineItem {
  id: string;
  timestamp: string;
  sourceModule: string;
  eventType: string;
  title: string;
  summary?: string;
}

export interface WorkSummary {
  completedTasksToday: number;
  focusMinutesToday: number;
}

export interface UpcomingExam {
  milestoneId: string;
  subjectId: string;
  subjectName: string;
  subjectColor?: string;
  milestoneTitle: string;
  milestoneType: string;
  dueDate: string;
  daysRemaining: number;
}

export interface DailyHubData {
  date: string;
  dailyLog?: DailyLog;
  habits: TodayHabitItem[];
  completionPercentage: number;
  todayTimeline: TodayTimelineItem[];
  workSummary?: WorkSummary;
  upcomingExams?: UpcomingExam[];
}

// ==============================================================================
// NOTES & SECOND BRAIN (OBSIDIAN-STYLE)
// ==============================================================================

export interface NoteListItem {
  id: string;
  slug: string;
  title: string;
  snippet: string;
  tags: string[];
  pinned: boolean;
  isStub: boolean;
  outgoingLinksCount: number;
  backlinksCount: number;
  updatedAt: string;
}

export interface OutgoingLink {
  targetNoteId: string;
  targetSlug: string;
  targetTitle: string;
  alias?: string | null;
  isStub: boolean;
}

export interface BacklinkItem {
  sourceNoteId: string;
  sourceSlug: string;
  sourceTitle: string;
  linkText?: string | null;
  contextSnippet: string;
}

export interface NoteDetail {
  id: string;
  slug: string;
  title: string;
  content: string;
  tags: string[];
  pinned: boolean;
  isStub: boolean;
  createdAt: string;
  updatedAt: string;
  outgoingLinks: OutgoingLink[];
  backlinks: BacklinkItem[];
}

export interface CreateNotePayload {
  title: string;
  content: string;
  pinned?: boolean;
}

export interface UpdateNotePayload {
  title: string;
  content: string;
  pinned?: boolean;
}

export interface GraphNode {
  id: string;
  slug: string;
  title: string;
  isStub: boolean;
  tags: string[];
  connectionsCount: number;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  label?: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface NoteAutocompleteItem {
  id: string;
  slug: string;
  title: string;
  tags: string[];
}

// ==============================================================================
// WORK & DEEP WORK (TABLERO KANBAN & SESIONES)
// ==============================================================================

export interface WorkProject {
  id: string;
  name: string;
  description?: string;
  status: "active" | "archived" | "completed" | string;
  color?: string;
  activeTasksCount: number;
  completedTasksCount: number;
  createdAt: string;
}

export interface WorkTask {
  id: string;
  projectId?: string;
  projectName?: string;
  projectColor?: string;
  title: string;
  description?: string;
  status: "backlog" | "todo" | "in_progress" | "done" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  dueDate?: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkSession {
  id: string;
  projectId?: string;
  projectName?: string;
  taskId?: string;
  taskTitle?: string;
  startedAt: string;
  endedAt?: string;
  durationMinutes: number;
  notes?: string;
  createdAt: string;
}

export interface WorkMetrics {
  focusMinutesThisWeek: number;
  focusMinutesToday: number;
  completedTasksThisWeek: number;
  completedTasksToday: number;
  sessionsCountThisWeek: number;
}

export interface CreateWorkProjectPayload {
  name: string;
  description?: string;
  status?: string;
  color?: string;
}

export interface UpdateWorkProjectPayload {
  name: string;
  description?: string;
  status: string;
  color?: string;
}

export interface CreateWorkTaskPayload {
  projectId?: string;
  title: string;
  description?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
}

export interface UpdateWorkTaskPayload {
  projectId?: string;
  title: string;
  description?: string;
  priority: string;
  dueDate?: string;
}

export interface MoveWorkTaskPayload {
  newStatus: string;
  newPosition: number;
}

export interface RecordWorkSessionPayload {
  projectId?: string;
  taskId?: string;
  startedAt: string;
  endedAt: string;
  notes?: string;
}

// ==============================================================================
// ACADEMICS (MATERIAS, HITOS EVALUATIVOS & CALIFICACIONES)
// ==============================================================================

export interface AcademicSubject {
  id: string;
  name: string;
  code?: string;
  term: string;
  professor?: string;
  status: "en_curso" | "aprobada" | "regularizada" | "recursar" | string;
  color?: string;
  average?: number;
  totalMilestones: number;
  completedMilestones: number;
}

export interface AcademicMilestone {
  id: string;
  subjectId: string;
  title: string;
  milestoneType: "parcial" | "final" | "entrega" | "recuperatorio" | string;
  dueDate: string;
  grade?: number;
  weightPercentage?: number;
  status: "pendiente" | "calificado" | "vencido" | string;
  replacesMilestoneId?: string;
  notes?: string;
}

export interface AcademicSubjectDetail {
  id: string;
  name: string;
  code?: string;
  term: string;
  professor?: string;
  status: string;
  color?: string;
  average?: number;
  milestones: AcademicMilestone[];
}

export interface AcademicMetrics {
  careerAverage?: number;
  approvedSubjectsCount: number;
  inProgressSubjectsCount: number;
  upcomingExamsCount: number;
}

export interface CreateAcademicSubjectPayload {
  name: string;
  code?: string;
  term: string;
  professor?: string;
  status?: string;
  color?: string;
}

export interface UpdateAcademicSubjectPayload {
  name: string;
  code?: string;
  term: string;
  professor?: string;
  status: string;
  color?: string;
}

export interface CreateAcademicMilestonePayload {
  subjectId: string;
  title: string;
  milestoneType: string;
  dueDate: string;
  weightPercentage?: number;
  replacesMilestoneId?: string;
  notes?: string;
}

export interface UpdateAcademicMilestonePayload {
  title: string;
  milestoneType: string;
  dueDate: string;
  weightPercentage?: number;
  replacesMilestoneId?: string;
  notes?: string;
}

export interface AssignGradePayload {
  grade: number;
  notes?: string;
}

// ==============================================================================
// AI ASSISTANT (GOOGLE GEMINI 2.5 FLASH & HOLISTIC ORCHESTRATION)
// ==============================================================================

export interface AiConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
}

export interface AiMessage {
  id: string;
  role: "user" | "model" | "tool_call" | "tool_result" | "system" | string;
  content: string;
  toolCallsJson?: string;
  toolResultsJson?: string;
  createdAt: string;
}

export interface AiConversationDetail {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AiMessage[];
}

export interface AiChatTurnResult {
  conversationId: string;
  title: string;
  newMessages: AiMessage[];
}

export interface CreateAiConversationPayload {
  title?: string;
}

export interface SendAiMessagePayload {
  message: string;
}

export interface UpdateAiConversationTitlePayload {
  title: string;
}

// ==============================================================================
// API CLIENT IMPLEMENTATION
// ==============================================================================

export class LifeTrackerApiClient {
  private static getHeaders(token?: string): HeadersInit {
    const headers: Record<string, string> = {};
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return headers;
  }

  // --- HEALTH ---

  static async extractStudy(file: File, force?: boolean, token?: string): Promise<ExtractedStudyResult> {
    const formData = new FormData();
    formData.append("file", file);

    const url = force ? `${API_BASE_URL}/api/health/extract?force=true` : `${API_BASE_URL}/api/health/extract`;
    const res = await fetch(url, {
      method: "POST",
      headers: this.getHeaders(token),
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Error al extraer estudio: ${res.statusText}`);
    }

    return res.json();
  }

  static async saveStudy(studyData: {
    studyType: string;
    studyDate: string;
    fileUrl: string;
    institution?: string;
    summary?: string;
    fileHash?: string;
    replaceStudyId?: string;
    clinicalValues: Array<{
      metricName: string;
      value: string;
      unit?: string;
      category?: string;
      isAbnormal?: boolean;
    }>;
  }, token?: string): Promise<HealthStudy> {
    const res = await fetch(`${API_BASE_URL}/api/health/studies`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(studyData),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al guardar el estudio médico.");
    }

    return res.json();
  }

  static async getStudies(year?: number, token?: string): Promise<HealthStudy[]> {
    const url = new URL(`${API_BASE_URL}/api/health/studies`);
    if (year) url.searchParams.set("year", year.toString());

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener los estudios médicos.");
    return res.json();
  }

  static async getStudy(studyId: string, token?: string): Promise<HealthStudy> {
    const res = await fetch(`${API_BASE_URL}/api/health/studies/${studyId}`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener el estudio médico.");
    return res.json();
  }

  static async compareMetric(metricName: string, token?: string): Promise<MetricComparison> {
    const url = new URL(`${API_BASE_URL}/api/health/metrics/compare`);
    url.searchParams.set("name", metricName);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al consultar la comparativa de la métrica.");
    return res.json();
  }

  static async getAvailableMetrics(token?: string): Promise<string[]> {
    const res = await fetch(`${API_BASE_URL}/api/health/metrics`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener las métricas disponibles.");
    return res.json();
  }

  static getStudyFileUrl(studyId: string): string {
    return `${API_BASE_URL}/api/health/studies/${studyId}/file`;
  }

  static async deleteStudy(studyId: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/health/studies/${studyId}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al eliminar el estudio médico.");
    }
  }

  // --- HABITS ---

  static async getHabits(includeArchived = false, token?: string): Promise<Habit[]> {
    const url = new URL(`${API_BASE_URL}/api/habits`);
    if (includeArchived) url.searchParams.set("includeArchived", "true");

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener la lista de hábitos.");
    return res.json();
  }

  static async createHabit(payload: CreateHabitPayload, token?: string): Promise<Habit> {
    const res = await fetch(`${API_BASE_URL}/api/habits`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear el hábito.");
    }

    return res.json();
  }

  static async toggleHabit(habitId: string, date?: string, notes?: string, token?: string): Promise<ToggleHabitResult> {
    const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}/toggle`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ date, notes }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al registrar hábito.");
    }

    return res.json();
  }

  static async archiveHabit(habitId: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/habits/${habitId}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al archivar el hábito.");
  }

  // --- DAILY HUB ---

  static async getDailyHubToday(token?: string): Promise<DailyHubData> {
    const res = await fetch(`${API_BASE_URL}/api/daily-hub/today`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al cargar el Daily Hub de hoy.");
    return res.json();
  }

  static async updateDailyLogToday(payload: { moodScore?: number; energyScore?: number; summaryText?: string }, token?: string): Promise<DailyLog> {
    const res = await fetch(`${API_BASE_URL}/api/daily-logs/today`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al guardar el check-in diario.");
    }

    return res.json();
  }

  // --- NOTES & SECOND BRAIN ---

  static async getNotes(
    search?: string,
    tag?: string,
    includeArchived = false,
    includeStubs = false,
    token?: string
  ): Promise<NoteListItem[]> {
    const url = new URL(`${API_BASE_URL}/api/notes`);
    if (search) url.searchParams.set("search", search);
    if (tag) url.searchParams.set("tag", tag);
    if (includeArchived) url.searchParams.set("includeArchived", "true");
    if (includeStubs) url.searchParams.set("includeStubs", "true");

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener la lista de notas.");
    return res.json();
  }

  static async getNote(idOrSlug: string, token?: string): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE_URL}/api/notes/${encodeURIComponent(idOrSlug)}`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al cargar la nota solicitada.");
    }

    return res.json();
  }

  static async createNote(payload: CreateNotePayload, token?: string): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE_URL}/api/notes`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear la nota.");
    }

    return res.json();
  }

  static async updateNote(id: string, payload: UpdateNotePayload, token?: string): Promise<NoteDetail> {
    const res = await fetch(`${API_BASE_URL}/api/notes/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la nota.");
    }

    return res.json();
  }

  static async deleteNote(id: string, permanent = false, token?: string): Promise<void> {
    const url = new URL(`${API_BASE_URL}/api/notes/${id}`);
    if (permanent) url.searchParams.set("permanent", "true");

    const res = await fetch(url.toString(), {
      method: "DELETE",
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al eliminar la nota.");
  }

  static async getNotesGraph(token?: string): Promise<GraphData> {
    const res = await fetch(`${API_BASE_URL}/api/notes/graph`, {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al cargar la topología de red de notas.");
    return res.json();
  }

  static async autocompleteNotes(query: string, token?: string): Promise<NoteAutocompleteItem[]> {
    const url = new URL(`${API_BASE_URL}/api/notes/autocomplete`);
    if (query) url.searchParams.set("query", query);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al consultar sugerencias de notas.");
    return res.json();
  }

  // --- WORK & DEEP WORK ---

  static async getProjects(token?: string): Promise<WorkProject[]> {
    const res = await fetch(`${API_BASE_URL}/api/work/projects`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener los proyectos de trabajo.");
    return res.json();
  }

  static async createProject(payload: CreateWorkProjectPayload, token?: string): Promise<WorkProject> {
    const res = await fetch(`${API_BASE_URL}/api/work/projects`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear el proyecto.");
    }
    return res.json();
  }

  static async updateProject(id: string, payload: UpdateWorkProjectPayload, token?: string): Promise<WorkProject> {
    const res = await fetch(`${API_BASE_URL}/api/work/projects/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar el proyecto.");
    }
    return res.json();
  }

  static async deleteProject(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/work/projects/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar el proyecto.");
  }

  static async getTasks(projectId?: string, status?: string, token?: string): Promise<WorkTask[]> {
    const url = new URL(`${API_BASE_URL}/api/work/tasks`);
    if (projectId) url.searchParams.set("projectId", projectId);
    if (status) url.searchParams.set("status", status);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las tareas de trabajo.");
    return res.json();
  }

  static async createTask(payload: CreateWorkTaskPayload, token?: string): Promise<WorkTask> {
    const res = await fetch(`${API_BASE_URL}/api/work/tasks`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear la tarea.");
    }
    return res.json();
  }

  static async updateTask(id: string, payload: UpdateWorkTaskPayload, token?: string): Promise<WorkTask> {
    const res = await fetch(`${API_BASE_URL}/api/work/tasks/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la tarea.");
    }
    return res.json();
  }

  static async moveTask(id: string, payload: MoveWorkTaskPayload, token?: string): Promise<WorkTask> {
    const res = await fetch(`${API_BASE_URL}/api/work/tasks/${id}/move`, {
      method: "PATCH",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al mover la tarea.");
    }
    return res.json();
  }

  static async deleteTask(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/work/tasks/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar la tarea.");
  }

  static async recordWorkSession(payload: RecordWorkSessionPayload, token?: string): Promise<WorkSession> {
    const res = await fetch(`${API_BASE_URL}/api/work/sessions`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al registrar la sesión de Deep Work.");
    }
    return res.json();
  }

  static async getWorkSessions(limit = 20, token?: string): Promise<WorkSession[]> {
    const url = new URL(`${API_BASE_URL}/api/work/sessions`);
    if (limit) url.searchParams.set("limit", limit.toString());

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las sesiones de Deep Work.");
    return res.json();
  }

  static async getWorkMetrics(token?: string): Promise<WorkMetrics> {
    const res = await fetch(`${API_BASE_URL}/api/work/metrics`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al consultar las métricas de trabajo.");
    return res.json();
  }

  // --- ACADEMICS ---

  static async getSubjects(term?: string, token?: string): Promise<AcademicSubject[]> {
    const url = new URL(`${API_BASE_URL}/api/academics/subjects`);
    if (term) url.searchParams.set("term", term);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las materias académicas.");
    return res.json();
  }

  static async getSubjectDetail(id: string, token?: string): Promise<AcademicSubjectDetail> {
    const res = await fetch(`${API_BASE_URL}/api/academics/subjects/${id}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener el detalle de la materia.");
    return res.json();
  }

  static async createSubject(payload: CreateAcademicSubjectPayload, token?: string): Promise<AcademicSubject> {
    const res = await fetch(`${API_BASE_URL}/api/academics/subjects`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al registrar la materia.");
    }
    return res.json();
  }

  static async updateSubject(id: string, payload: UpdateAcademicSubjectPayload, token?: string): Promise<AcademicSubject> {
    const res = await fetch(`${API_BASE_URL}/api/academics/subjects/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la materia.");
    }
    return res.json();
  }

  static async deleteSubject(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/academics/subjects/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar la materia.");
  }

  static async createMilestone(payload: CreateAcademicMilestonePayload, token?: string): Promise<AcademicMilestone> {
    const res = await fetch(`${API_BASE_URL}/api/academics/milestones`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear el hito evaluativo.");
    }
    return res.json();
  }

  static async updateMilestone(id: string, payload: UpdateAcademicMilestonePayload, token?: string): Promise<AcademicMilestone> {
    const res = await fetch(`${API_BASE_URL}/api/academics/milestones/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar el hito evaluativo.");
    }
    return res.json();
  }

  static async assignGrade(id: string, payload: AssignGradePayload, token?: string): Promise<AcademicMilestone> {
    const res = await fetch(`${API_BASE_URL}/api/academics/milestones/${id}/grade`, {
      method: "PATCH",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al asignar la calificación.");
    }
    return res.json();
  }

  static async deleteMilestone(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/academics/milestones/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar el hito evaluativo.");
  }

  static async getAcademicMetrics(token?: string): Promise<AcademicMetrics> {
    const res = await fetch(`${API_BASE_URL}/api/academics/metrics`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las métricas académicas.");
    return res.json();
  }

  // --- AI ASSISTANT (GEMINI 2.5 FLASH) ---

  static async getAiConversations(token?: string): Promise<AiConversation[]> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las conversaciones del asistente IA.");
    return res.json();
  }

  static async getAiConversation(id: string, token?: string): Promise<AiConversationDetail> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${id}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener el detalle de la conversación.");
    return res.json();
  }

  static async createAiConversation(payload?: CreateAiConversationPayload, token?: string): Promise<AiConversation> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload || {}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear la conversación con el asistente IA.");
    }
    return res.json();
  }

  static async sendAiMessage(conversationId: string, payload: SendAiMessagePayload, token?: string): Promise<AiChatTurnResult> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al enviar el mensaje al asistente IA.");
    }
    return res.json();
  }

  static async updateAiConversationTitle(id: string, payload: UpdateAiConversationTitlePayload, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${id}/title`, {
      method: "PATCH",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Error al actualizar el título de la conversación.");
  }

  static async deleteAiConversation(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/ai/conversations/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar la conversación.");
  }
}

