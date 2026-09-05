-- ==============================================================================
-- LIFE TRACKER: HABITS FREQUENCIES & STREAKS INDEXES
-- ==============================================================================

-- 1. Ampliar habit_definitions con columnas de frecuencia estructurada
ALTER TABLE public.habit_definitions 
    ADD COLUMN IF NOT EXISTS frequency_type TEXT NOT NULL DEFAULT 'daily' 
        CHECK (frequency_type IN ('daily', 'specific_days', 'times_per_week')),
    ADD COLUMN IF NOT EXISTS target_days_per_week SMALLINT DEFAULT NULL 
        CHECK (target_days_per_week IS NULL OR (target_days_per_week BETWEEN 1 AND 7)),
    ADD COLUMN IF NOT EXISTS specific_days SMALLINT[] DEFAULT NULL;

-- 2. Índices para lecturas y filtrado rápido
CREATE INDEX IF NOT EXISTS idx_habit_definitions_user_active 
    ON public.habit_definitions(user_id) 
    WHERE is_archived = false;

CREATE INDEX IF NOT EXISTS idx_habit_logs_habit_date 
    ON public.habit_logs(habit_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_daily_logs_user_date 
    ON public.daily_logs(user_id, date);
