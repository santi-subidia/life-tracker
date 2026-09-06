-- ==============================================================================
-- REFINAMIENTO DE TABLAS DEL ASISTENTE IA (FASE 5)
-- Migration: 20260909000000_ai_assistant_refinements.sql
-- ==============================================================================

-- 1. Actualizar ai_conversations con updated_at e índices
ALTER TABLE public.ai_conversations
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_conversations_user_updated 
    ON public.ai_conversations(user_id, updated_at DESC);

-- 2. Ampliar ai_messages para soportar roles de herramientas y almacenamiento JSONB
ALTER TABLE public.ai_messages DROP CONSTRAINT IF EXISTS ai_messages_role_check;

ALTER TABLE public.ai_messages 
    ADD CONSTRAINT ai_messages_role_check 
    CHECK (role IN ('user', 'model', 'tool_call', 'tool_result', 'system'));

ALTER TABLE public.ai_messages
    ADD COLUMN IF NOT EXISTS tool_calls JSONB DEFAULT '[]'::jsonb NOT NULL,
    ADD COLUMN IF NOT EXISTS tool_results JSONB DEFAULT '[]'::jsonb NOT NULL;

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_created 
    ON public.ai_messages(conversation_id, created_at ASC);

-- 3. Trigger para actualizar automáticamente updated_at en ai_conversations al insertar mensaje
CREATE OR REPLACE FUNCTION public.update_ai_conversation_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.ai_conversations
    SET updated_at = timezone('utc'::text, now())
    WHERE id = NEW.conversation_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_ai_conversation_timestamp ON public.ai_messages;
CREATE TRIGGER trg_update_ai_conversation_timestamp
    AFTER INSERT ON public.ai_messages
    FOR EACH ROW
    EXECUTE FUNCTION public.update_ai_conversation_timestamp();

-- 4. Verificación de Políticas Row Level Security
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_conversations_all_own" ON public.ai_conversations;
CREATE POLICY "ai_conversations_all_own" 
    ON public.ai_conversations FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ai_messages_all_own" ON public.ai_messages;
CREATE POLICY "ai_messages_all_own" 
    ON public.ai_messages FOR ALL 
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
