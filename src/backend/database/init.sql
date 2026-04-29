-- Gold Lock — Schema Inicial da Base de Dados
-- PostgreSQL 16

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ══════════════════════════════════════════
-- Tabela: users
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    preferences JSONB DEFAULT '{}',

    -- Verificação de email
    email_verified BOOLEAN NOT NULL DEFAULT false,
    email_verification_token UUID UNIQUE,
    email_verification_token_expires TIMESTAMP WITH TIME ZONE,

    -- Recuperação de password (token de uso único, expira em 1h)
    password_reset_token UUID UNIQUE,
    password_reset_expires TIMESTAMP WITH TIME ZONE,

    -- Autenticação de dois fatores (TOTP — compatível com Google Authenticator)
    totp_secret TEXT,       -- secret base32; deve ser cifrado em produção com chave do servidor
    totp_enabled BOOLEAN NOT NULL DEFAULT false,

    -- Open Banking (Salt Edge) — ID do customer criado na plataforma Salt Edge
    salt_edge_customer_id VARCHAR(255),

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_verification_token ON users(email_verification_token)
    WHERE email_verification_token IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(password_reset_token)
    WHERE password_reset_token IS NOT NULL;

-- ══════════════════════════════════════════
-- Tabela: bank_accounts
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bank_accounts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_name VARCHAR(255) NOT NULL,
    account_name VARCHAR(255),
    iban VARCHAR(34),
    salt_edge_connection_id VARCHAR(255),
    salt_edge_account_id VARCHAR(255),
    balance DECIMAL(15, 2) DEFAULT 0,
    currency VARCHAR(3) DEFAULT 'EUR',
    status VARCHAR(20) DEFAULT 'active',
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_bank_accounts_user ON bank_accounts(user_id);

-- ══════════════════════════════════════════
-- Tabela: categories
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL,
    name_pt VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    color VARCHAR(7),
    is_expense BOOLEAN DEFAULT true,
    irs_deduction_category VARCHAR(50),
    parent_id UUID REFERENCES categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id) WHERE parent_id IS NOT NULL;

-- Categorias predefinidas para o mercado PT
INSERT INTO categories (name, name_pt, icon, color, is_expense, irs_deduction_category) VALUES
    ('groceries', 'Supermercado', 'shopping-cart', '#4CAF50', true, NULL),
    ('restaurants', 'Restauração', 'utensils', '#FF9800', true, 'restauracao'),
    ('transport', 'Transportes', 'car', '#2196F3', true, 'transportes'),
    ('health', 'Saúde', 'heart-pulse', '#F44336', true, 'saude'),
    ('education', 'Educação', 'graduation-cap', '#9C27B0', true, 'educacao'),
    ('housing', 'Habitação', 'home', '#795548', true, 'habitacao'),
    ('utilities', 'Serviços (Água/Luz/Gás)', 'zap', '#607D8B', true, NULL),
    ('entertainment', 'Lazer', 'gamepad-2', '#E91E63', true, NULL),
    ('clothing', 'Vestuário', 'shirt', '#00BCD4', true, NULL),
    ('subscriptions', 'Subscrições', 'repeat', '#FF5722', true, NULL),
    ('salary', 'Salário', 'banknote', '#4CAF50', false, NULL),
    ('freelance', 'Trabalho Independente', 'briefcase', '#8BC34A', false, NULL),
    ('investments', 'Investimentos', 'trending-up', '#3F51B5', false, NULL),
    ('transfers', 'Transferências', 'arrow-left-right', '#9E9E9E', true, NULL),
    ('other', 'Outros', 'circle-dot', '#757575', true, NULL)
ON CONFLICT DO NOTHING;

-- ══════════════════════════════════════════
-- Tabela: transactions
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    bank_account_id UUID REFERENCES bank_accounts(id) ON DELETE SET NULL,
    category_id UUID REFERENCES categories(id),
    salt_edge_transaction_id VARCHAR(255),
    description TEXT NOT NULL,
    amount DECIMAL(15, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    transaction_date DATE NOT NULL,
    is_recurring BOOLEAN DEFAULT false,
    ml_confidence DECIMAL(5, 4),
    ml_categorized BOOLEAN DEFAULT false,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_transactions_account ON transactions(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, transaction_date DESC);

-- ══════════════════════════════════════════
-- Tabela: budgets
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    category_id UUID REFERENCES categories(id),
    name VARCHAR(255) NOT NULL,
    amount_limit DECIMAL(15, 2) NOT NULL,
    period VARCHAR(20) DEFAULT 'monthly',
    alert_threshold INT DEFAULT 80,
    start_date DATE NOT NULL,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_budgets_user ON budgets(user_id);

-- ══════════════════════════════════════════
-- Tabela: savings_goals
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS savings_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    target_amount DECIMAL(15, 2) NOT NULL,
    current_amount DECIMAL(15, 2) DEFAULT 0,
    deadline DATE,
    icon VARCHAR(50),
    color VARCHAR(7),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_savings_goals_user ON savings_goals(user_id);

-- ══════════════════════════════════════════
-- Tabela: irs_simulations
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS irs_simulations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tax_year INT NOT NULL,
    income_category VARCHAR(10) NOT NULL, -- 'A' ou 'B'
    gross_income DECIMAL(15, 2) NOT NULL,
    marital_status VARCHAR(20) DEFAULT 'single',
    dependents INT DEFAULT 0,
    deductions JSONB DEFAULT '{}',
    result JSONB NOT NULL, -- escalão, taxa, imposto, reembolso
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_irs_simulations_user ON irs_simulations(user_id);

-- ══════════════════════════════════════════
-- Função: atualizar updated_at automaticamente
-- ══════════════════════════════════════════
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ══════════════════════════════════════════
-- Tabela: fiscal_profile
-- Dados fiscais introduzidos manualmente pelo utilizador.
-- A API da Segurança Social Direta não é pública — o utilizador
-- insere os valores do seu recibo de vencimento ou IRS anterior.
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS fiscal_profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Rendimento (Categoria A — trabalho dependente)
    gross_income_annual DECIMAL(15, 2),         -- Rendimento bruto anual (€)
    social_security_contributions DECIMAL(15, 2), -- Contribuições SS (art.º 25.º CIRS; 11% trabalhador)

    -- Estado civil e dependentes (afetam escalões e deduções)
    marital_status VARCHAR(20) DEFAULT 'single'  -- 'single' | 'married' | 'divorced' | 'widowed'
        CHECK (marital_status IN ('single', 'married', 'divorced', 'widowed')),
    dependents INT DEFAULT 0 CHECK (dependents >= 0),
    disability_percentage INT DEFAULT 0          -- % de deficiência (≥60% dá benefícios fiscais)
        CHECK (disability_percentage BETWEEN 0 AND 100),

    -- Retenções na fonte (do recibo de vencimento)
    withholding_tax DECIMAL(15, 2) DEFAULT 0,   -- Total retido na fonte no ano

    -- Dedução PPR (art.º 21.º EBF — 20% das entregas, limite conforme escalão)
    ppr_contributions DECIMAL(15, 2) DEFAULT 0,

    -- Ano fiscal ao qual se referem os dados
    fiscal_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_fiscal_profile_user ON fiscal_profile(user_id);

-- ══════════════════════════════════════════
-- Tabela: deduction_alerts
-- Alertas gerados pelo classificador ML sobre despesas
-- potencialmente dedutíveis identificadas nas transações.
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS deduction_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    transaction_id UUID REFERENCES transactions(id) ON DELETE SET NULL,

    -- Tipo de dedução identificada pelo classificador ML
    deduction_type VARCHAR(50) NOT NULL
        CHECK (deduction_type IN (
            'saude_dedutivel',       -- art.º 78.º-C: 15%, limite 1.000€
            'educacao_dedutivel',    -- art.º 78.º-D: 30%, limite 800€
            'habitacao_dedutivel',   -- art.º 78.º-E: 15%, limite 296€
            'encargos_gerais_dedutivel', -- art.º 78.º-B: 35%, limite 250€
            'ppr_dedutivel',         -- art.º 21.º EBF: 20%, limites por escalão
            'nao_dedutivel'
        )),

    amount DECIMAL(15, 2) NOT NULL,             -- Montante da transação
    estimated_deduction DECIMAL(15, 2),          -- Dedução estimada (aplicando % e limites CIRS)
    ml_confidence DECIMAL(5, 4),                 -- Confiança do modelo (0.0 a 1.0)

    -- Estado do alerta
    status VARCHAR(20) DEFAULT 'pending'
        CHECK (status IN ('pending', 'confirmed', 'rejected')),
    user_confirmed_type VARCHAR(50),             -- Tipo confirmado/corrigido pelo utilizador

    -- Limites legais (para alertar quando próximos do teto)
    legal_limit DECIMAL(15, 2),                 -- Limite máximo de dedução CIRS para esta categoria
    cumulative_amount DECIMAL(15, 2) DEFAULT 0, -- Total acumulado nesta categoria no ano fiscal
    limit_reached BOOLEAN DEFAULT false,         -- true se cumulative_amount >= legal_limit

    fiscal_year INT NOT NULL DEFAULT EXTRACT(YEAR FROM NOW())::INT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_deduction_alerts_user ON deduction_alerts(user_id);
CREATE INDEX idx_deduction_alerts_type ON deduction_alerts(user_id, deduction_type, fiscal_year);
CREATE INDEX idx_deduction_alerts_status ON deduction_alerts(user_id, status)
    WHERE status = 'pending';

-- ══════════════════════════════════════════
-- Tabela: investments
-- Portfólio de investimentos do utilizador
-- ══════════════════════════════════════════
CREATE TABLE IF NOT EXISTS investments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    ticker VARCHAR(20),
    type VARCHAR(20) NOT NULL CHECK (type IN ('stock', 'etf', 'bond', 'crypto', 'certificado', 'deposito')),
    quantity DECIMAL(18, 8) NOT NULL,
    purchase_price DECIMAL(15, 4) NOT NULL,
    purchase_date DATE,
    currency VARCHAR(3) DEFAULT 'EUR',
    risk_level VARCHAR(20) DEFAULT 'moderate' CHECK (risk_level IN ('guaranteed', 'moderate', 'high')),
    institution VARCHAR(255),
    maturity_date DATE,
    annual_rate DECIMAL(6, 4),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_investments_user ON investments(user_id);
CREATE INDEX IF NOT EXISTS idx_investments_ticker ON investments(ticker) WHERE ticker IS NOT NULL;

-- Constraints de unicidade para Salt Edge (evitar duplicados em sync)
ALTER TABLE transactions ADD CONSTRAINT IF NOT EXISTS uq_transactions_salt_edge UNIQUE (salt_edge_transaction_id);
ALTER TABLE bank_accounts ADD CONSTRAINT IF NOT EXISTS uq_bank_accounts_salt_edge UNIQUE (salt_edge_account_id);

-- Triggers para updated_at (DROP IF EXISTS para ser idempotente)
DROP TRIGGER IF EXISTS trg_users_updated_at ON users;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_bank_accounts_updated_at ON bank_accounts;
CREATE TRIGGER trg_bank_accounts_updated_at BEFORE UPDATE ON bank_accounts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_transactions_updated_at ON transactions;
CREATE TRIGGER trg_transactions_updated_at BEFORE UPDATE ON transactions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_budgets_updated_at ON budgets;
CREATE TRIGGER trg_budgets_updated_at BEFORE UPDATE ON budgets FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_savings_goals_updated_at ON savings_goals;
CREATE TRIGGER trg_savings_goals_updated_at BEFORE UPDATE ON savings_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_fiscal_profile_updated_at ON fiscal_profile;
CREATE TRIGGER trg_fiscal_profile_updated_at BEFORE UPDATE ON fiscal_profile FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trg_investments_updated_at ON investments;
CREATE TRIGGER trg_investments_updated_at BEFORE UPDATE ON investments FOR EACH ROW EXECUTE FUNCTION update_updated_at();
