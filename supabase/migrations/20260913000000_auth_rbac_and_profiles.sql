-- ==============================================================================
-- AUTENTICACIÓN Y CONTROL DE ACCESO BASADO EN ROLES (RBAC) & PERFILES
-- Migration: 20260913000000_auth_rbac_and_profiles.sql
-- ==============================================================================

-- 0. EXTENSIONES REQUERIDAS
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ==============================================================================
-- 1. TABLA PUBLIC.PROFILES (CREACIÓN / ALTERACIÓN IDEMPOTENTE)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
    email TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    full_name TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles 
    ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user',
    ADD COLUMN IF NOT EXISTS full_name TEXT,
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Asegurar restricción CHECK sobre role de forma idempotente
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
          AND conname = 'profiles_role_check'
    ) THEN
        ALTER TABLE public.profiles 
            ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'user'));
    END IF;
END $$;

-- Índice para optimizar consultas filtradas por rol
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- ==============================================================================
-- 2. FUNCIÓN Y TRIGGER HANDLE_NEW_USER() ACTUALIZADO
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
    v_full_name TEXT;
BEGIN
    -- 1. Extraer rol: se prioriza raw_app_meta_data, luego raw_user_meta_data, default 'user'
    v_role := COALESCE(
        NEW.raw_app_meta_data->>'role',
        NEW.raw_user_meta_data->>'role',
        'user'
    );
    
    -- Validar que el rol sea estrictamente válido
    IF v_role NOT IN ('admin', 'user') THEN
        v_role := 'user';
    END IF;

    -- 2. Extraer nombre completo desde los metadatos de usuario
    v_full_name := COALESCE(
        NEW.raw_user_meta_data->>'full_name',
        NEW.raw_user_meta_data->>'name',
        ''
    );

    -- 3. Insertar o actualizar registro en public.profiles
    INSERT INTO public.profiles (
        id,
        email,
        role,
        full_name,
        is_active,
        updated_at
    ) VALUES (
        NEW.id,
        COALESCE(NEW.email, ''),
        v_role,
        NULLIF(TRIM(v_full_name), ''),
        true,
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = EXCLUDED.role,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        is_active = EXCLUDED.is_active,
        updated_at = timezone('utc'::text, now());

    -- 4. Asegurar que auth.users.raw_app_meta_data contenga {"role": <role>} para emisión en JWT
    IF NEW.raw_app_meta_data IS NULL OR (NEW.raw_app_meta_data->>'role') IS DISTINCT FROM v_role THEN
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', v_role)
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

-- Recrear el trigger en auth.users de manera segura e idempotente
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 3. TRIGGER DE SINCRONIZACIÓN DE ROL: PROFILES -> AUTH.USERS
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.sync_profile_role_to_auth_user()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
        WHERE id = NEW.id
          AND (raw_app_meta_data->>'role' IS DISTINCT FROM NEW.role);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

DROP TRIGGER IF EXISTS on_profile_role_updated ON public.profiles;
CREATE TRIGGER on_profile_role_updated
    AFTER UPDATE OF role ON public.profiles
    FOR EACH ROW
    WHEN (OLD.role IS DISTINCT FROM NEW.role)
    EXECUTE FUNCTION public.sync_profile_role_to_auth_user();

-- Trigger auxiliar para actualizar automáticamente updated_at en public.profiles
CREATE OR REPLACE FUNCTION public.handle_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_profile_updated_at ON public.profiles;
CREATE TRIGGER on_profile_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_profile_updated_at();

-- Función y Trigger: Blindaje contra Escalación de Privilegios Vertical
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
        -- Permitir únicamente si la llamada proviene de un administrador autenticado o del service_role
        IF (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin') 
           AND (COALESCE(auth.role(), '') <> 'service_role') THEN
            RAISE EXCEPTION 'Acceso denegado: solo administradores o service_role pueden modificar el rol o estado de una cuenta.';
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

DROP TRIGGER IF EXISTS trg_prevent_profile_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_profile_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_profile_privilege_escalation();

-- ==============================================================================
-- 4. POLÍTICAS ROW LEVEL SECURITY (RLS) EN PUBLIC.PROFILES
-- ==============================================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Política: Los usuarios pueden consultar su propio perfil
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles 
    FOR SELECT 
    USING (auth.uid() = id);

-- Política: Los usuarios pueden actualizar su propio perfil
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles 
    FOR UPDATE 
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Política: Los administradores tienen acceso completo (SELECT, UPDATE, etc.) sobre todos los perfiles
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
CREATE POLICY "profiles_admin_all" ON public.profiles 
    FOR ALL 
    USING ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin')
    WITH CHECK ((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin');

-- ==============================================================================
-- 5. SEEDING / BOOTSTRAPPING DEL USUARIO ADMINISTRADOR INICIAL
-- ==============================================================================
DO $$
DECLARE
    v_admin_id UUID;
    v_encrypted_pw TEXT;
BEGIN
    -- 1. Verificar si ya existe el usuario admin@soma.local en auth.users
    SELECT id INTO v_admin_id 
    FROM auth.users 
    WHERE email = 'admin@soma.local';

    IF v_admin_id IS NULL THEN
        v_admin_id := gen_random_uuid();
        v_encrypted_pw := crypt('Admin123!#Soma', gen_salt('bf'));

        -- Crear usuario en auth.users
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            role,
            aud,
            confirmation_token,
            recovery_token,
            created_at,
            updated_at
        ) VALUES (
            v_admin_id,
            '00000000-0000-0000-0000-000000000000'::uuid,
            'admin@soma.local',
            v_encrypted_pw,
            now(),
            '{"provider":"email","providers":["email"],"role":"admin"}'::jsonb,
            '{"full_name":"Administrador SOMA"}'::jsonb,
            'authenticated',
            'authenticated',
            '',
            '',
            now(),
            now()
        );

        -- Vincular identidad para GoTrue (Supabase Auth) si la tabla auth.identities existe
        IF EXISTS (
            SELECT 1 FROM information_schema.tables 
            WHERE table_schema = 'auth' AND table_name = 'identities'
        ) THEN
            BEGIN
                INSERT INTO auth.identities (
                    id,
                    user_id,
                    identity_data,
                    provider,
                    last_sign_in_at,
                    created_at,
                    updated_at
                ) VALUES (
                    v_admin_id::text,
                    v_admin_id,
                    jsonb_build_object('sub', v_admin_id::text, 'email', 'admin@soma.local'),
                    'email',
                    now(),
                    now(),
                    now()
                ) ON CONFLICT DO NOTHING;
            EXCEPTION WHEN OTHERS THEN
                -- Compatibilidad con esquemas GoTrue que requieren provider_id
                BEGIN
                    EXECUTE $dyn$
                        INSERT INTO auth.identities (
                            id,
                            user_id,
                            identity_data,
                            provider,
                            provider_id,
                            last_sign_in_at,
                            created_at,
                            updated_at
                        ) VALUES (
                            $1,
                            $2,
                            jsonb_build_object('sub', $2::text, 'email', 'admin@soma.local'),
                            'email',
                            $2::text,
                            now(),
                            now(),
                            now()
                        ) ON CONFLICT DO NOTHING
                    $dyn$ USING gen_random_uuid()::text, v_admin_id;
                EXCEPTION WHEN OTHERS THEN
                    NULL;
                END;
            END;
        END IF;
    ELSE
        -- Si el usuario ya existía previamente, asegurar metadatos de admin en auth.users
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb,
            raw_user_meta_data = COALESCE(raw_user_meta_data, '{}'::jsonb) || '{"full_name":"Administrador SOMA"}'::jsonb,
            email_confirmed_at = COALESCE(email_confirmed_at, now()),
            updated_at = now()
        WHERE id = v_admin_id;
    END IF;

    -- 2. Asegurar que public.profiles contenga el registro con role = 'admin'
    INSERT INTO public.profiles (
        id,
        email,
        role,
        full_name,
        is_active,
        updated_at
    ) VALUES (
        v_admin_id,
        'admin@soma.local',
        'admin',
        'Administrador SOMA',
        true,
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        role = 'admin',
        full_name = EXCLUDED.full_name,
        is_active = true,
        updated_at = timezone('utc'::text, now());

    -- 3. Sincronizar cualquier usuario preexistente para asegurar que raw_app_meta_data contenga el claim 'role'
    UPDATE auth.users u
    SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
    FROM public.profiles p
    WHERE u.id = p.id
      AND (u.raw_app_meta_data IS NULL OR (u.raw_app_meta_data->>'role') IS DISTINCT FROM p.role);

END $$;
