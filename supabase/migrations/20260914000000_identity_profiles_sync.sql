-- ==============================================================================
-- INTEGRIDAD REFERENCIAL Y SINCRONIZACIÓN ASP.NET CORE IDENTITY & PROFILES
-- Migration: 20260914000000_identity_profiles_sync.sql
-- ==============================================================================

-- 1. Eliminación de cualquier constraint foráneo a auth.users en public.profiles
DO $$
DECLARE
    r RECORD;
BEGIN
    -- Eliminar constraint explícito si existe
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conrelid = 'public.profiles'::regclass 
          AND conname = 'profiles_id_fkey'
    ) THEN
        ALTER TABLE public.profiles DROP CONSTRAINT profiles_id_fkey;
    END IF;

    -- Eliminar cualquier otro foreign key constraint en profiles que apunte a auth.users
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'auth' AND table_name = 'users'
    ) THEN
        FOR r IN (
            SELECT c.conname
            FROM pg_constraint c
            JOIN pg_namespace n ON n.oid = c.connamespace
            WHERE n.nspname = 'public'
              AND c.conrelid = 'public.profiles'::regclass
              AND c.contype = 'f'
              AND c.confrelid = 'auth.users'::regclass
        ) LOOP
            EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS %I', r.conname);
        END LOOP;
    END IF;
END $$;

-- 2. Creación de public.profiles si no existe con clave primaria id UUID
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID NOT NULL PRIMARY KEY,
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
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL;

-- Restricción CHECK de roles soportados
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

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- Ajuste de protección de escalación de privilegios para permitir operaciones de ASP.NET Core Identity
CREATE OR REPLACE FUNCTION public.prevent_profile_privilege_escalation()
RETURNS TRIGGER AS $$
BEGIN
    -- Si la consulta proviene de PostgREST / Supabase Client (donde auth.role() no es null ni service_role/postgres)
    IF auth.role() IS NOT NULL AND auth.role() NOT IN ('service_role', 'postgres', 'supabase_admin') THEN
        IF (NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active) THEN
            IF (COALESCE(auth.jwt() -> 'app_metadata' ->> 'role', '') <> 'admin') THEN
                RAISE EXCEPTION 'Acceso denegado: solo administradores o service_role pueden modificar el rol o estado de una cuenta.';
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, auth, extensions, pg_temp;

-- 3. Función y trigger sync_aspnetusers_to_profiles()
CREATE OR REPLACE FUNCTION public.sync_aspnetusers_to_profiles()
RETURNS TRIGGER AS $$
DECLARE
    v_role TEXT;
BEGIN
    -- Obtener rol desde AspNetUserRoles si ya fue asignado, o conservar el de profiles si existe
    SELECT r."Name" INTO v_role
    FROM "AspNetUserRoles" ur
    JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
    WHERE ur."UserId" = NEW."Id"
    ORDER BY CASE WHEN lower(r."Name") = 'admin' THEN 1 ELSE 2 END
    LIMIT 1;

    IF v_role IS NULL THEN
        SELECT role INTO v_role FROM public.profiles WHERE id = NEW."Id";
    END IF;

    IF v_role IS NULL OR lower(v_role) NOT IN ('admin', 'user') THEN
        v_role := 'user';
    ELSE
        v_role := lower(v_role);
    END IF;

    INSERT INTO public.profiles (
        id,
        email,
        role,
        full_name,
        is_active,
        created_at,
        updated_at
    ) VALUES (
        NEW."Id",
        COALESCE(NEW."Email", ''),
        v_role,
        NEW."FullName",
        COALESCE(NEW."IsActive", true),
        COALESCE(NEW."CreatedAt", timezone('utc'::text, now())),
        timezone('utc'::text, now())
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = EXCLUDED.full_name,
        is_active = EXCLUDED.is_active,
        updated_at = timezone('utc'::text, now());

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_aspnetusers_to_profiles ON "AspNetUsers";
CREATE TRIGGER trg_sync_aspnetusers_to_profiles
    AFTER INSERT OR UPDATE ON "AspNetUsers"
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_aspnetusers_to_profiles();

-- 4. Función y trigger sync_aspnetuserroles_to_profiles()
CREATE OR REPLACE FUNCTION public.sync_aspnetuserroles_to_profiles()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_role_name TEXT;
    v_target_role TEXT;
BEGIN
    IF TG_OP = 'DELETE' THEN
        v_user_id := OLD."UserId";
    ELSE
        v_user_id := NEW."UserId";
    END IF;

    -- Obtener rol con mayor prioridad ('admin' sobre 'user')
    SELECT r."Name" INTO v_role_name
    FROM "AspNetUserRoles" ur
    JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
    WHERE ur."UserId" = v_user_id
    ORDER BY CASE WHEN lower(r."Name") = 'admin' THEN 1 ELSE 2 END
    LIMIT 1;

    IF lower(COALESCE(v_role_name, '')) = 'admin' THEN
        v_target_role := 'admin';
    ELSE
        v_target_role := 'user';
    END IF;

    UPDATE public.profiles
    SET role = v_target_role,
        updated_at = timezone('utc'::text, now())
    WHERE id = v_user_id;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_aspnetuserroles_to_profiles ON "AspNetUserRoles";
CREATE TRIGGER trg_sync_aspnetuserroles_to_profiles
    AFTER INSERT OR UPDATE OR DELETE ON "AspNetUserRoles"
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_aspnetuserroles_to_profiles();

-- 5. Sincronización inicial idempotente de usuarios existentes
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'AspNetUsers') THEN
        INSERT INTO public.profiles (
            id,
            email,
            role,
            full_name,
            is_active,
            created_at,
            updated_at
        )
        SELECT 
            u."Id",
            COALESCE(u."Email", ''),
            COALESCE(
                (SELECT CASE WHEN lower(r."Name") = 'admin' THEN 'admin' ELSE 'user' END
                 FROM "AspNetUserRoles" ur
                 JOIN "AspNetRoles" r ON ur."RoleId" = r."Id"
                 WHERE ur."UserId" = u."Id"
                 ORDER BY CASE WHEN lower(r."Name") = 'admin' THEN 1 ELSE 2 END
                 LIMIT 1),
                'user'
            ) AS role,
            u."FullName",
            COALESCE(u."IsActive", true),
            COALESCE(u."CreatedAt", timezone('utc'::text, now())),
            COALESCE(u."UpdatedAt", timezone('utc'::text, now()))
        FROM "AspNetUsers" u
        ON CONFLICT (id) DO UPDATE SET
            email = EXCLUDED.email,
            role = EXCLUDED.role,
            full_name = EXCLUDED.full_name,
            is_active = EXCLUDED.is_active,
            updated_at = timezone('utc'::text, now());
    END IF;
END $$;
