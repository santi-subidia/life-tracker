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
// FINANCES & PERSONAL CASHFLOW
// ==============================================================================

export type AccountType =
  | "Cash"
  | "Bank"
  | "DigitalWallet"
  | "Crypto"
  | "Other"
  | "cash"
  | "bank"
  | "digital_wallet"
  | "crypto"
  | "other"
  | 0
  | 1
  | 2
  | 3
  | 4;

export type CategoryType =
  | "Expense"
  | "Income"
  | "Both"
  | "expense"
  | "income"
  | "both"
  | 0
  | 1
  | 2;

export type TransactionType =
  | "Expense"
  | "Income"
  | "Transfer"
  | "expense"
  | "income"
  | "transfer"
  | 0
  | 1
  | 2;

export type BudgetAlertStatus =
  | "Normal"
  | "Warning"
  | "Exceeded"
  | "normal"
  | "warning"
  | "exceeded"
  | 0
  | 1
  | 2;

export interface FinancialAccount {
  id: string;
  userId: string;
  name: string;
  accountType: AccountType;
  currency: string;
  initialBalance: number;
  currentBalance: number;
  color: string;
  icon: string;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFinancialAccountRequest {
  name: string;
  accountType: AccountType;
  currency: string;
  initialBalance?: number;
  color?: string;
  icon?: string;
}

export interface UpdateFinancialAccountRequest {
  name: string;
  color?: string;
  icon?: string;
}

export interface TransactionCategory {
  id: string;
  userId: string;
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  isSystem: boolean;
  displayOrder: number;
  createdAt: string;
}

export interface CreateTransactionCategoryRequest {
  name: string;
  type?: CategoryType;
  color?: string;
  icon?: string;
  displayOrder?: number;
}

export interface UpdateTransactionCategoryRequest {
  name: string;
  type: CategoryType;
  color: string;
  icon: string;
  displayOrder: number;
}

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  accountName: string;
  accountCurrency: string;
  destinationAccountId?: string | null;
  destinationAccountName?: string | null;
  destinationAccountCurrency?: string | null;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  type: TransactionType;
  amount: number;
  destinationAmount?: number | null;
  exchangeRate?: number | null;
  date: string;
  timestamp: string;
  description: string;
  notes?: string | null;
  tags?: string[];
  isCleared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionRequest {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date?: string | null;
  timestamp?: string | null;
  destinationAccountId?: string | null;
  destinationAmount?: number | null;
  exchangeRate?: number | null;
  categoryId?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  isCleared?: boolean;
}

export interface UpdateTransactionRequest {
  accountId: string;
  type: TransactionType;
  amount: number;
  description: string;
  date: string;
  timestamp?: string | null;
  destinationAccountId?: string | null;
  destinationAmount?: number | null;
  exchangeRate?: number | null;
  categoryId?: string | null;
  notes?: string | null;
  tags?: string[] | null;
  isCleared?: boolean;
}

export interface TransactionFilterRequest {
  accountId?: string;
  categoryId?: string;
  type?: TransactionType;
  startDate?: string;
  endDate?: string;
  search?: string;
  currency?: string;
  month?: number;
  year?: number;
  limit?: number;
  offset?: number;
}

export interface BudgetExecution {
  id: string;
  userId: string;
  categoryId?: string | null;
  categoryName?: string | null;
  categoryColor?: string | null;
  categoryIcon?: string | null;
  month: number;
  year: number;
  limitAmount: number;
  spentAmount: number;
  remainingAmount: number;
  percentage: number;
  status: BudgetAlertStatus;
  currency: string;
}

export interface CreateOrUpdateBudgetRequest {
  month: number;
  year: number;
  limitAmount: number;
  currency?: string;
  categoryId?: string | null;
}

export interface CategoryExpenseSummary {
  categoryId?: string | null;
  categoryName: string;
  color: string;
  icon: string;
  amount: number;
  percentage: number;
}

export interface CurrencyCashflowSummary {
  currency: string;
  totalLiquidity: number;
  totalIncome: number;
  totalExpense: number;
  netSavings: number;
  savingsRatePercentage: number;
  expensesByCategory: CategoryExpenseSummary[];
}

export interface CashflowSummary {
  month: number;
  year: number;
  ars: CurrencyCashflowSummary;
  usd: CurrencyCashflowSummary;
  otherCurrencies?: CurrencyCashflowSummary[];
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

  // --- PROFILE & ANALYTICS SUMMARY ---

  static async getProfileSummary(period: "week" | "month" | "year" = "week", token?: string): Promise<ProfileSummary> {
    const url = new URL(`${API_BASE_URL}/api/profile/summary`);
    url.searchParams.set("period", period);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });

    if (!res.ok) throw new Error("Error al obtener el resumen analítico del perfil.");
    return res.json();
  }

  // --- FINANCES: ACCOUNTS ---

  static async getFinanceAccounts(includeArchived = false, token?: string): Promise<FinancialAccount[]> {
    const url = new URL(`${API_BASE_URL}/api/finances/accounts`);
    if (includeArchived) url.searchParams.set("includeArchived", "true");

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las cuentas financieras.");
    return res.json();
  }

  static async createFinanceAccount(data: CreateFinancialAccountRequest, token?: string): Promise<FinancialAccount> {
    const res = await fetch(`${API_BASE_URL}/api/finances/accounts`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear la cuenta financiera.");
    }
    return res.json();
  }

  static async updateFinanceAccount(id: string, data: UpdateFinancialAccountRequest, token?: string): Promise<FinancialAccount> {
    const res = await fetch(`${API_BASE_URL}/api/finances/accounts/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la cuenta financiera.");
    }
    return res.json();
  }

  static async deleteFinanceAccount(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/finances/accounts/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar la cuenta financiera.");
  }

  static async archiveFinanceAccount(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/finances/accounts/${id}/archive`, {
      method: "POST",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al archivar la cuenta financiera.");
  }

  static async restoreFinanceAccount(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/finances/accounts/${id}/restore`, {
      method: "POST",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al restaurar la cuenta financiera.");
  }

  // --- FINANCES: CATEGORIES ---

  static async getFinanceCategories(token?: string): Promise<TransactionCategory[]> {
    const res = await fetch(`${API_BASE_URL}/api/finances/categories`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las categorías de transacciones.");
    return res.json();
  }

  static async createFinanceCategory(data: CreateTransactionCategoryRequest, token?: string): Promise<TransactionCategory> {
    const res = await fetch(`${API_BASE_URL}/api/finances/categories`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear la categoría de transacción.");
    }
    return res.json();
  }

  // --- FINANCES: TRANSACTIONS ---

  static async getFinanceTransactions(filters?: TransactionFilterRequest, token?: string): Promise<Transaction[]> {
    const url = new URL(`${API_BASE_URL}/api/finances/transactions`);
    if (filters) {
      if (filters.accountId) url.searchParams.set("accountId", filters.accountId);
      if (filters.categoryId) url.searchParams.set("categoryId", filters.categoryId);
      if (filters.type !== undefined && filters.type !== null) url.searchParams.set("type", filters.type.toString());
      if (filters.startDate) url.searchParams.set("startDate", filters.startDate);
      if (filters.endDate) url.searchParams.set("endDate", filters.endDate);
      if (filters.search) url.searchParams.set("search", filters.search);
      if (filters.currency) url.searchParams.set("currency", filters.currency);
      if (filters.month !== undefined && filters.month !== null) url.searchParams.set("month", filters.month.toString());
      if (filters.year !== undefined && filters.year !== null) url.searchParams.set("year", filters.year.toString());
      if (filters.limit !== undefined && filters.limit !== null) url.searchParams.set("limit", filters.limit.toString());
      if (filters.offset !== undefined && filters.offset !== null) url.searchParams.set("offset", filters.offset.toString());
    }

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener las transacciones financieras.");
    return res.json();
  }

  static async createFinanceTransaction(data: CreateTransactionRequest, token?: string): Promise<Transaction> {
    const res = await fetch(`${API_BASE_URL}/api/finances/transactions`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al registrar la transacción.");
    }
    return res.json();
  }

  static async updateFinanceTransaction(id: string, data: UpdateTransactionRequest, token?: string): Promise<Transaction> {
    const res = await fetch(`${API_BASE_URL}/api/finances/transactions/${id}`, {
      method: "PUT",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la transacción.");
    }
    return res.json();
  }

  static async deleteFinanceTransaction(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/finances/transactions/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al revertir y eliminar la transacción.");
    }
  }

  // --- FINANCES: CASHFLOW SUMMARY & BUDGETS ---

  static async getFinanceSummary(month?: number, year?: number, currency?: string, token?: string): Promise<CashflowSummary> {
    const url = new URL(`${API_BASE_URL}/api/finances/summary`);
    if (month) url.searchParams.set("month", month.toString());
    if (year) url.searchParams.set("year", year.toString());
    if (currency) url.searchParams.set("currency", currency);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener el resumen de flujo de caja.");
    return res.json();
  }

  static async getFinanceBudgets(month?: number, year?: number, currency?: string, token?: string): Promise<BudgetExecution[]> {
    const url = new URL(`${API_BASE_URL}/api/finances/budgets`);
    if (month) url.searchParams.set("month", month.toString());
    if (year) url.searchParams.set("year", year.toString());
    if (currency) url.searchParams.set("currency", currency);

    const res = await fetch(url.toString(), {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener la ejecución presupuestaria.");
    return res.json();
  }

  static async setFinanceBudget(data: CreateOrUpdateBudgetRequest, token?: string): Promise<BudgetExecution> {
    const res = await fetch(`${API_BASE_URL}/api/finances/budgets`, {
      method: "POST",
      headers: {
        ...this.getHeaders(token),
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al definir el presupuesto.");
    }
    return res.json();
  }

  static async deleteFinanceBudget(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/finances/budgets/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar el presupuesto.");
  }

  // --- FITNESS: EXERCISES ---
  static async getExercises(params?: { search?: string; muscle?: string; discipline?: string; equipment?: string }, token?: string): Promise<Exercise[]> {
    const url = new URL(`${API_BASE_URL}/api/fitness/exercises`);
    if (params) {
      if (params.search) url.searchParams.set("search", params.search);
      if (params.muscle) url.searchParams.set("muscle", params.muscle);
      if (params.discipline) url.searchParams.set("discipline", params.discipline);
      if (params.equipment) url.searchParams.set("equipment", params.equipment);
    }
    const res = await fetch(url.toString(), { headers: this.getHeaders(token) });
    if (!res.ok) throw new Error("Error al obtener catálogo de ejercicios.");
    return res.json();
  }

  static async getExerciseById(id: string, token?: string): Promise<Exercise> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/exercises/${id}`, { headers: this.getHeaders(token) });
    if (!res.ok) throw new Error("Ejercicio no encontrado.");
    return res.json();
  }

  static async createCustomExercise(data: CreateCustomExerciseRequest, token?: string): Promise<Exercise> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/exercises`, {
      method: "POST",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear el ejercicio.");
    }
    return res.json();
  }

  static async updateCustomExercise(id: string, data: UpdateCustomExerciseRequest, token?: string): Promise<Exercise> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/exercises/${id}`, {
      method: "PUT",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar el ejercicio.");
    }
    return res.json();
  }

  static async deleteCustomExercise(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/exercises/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al eliminar el ejercicio.");
    }
  }

  static async getExerciseHistory(exerciseIdOrName: string, limit: number = 10, token?: string): Promise<WorkoutSet[]> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/exercises/${encodeURIComponent(exerciseIdOrName)}/history?limit=${limit}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) return [];
    return res.json();
  }

  // --- FITNESS: ROUTINES ---
  static async getRoutines(token?: string): Promise<Routine[]> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/routines`, { headers: this.getHeaders(token) });
    if (!res.ok) throw new Error("Error al obtener rutinas.");
    return res.json();
  }

  static async getRoutineById(id: string, token?: string): Promise<Routine> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/routines/${id}`, { headers: this.getHeaders(token) });
    if (!res.ok) throw new Error("Rutina no encontrada.");
    return res.json();
  }

  static async createRoutine(data: CreateRoutineRequest, token?: string): Promise<Routine> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/routines`, {
      method: "POST",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al crear la rutina.");
    }
    return res.json();
  }

  static async updateRoutine(id: string, data: CreateRoutineRequest, token?: string): Promise<Routine> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/routines/${id}`, {
      method: "PUT",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la rutina.");
    }
    return res.json();
  }

  static async archiveRoutine(id: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/routines/${id}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al archivar la rutina.");
  }

  // --- FITNESS: SESSIONS ---
  static async getActiveWorkoutSession(token?: string): Promise<WorkoutSession | null> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/active`, { headers: this.getHeaders(token) });
    if (res.status === 404) return null;
    if (!res.ok) throw new Error("Error al consultar sesión activa.");
    return res.json();
  }

  static async startWorkoutSession(data: { name: string; routineId?: string }, token?: string): Promise<WorkoutSession> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/start`, {
      method: "POST",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al iniciar el entrenamiento.");
    }
    return res.json();
  }

  static async logWorkoutSet(
    sessionId: string,
    data: {
      exerciseId: string;
      setOrder: number;
      setType: string;
      weightKg: number;
      reps: number;
      rpe?: number | null;
      rir?: number | null;
      isCompleted: boolean;
    },
    token?: string
  ): Promise<WorkoutSet> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/${sessionId}/sets`, {
      method: "POST",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al registrar la serie.");
    }
    return res.json();
  }

  static async updateWorkoutSet(
    sessionId: string,
    setId: string,
    data: {
      setType: string;
      weightKg: number;
      reps: number;
      rpe?: number | null;
      rir?: number | null;
      isCompleted: boolean;
    },
    token?: string
  ): Promise<WorkoutSet> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/${sessionId}/sets/${setId}`, {
      method: "PUT",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al actualizar la serie.");
    }
    return res.json();
  }

  static async deleteWorkoutSet(sessionId: string, setId: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/${sessionId}/sets/${setId}`, {
      method: "DELETE",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al eliminar la serie.");
  }

  static async completeWorkoutSession(sessionId: string, data: { notes?: string }, token?: string): Promise<WorkoutSession> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/${sessionId}/complete`, {
      method: "POST",
      headers: { ...this.getHeaders(token), "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || "Error al finalizar el entrenamiento.");
    }
    return res.json();
  }

  static async discardWorkoutSession(sessionId: string, token?: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/${sessionId}/discard`, {
      method: "POST",
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al descartar el entrenamiento.");
  }

  static async getWorkoutSessionsHistory(limit: number = 20, token?: string): Promise<WorkoutSession[]> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/history?limit=${limit}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Error al obtener historial de entrenamientos.");
    return res.json();
  }

  static async getWorkoutSessionById(sessionId: string, token?: string): Promise<WorkoutSession> {
    const res = await fetch(`${API_BASE_URL}/api/fitness/sessions/${sessionId}`, {
      headers: this.getHeaders(token),
    });
    if (!res.ok) throw new Error("Sesión de entrenamiento no encontrada.");
    return res.json();
  }

  static getUserProfile(): UserProfileSettings {
    if (typeof window === "undefined") {
      return { name: "Subi", title: "Software Engineer & Student", bio: "Construyendo sistemas de alto rendimiento y hábitos de acero." };
    }
    try {
      const saved = localStorage.getItem("lt_user_profile");
      if (saved) return JSON.parse(saved);
    } catch {
      // Ignore
    }
    return { name: "Subi", title: "Software Engineer & Student", bio: "Construyendo sistemas de alto rendimiento y hábitos de acero." };
  }

  static saveUserProfile(profile: UserProfileSettings): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.setItem("lt_user_profile", JSON.stringify(profile));
      window.dispatchEvent(new Event("user_profile_updated"));
    } catch {
      // Ignore
    }
  }
}

export interface UserProfileSettings {
  name: string;
  title: string;
  bio: string;
}

// ==============================================================================
// PROFILE & SUMMARY INTERFACES
// ==============================================================================

export interface ProfileActivityPoint {
  date: string;
  focusMinutes: number;
  completedHabits: number;
  completedTasks: number;
  eventsCount: number;
}

export interface ProfileSummary {
  period: "week" | "month" | "year";
  startDate: string;
  endDate: string;
  totalFocusMinutes: number;
  totalFocusSessions: number;
  completedHabits: number;
  longestStreak: number;
  completedTasks: number;
  notesCreated: number;
  approvedMilestones: number;
  healthStudiesCount: number;
  activityTimeline: ProfileActivityPoint[];
}

// ==============================================================================
// FITNESS & WORKOUTS INTERFACES
// ==============================================================================

export interface MuscleStimulus {
  muscle: string;
  stimulus_pct: number;
}

export interface Exercise {
  id: string;
  userId?: string | null;
  name: string;
  slug: string;
  discipline: "strength" | "cardio" | "calisthenics" | "mobility";
  primaryMuscleGroup: string;
  muscleStimulus: MuscleStimulus[];
  equipment: string;
  instructions: string[];
  gifUrl: string;
  videoUrl?: string | null;
  isCustom: boolean;
  createdAt: string;
}

export interface CreateCustomExerciseRequest {
  name: string;
  discipline: string;
  primaryMuscleGroup: string;
  muscleStimulus: MuscleStimulus[];
  equipment: string;
  instructions?: string[];
  gifUrl?: string;
  videoUrl?: string;
}

export interface UpdateCustomExerciseRequest {
  name: string;
  discipline: string;
  primaryMuscleGroup: string;
  muscleStimulus: MuscleStimulus[];
  equipment: string;
  instructions?: string[];
  gifUrl?: string;
  videoUrl?: string;
}

export interface RoutineExercise {
  id: string;
  routineId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscleGroup: string;
  equipment: string;
  gifUrl: string;
  orderIndex: number;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
  restTimerSeconds: number;
  notes?: string | null;
}

export interface Routine {
  id: string;
  userId: string;
  name: string;
  description?: string | null;
  estimatedDurationMinutes: number;
  isArchived: boolean;
  exercises: RoutineExercise[];
  createdAt: string;
}

export interface CreateRoutineRequest {
  name: string;
  description?: string | null;
  estimatedDurationMinutes: number;
  exercises: {
    exerciseId: string;
    orderIndex: number;
    targetSets: number;
    targetRepsMin: number;
    targetRepsMax: number;
    restTimerSeconds: number;
    notes?: string | null;
  }[];
}

export interface GhostSetReference {
  currentSetId: string;
  setOrder: number;
  previousWeightKg: number;
  previousReps: number;
  previousRpe?: number | null;
  previousDate: string;
}

export interface WorkoutSet {
  id: string;
  sessionId: string;
  exerciseId: string;
  exerciseName: string;
  primaryMuscleGroup: string;
  equipment: string;
  gifUrl: string;
  setOrder: number;
  setType: "normal" | "warmup" | "drop_set" | "failure";
  weightKg: number;
  reps: number;
  rpe?: number | null;
  rir?: number | null;
  isCompleted: boolean;
  completedAt?: string | null;
  ghostReference?: GhostSetReference | null;
}

export interface WorkoutSession {
  id: string;
  userId: string;
  routineId?: string | null;
  routineName?: string | null;
  name: string;
  status: "active" | "completed" | "discarded";
  startedAt: string;
  completedAt?: string | null;
  durationSeconds: number;
  totalVolumeKg: number;
  totalSetsCompleted: number;
  notes?: string | null;
  sets: WorkoutSet[];
}

export const ApiClient = LifeTrackerApiClient;


