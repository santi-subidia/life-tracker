-- ==============================================================================
-- LIFE TRACKER: INITIAL SCHEMA & RLS POLICIES
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. USERS & PROFILES
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select_own" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (new.id, new.email);
    RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==============================================================================
-- 3. CORE TIMELINE (SPINE TRANSVERSAL)
-- ==============================================================================

CREATE TABLE public.daily_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    mood_score SMALLINT CHECK (mood_score BETWEEN 1 AND 5),
    energy_score SMALLINT CHECK (energy_score BETWEEN 1 AND 5),
    summary_text TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(user_id, date)
);

ALTER TABLE public.daily_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "daily_logs_all_own" ON public.daily_logs FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.timeline_items (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    source_module TEXT NOT NULL CHECK (source_module IN ('health', 'habits', 'academics', 'work', 'notes', 'system')),
    source_id UUID NOT NULL,
    event_type TEXT NOT NULL,
    title TEXT NOT NULL,
    summary TEXT,
    metadata JSONB DEFAULT '{}'::jsonb NOT NULL,
    pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_timeline_user_date ON public.timeline_items(user_id, date DESC);
CREATE INDEX idx_timeline_source ON public.timeline_items(source_module, source_id);
CREATE INDEX idx_timeline_metadata_gin ON public.timeline_items USING GIN(metadata);

ALTER TABLE public.timeline_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "timeline_items_all_own" ON public.timeline_items FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. HEALTH & MEDICAL STUDIES (SALUD)
-- ==============================================================================

CREATE TABLE public.health_studies (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    study_type TEXT NOT NULL,
    study_date DATE NOT NULL,
    file_url TEXT NOT NULL,
    institution TEXT,
    summary TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.health_studies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_studies_all_own" ON public.health_studies FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.health_clinical_values (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    study_id UUID REFERENCES public.health_studies(id) ON DELETE CASCADE NOT NULL,
    metric_name TEXT NOT NULL,
    value TEXT NOT NULL,
    unit TEXT,
    category TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.health_clinical_values ENABLE ROW LEVEL SECURITY;
CREATE POLICY "health_clinical_values_all_own" ON public.health_clinical_values FOR ALL 
    USING (EXISTS (SELECT 1 FROM public.health_studies WHERE health_studies.id = health_clinical_values.study_id AND health_studies.user_id = auth.uid()));

-- ==============================================================================
-- 5. HABITS & ROUTINES (HÁBITOS)
-- ==============================================================================

CREATE TABLE public.habit_definitions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT DEFAULT 'general' NOT NULL,
    target_frequency TEXT DEFAULT 'daily' NOT NULL, -- 'daily', 'weekdays', 'weekly'
    color TEXT,
    icon TEXT,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.habit_definitions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_definitions_all_own" ON public.habit_definitions FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.habit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    habit_id UUID REFERENCES public.habit_definitions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    date DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'skipped')),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(habit_id, date)
);

CREATE INDEX idx_habit_logs_user_date ON public.habit_logs(user_id, date DESC);

ALTER TABLE public.habit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "habit_logs_all_own" ON public.habit_logs FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 6. SECOND BRAIN (NOTAS Y WIKILINKS TIPO OBSIDIAN)
-- ==============================================================================

CREATE TABLE public.notes (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    content TEXT DEFAULT '' NOT NULL,
    tags TEXT[] DEFAULT '{}'::TEXT[] NOT NULL,
    pinned BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_notes_user_updated ON public.notes(user_id, updated_at DESC);
CREATE INDEX idx_notes_tags_gin ON public.notes USING GIN(tags);

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notes_all_own" ON public.notes FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.note_links (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    source_note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    target_note_id UUID REFERENCES public.notes(id) ON DELETE CASCADE NOT NULL,
    link_text TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(source_note_id, target_note_id)
);

ALTER TABLE public.note_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "note_links_all_own" ON public.note_links FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 7. WORK & DEEP WORK (TRABAJO Y KANBAN)
-- ==============================================================================

CREATE TABLE public.work_projects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active' NOT NULL CHECK (status IN ('active', 'paused', 'completed')),
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.work_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_projects_all_own" ON public.work_projects FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.work_tasks (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.work_projects(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'todo' NOT NULL CHECK (status IN ('backlog', 'todo', 'in_progress', 'done')),
    priority TEXT DEFAULT 'medium' NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    due_date DATE,
    position INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_work_tasks_user_status ON public.work_tasks(user_id, status);

ALTER TABLE public.work_tasks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_tasks_all_own" ON public.work_tasks FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.work_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    project_id UUID REFERENCES public.work_projects(id) ON DELETE SET NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    started_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    duration_minutes INTEGER,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.work_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "work_sessions_all_own" ON public.work_sessions FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 8. ACADEMICS (MATERIAS Y EXÁMENES)
-- ==============================================================================

CREATE TABLE public.academic_subjects (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    code TEXT,
    term TEXT NOT NULL, -- Ej: '2026-1C'
    status TEXT DEFAULT 'cursando' NOT NULL CHECK (status IN ('cursando', 'aprobada', 'final_pendiente', 'recursar')),
    color TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_subjects_all_own" ON public.academic_subjects FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.academic_milestones (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    subject_id UUID REFERENCES public.academic_subjects(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    milestone_type TEXT NOT NULL CHECK (milestone_type IN ('parcial', 'entrega', 'final', 'recuperatorio')),
    due_date DATE NOT NULL,
    grade NUMERIC(4,2),
    weight_percentage NUMERIC(5,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.academic_milestones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "academic_milestones_all_own" ON public.academic_milestones FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 9. AI ASSISTANT (HISTORIAL DE CONVERSACIONES)
-- ==============================================================================

CREATE TABLE public.ai_conversations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_conversations_all_own" ON public.ai_conversations FOR ALL USING (auth.uid() = user_id);

CREATE TABLE public.ai_messages (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    conversation_id UUID REFERENCES public.ai_conversations(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('user', 'model')),
    content TEXT NOT NULL,
    cited_sources JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ai_messages_all_own" ON public.ai_messages FOR ALL USING (auth.uid() = user_id);
