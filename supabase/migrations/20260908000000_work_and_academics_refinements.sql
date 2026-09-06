-- ==============================================================================
-- Migration: 20260908000000_work_and_academics_refinements.sql
-- Fase 4: Trabajo (Tablero Kanban & Deep Work) + Academia (Materias y Calificaciones)
-- ==============================================================================

-- 1. REFINAMIENTOS EN WORK & KANBAN
ALTER TABLE public.work_projects
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

ALTER TABLE public.work_sessions
    ADD COLUMN IF NOT EXISTS task_id UUID REFERENCES public.work_tasks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_work_sessions_user_started 
    ON public.work_sessions(user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_work_tasks_project_pos 
    ON public.work_tasks(project_id, status, position);

CREATE INDEX IF NOT EXISTS idx_work_tasks_user_status_pos 
    ON public.work_tasks(user_id, status, position);

-- 2. REFINAMIENTOS EN ACADEMICS
ALTER TABLE public.academic_subjects
    ADD COLUMN IF NOT EXISTS professor TEXT,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Normalizar status preexistentes antes de recrear el constraint
UPDATE public.academic_subjects SET status = 'en_curso' WHERE status = 'cursando';
UPDATE public.academic_subjects SET status = 'regularizada' WHERE status = 'final_pendiente';

ALTER TABLE public.academic_subjects DROP CONSTRAINT IF EXISTS academic_subjects_status_check;
ALTER TABLE public.academic_subjects ADD CONSTRAINT academic_subjects_status_check 
    CHECK (status IN ('en_curso', 'aprobada', 'regularizada', 'recursar'));

ALTER TABLE public.academic_milestones
    ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pendiente' NOT NULL 
    CHECK (status IN ('pendiente', 'aprobado', 'reprobado')),
    ADD COLUMN IF NOT EXISTS replaces_milestone_id UUID REFERENCES public.academic_milestones(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_academic_milestones_user_due 
    ON public.academic_milestones(user_id, due_date ASC);

CREATE INDEX IF NOT EXISTS idx_academic_subjects_user_term 
    ON public.academic_subjects(user_id, term);
