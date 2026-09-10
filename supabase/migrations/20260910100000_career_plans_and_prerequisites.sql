-- ==============================================================================
-- FASE 4: PLAN DE ESTUDIO UNIVERSITARIO, MALLA CURRICULAR Y CORRELATIVIDADES (DAG)
-- Migration: 20260910100000_career_plans_and_prerequisites.sql
-- Tareas: [TSK-CP01] a [TSK-CP06]
-- ==============================================================================

-- ==============================================================================
-- 1. [TSK-CP01] ENUM: prerequisite_requirement_type
-- ==============================================================================
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prerequisite_requirement_type') THEN 
        CREATE TYPE public.prerequisite_requirement_type AS ENUM (
            'requiere_regularizada',
            'requiere_aprobada'
        ); 
    END IF; 
END $$;

-- ==============================================================================
-- 2. [TSK-CP02] TABLA: career_plans
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.career_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    university TEXT,
    total_subjects INTEGER DEFAULT 0 NOT NULL,
    total_credits INTEGER,
    is_active BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_career_plans_name_not_empty CHECK (char_length(trim(name)) > 0)
);

CREATE INDEX IF NOT EXISTS idx_career_plans_user_active 
    ON public.career_plans(user_id, is_active);

-- ==============================================================================
-- 3. [TSK-CP03] TABLA: curriculum_subjects
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.curriculum_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_plan_id UUID NOT NULL REFERENCES public.career_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    code TEXT,
    name TEXT NOT NULL,
    year_level INTEGER NOT NULL,
    period_number INTEGER NOT NULL,
    credits INTEGER,
    is_optional BOOLEAN DEFAULT false NOT NULL,
    order_index INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_curriculum_subjects_name_not_empty CHECK (char_length(trim(name)) > 0),
    CONSTRAINT chk_curriculum_subjects_year_range CHECK (year_level >= 1 AND year_level <= 10),
    CONSTRAINT chk_curriculum_subjects_period_range CHECK (period_number >= 1 AND period_number <= 4)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_plan_year_period 
    ON public.curriculum_subjects(career_plan_id, year_level, period_number);

CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_user 
    ON public.curriculum_subjects(user_id);

-- ==============================================================================
-- 4. [TSK-CP04] TABLA: curriculum_prerequisites (Grafo DAG)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.curriculum_prerequisites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    career_plan_id UUID NOT NULL REFERENCES public.career_plans(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    subject_id UUID NOT NULL REFERENCES public.curriculum_subjects(id) ON DELETE CASCADE,
    required_subject_id UUID NOT NULL REFERENCES public.curriculum_subjects(id) ON DELETE CASCADE,
    requirement_type public.prerequisite_requirement_type NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT chk_prereq_no_self_reference CHECK (subject_id <> required_subject_id),
    CONSTRAINT uq_curriculum_prerequisites UNIQUE (subject_id, required_subject_id)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_prereq_subject 
    ON public.curriculum_prerequisites(subject_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_prereq_required 
    ON public.curriculum_prerequisites(required_subject_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_prereq_plan 
    ON public.curriculum_prerequisites(career_plan_id);

CREATE INDEX IF NOT EXISTS idx_curriculum_prereq_user 
    ON public.curriculum_prerequisites(user_id);

-- ==============================================================================
-- 5. [TSK-CP05] EXTENSIÓN A academic_subjects
-- ==============================================================================
ALTER TABLE public.academic_subjects
    ADD COLUMN IF NOT EXISTS curriculum_subject_id UUID REFERENCES public.curriculum_subjects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_academic_subjects_curriculum_id 
    ON public.academic_subjects(curriculum_subject_id);

-- ==============================================================================
-- 6. [TSK-CP06] POLÍTICAS RLS (ROW LEVEL SECURITY)
-- ==============================================================================
ALTER TABLE public.career_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "career_plans_all_own" ON public.career_plans;
DROP POLICY IF EXISTS "Users can manage own career plans" ON public.career_plans;
CREATE POLICY "career_plans_all_own" 
    ON public.career_plans FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.curriculum_subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_subjects_all_own" ON public.curriculum_subjects;
DROP POLICY IF EXISTS "Users can manage own curriculum subjects" ON public.curriculum_subjects;
CREATE POLICY "curriculum_subjects_all_own" 
    ON public.curriculum_subjects FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.curriculum_prerequisites ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "curriculum_prerequisites_all_own" ON public.curriculum_prerequisites;
DROP POLICY IF EXISTS "Users can manage own curriculum prerequisites" ON public.curriculum_prerequisites;
CREATE POLICY "curriculum_prerequisites_all_own" 
    ON public.curriculum_prerequisites FOR ALL 
    USING (auth.uid() = user_id) 
    WITH CHECK (auth.uid() = user_id);
