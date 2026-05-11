-- ==============================================================================
-- MIGRAÇÃO SASI: 04_dados_clinicos_estruturados
-- OBJETIVO: Normalização de Sinais Vitais, Balanço Hídrico e Laboratório
-- ==============================================================================

-- 1. Criação da Tabela de Sinais Vitais (Série Temporal)
CREATE TABLE sinais_vitais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    data_hora_medicao TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Parâmetros Hemodinâmicos e Respiratórios (Fase 1)
    pas NUMERIC,          -- Pressão Arterial Sistólica (mmHg)
    pad NUMERIC,          -- Pressão Arterial Diastólica (mmHg)
    pam NUMERIC,          -- Pressão Arterial Média (mmHg)
    fc NUMERIC,           -- Frequência Cardíaca (bpm)
    fr NUMERIC,           -- Frequência Respiratória (rpm)
    spo2 NUMERIC,         -- Saturação de Oxigénio (%)
    tax NUMERIC,          -- Temperatura (ºC)
    glicemia NUMERIC,     -- Glicemia Capilar - Dx (mg/dl)
    
    -- Balanço Hídrico Simplificado
    ingesta_ml NUMERIC,
    diurese_ml NUMERIC,
    balanco_parcial NUMERIC,
    
    -- Auditoria
    observacoes TEXT,     -- Tags ou notas da enfermagem ("⚠️ Revisar")
    registado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Criação da Tabela de Exames Laboratoriais
CREATE TABLE exames_laboratoriais (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    paciente_id UUID NOT NULL REFERENCES pacientes(id) ON DELETE CASCADE,
    data_hora_coleta TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    
    -- Hematologia & Bioquímica Padrão
    hb NUMERIC,           -- Hemoglobina (g/dl)
    ht NUMERIC,           -- Hematócrito (%)
    plaq NUMERIC,         -- Plaquetas (x10^3/mm3)
    cr NUMERIC,           -- Creatinina (mg/dl)
    na NUMERIC,           -- Sódio (mEq/L)
    k NUMERIC,            -- Potássio (mEq/L)
    lactato NUMERIC,      -- Lactato (mmol/L)
    
    -- Payload flexível para exames não padronizados
    outros_exames JSONB DEFAULT '{}'::jsonb, 
    
    -- Auditoria
    registado_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para Performance (Otimização de Dashboards Clínicos)
CREATE INDEX idx_sinais_vitais_paciente_data ON sinais_vitais(paciente_id, data_hora_medicao DESC);
CREATE INDEX idx_exames_paciente_data ON exames_laboratoriais(paciente_id, data_hora_coleta DESC);

-- 4. Segurança ao Nível da Linha (Row Level Security - RLS)
ALTER TABLE sinais_vitais ENABLE ROW LEVEL SECURITY;
ALTER TABLE exames_laboratoriais ENABLE ROW LEVEL SECURITY;

-- Políticas de Acesso: Apenas utilizadores autenticados podem ver ou inserir dados
CREATE POLICY "Leitura de Sinais Vitais para utilizadores autenticados" 
    ON sinais_vitais FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Inserção de Sinais Vitais para utilizadores autenticados" 
    ON sinais_vitais FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Leitura de Exames para utilizadores autenticados" 
    ON exames_laboratoriais FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Inserção de Exames para utilizadores autenticados" 
    ON exames_laboratoriais FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

-- 5. Triggers de Atualização (updated_at)
CREATE TRIGGER update_sinais_vitais_updated_at
BEFORE UPDATE ON sinais_vitais
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_exames_updated_at
BEFORE UPDATE ON exames_laboratoriais
FOR EACH ROW EXECUTE FUNCTION update_modified_column();
