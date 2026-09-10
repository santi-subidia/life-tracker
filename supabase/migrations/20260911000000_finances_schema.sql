-- ==============================================================================
-- FASE 6: FINANZAS PERSONALES (CUENTAS, CATEGORÍAS, TRANSACCIONES Y PRESUPUESTOS)
-- Migration: 20260911000000_finances_schema.sql
-- ==============================================================================

-- 1. ACTUALIZAR RESTRICCIÓN CHECK EN TIMELINE_ITEMS PARA SOPORTAR 'finances'
ALTER TABLE public.timeline_items DROP CONSTRAINT IF EXISTS timeline_items_source_module_check;
ALTER TABLE public.timeline_items ADD CONSTRAINT timeline_items_source_module_check 
    CHECK (source_module IN ('health', 'habits', 'academics', 'work', 'notes', 'system', 'finances'));

-- ==============================================================================
-- 2. CUENTAS FINANCIERAS (public.financial_accounts)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.financial_accounts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    account_type TEXT NOT NULL CHECK (account_type IN ('cash', 'bank', 'digital_wallet', 'crypto', 'other')),
    currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD', 'EUR', 'BTC', 'USDT')),
    initial_balance NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
    current_balance NUMERIC(14,2) DEFAULT 0.00 NOT NULL,
    color TEXT DEFAULT 'emerald' NOT NULL,
    icon TEXT DEFAULT 'wallet' NOT NULL,
    is_archived BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_accounts_user ON public.financial_accounts(user_id);

ALTER TABLE public.financial_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fin_accounts_all_own" ON public.financial_accounts;
CREATE POLICY "fin_accounts_all_own" ON public.financial_accounts FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 3. CATEGORÍAS DE TRANSACCIONES (public.transaction_categories)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transaction_categories (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'both')),
    color TEXT DEFAULT 'zinc' NOT NULL,
    icon TEXT DEFAULT 'tag' NOT NULL,
    is_system BOOLEAN DEFAULT false NOT NULL,
    display_order INT DEFAULT 0 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_categories_user ON public.transaction_categories(user_id);

ALTER TABLE public.transaction_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fin_categories_all_own" ON public.transaction_categories;
CREATE POLICY "fin_categories_all_own" ON public.transaction_categories FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 4. TRANSACCIONES Y MOVIMIENTOS (public.transactions)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT NOT NULL,
    destination_account_id UUID REFERENCES public.financial_accounts(id) ON DELETE RESTRICT,
    category_id UUID REFERENCES public.transaction_categories(id) ON DELETE SET NULL,
    type TEXT NOT NULL CHECK (type IN ('expense', 'income', 'transfer')),
    amount NUMERIC(14,2) NOT NULL CHECK (amount > 0),
    destination_amount NUMERIC(14,2) CHECK (destination_amount IS NULL OR destination_amount > 0),
    exchange_rate NUMERIC(14,4),
    date DATE NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    description TEXT NOT NULL,
    notes TEXT,
    tags TEXT[] DEFAULT '{}'::text[] NOT NULL,
    is_cleared BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fin_tx_user_date ON public.transactions(user_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_fin_tx_account ON public.transactions(account_id);
CREATE INDEX IF NOT EXISTS idx_fin_tx_category ON public.transactions(category_id);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fin_tx_all_own" ON public.transactions;
CREATE POLICY "fin_tx_all_own" ON public.transactions FOR ALL USING (auth.uid() = user_id);

-- ==============================================================================
-- 5. PRESUPUESTOS MENSUALES (public.budgets)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    category_id UUID REFERENCES public.transaction_categories(id) ON DELETE CASCADE,
    month SMALLINT NOT NULL CHECK (month BETWEEN 1 AND 12),
    year SMALLINT NOT NULL CHECK (year BETWEEN 2020 AND 2100),
    limit_amount NUMERIC(14,2) NOT NULL CHECK (limit_amount > 0),
    currency TEXT NOT NULL CHECK (currency IN ('ARS', 'USD')),
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (user_id, category_id, month, year, currency)
);

CREATE INDEX IF NOT EXISTS idx_fin_budgets_user_period ON public.budgets(user_id, year, month);

ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "fin_budgets_all_own" ON public.budgets;
CREATE POLICY "fin_budgets_all_own" ON public.budgets FOR ALL USING (auth.uid() = user_id);
