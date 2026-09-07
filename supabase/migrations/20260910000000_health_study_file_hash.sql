-- ==============================================================================
-- Migration: Add file_hash to health_studies
-- Description: Stores SHA-256 hash of uploaded study files for duplicate detection
-- ==============================================================================

ALTER TABLE public.health_studies 
ADD COLUMN IF NOT EXISTS file_hash VARCHAR(64);

CREATE INDEX IF NOT EXISTS ix_health_studies_user_hash 
ON public.health_studies(user_id, file_hash);
