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

export interface ExtractedStudyResult {
  fileUrl: string;
  fileName: string;
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

export interface DailyHubData {
  date: string;
  dailyLog?: DailyLog;
  habits: TodayHabitItem[];
  completionPercentage: number;
  todayTimeline: TodayTimelineItem[];
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

  static async extractStudy(file: File, token?: string): Promise<ExtractedStudyResult> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(`${API_BASE_URL}/api/health/extract`, {
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
}

