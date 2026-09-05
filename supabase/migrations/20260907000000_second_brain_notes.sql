-- ==============================================================================
-- FASE 3: NOTAS Y SEGUNDO CEREBRO (ESTILO OBSIDIAN)
-- Migración para soporte de wikilinks, stubs, búsqueda full-text y backlinks
-- ==============================================================================

-- 1. Ampliar tabla notes con columnas slug, is_stub e is_archived
ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS slug TEXT,
    ADD COLUMN IF NOT EXISTS is_stub BOOLEAN DEFAULT false NOT NULL,
    ADD COLUMN IF NOT EXISTS is_archived BOOLEAN DEFAULT false NOT NULL;

-- 2. Poblar slug para notas preexistentes si existieran
UPDATE public.notes 
SET slug = LOWER(REGEXP_REPLACE(REGEXP_REPLACE(title, '[^a-zA-Z0-9]+', '-', 'g'), '^-+|-+$', '', 'g'))
WHERE slug IS NULL OR slug = '';

-- Asignar fallback para títulos vacíos si los hubiera
UPDATE public.notes SET slug = id::text WHERE slug IS NULL OR slug = '';

ALTER TABLE public.notes ALTER COLUMN slug SET NOT NULL;

-- 3. Restricción de unicidad de slug por usuario
CREATE UNIQUE INDEX IF NOT EXISTS idx_notes_user_slug 
    ON public.notes(user_id, slug);

-- 4. Columna generada para búsqueda Full-Text en español con índice GIN
ALTER TABLE public.notes
    ADD COLUMN IF NOT EXISTS search_vector tsvector 
    GENERATED ALWAYS AS (
        to_tsvector('spanish', coalesce(title, '') || ' ' || coalesce(content, ''))
    ) STORED;

CREATE INDEX IF NOT EXISTS idx_notes_search_vector 
    ON public.notes USING GIN(search_vector);

-- 5. Índices de optimización para note_links (Backlinks y Grafo)
CREATE INDEX IF NOT EXISTS idx_note_links_target 
    ON public.note_links(target_note_id);

CREATE INDEX IF NOT EXISTS idx_note_links_source 
    ON public.note_links(source_note_id);

CREATE INDEX IF NOT EXISTS idx_note_links_user_target 
    ON public.note_links(user_id, target_note_id);
