-- Supabase Schema: Comando UTI
-- Execute this in your Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

--------------------------------------------------------
-- 1. PATIENTS (Patient Summary)
--------------------------------------------------------
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    bed TEXT NOT NULL,
    uti TEXT NOT NULL,
    age INTEGER,
    admission_date DATE,
    diagnosis TEXT,
    allergies TEXT,
    active_problems TEXT[] DEFAULT '{}',
    plan TEXT[] DEFAULT '{}',
    pending_issues TEXT[] DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- 2. CLINICAL PARAMETERS (Daily / Shift Data)
--------------------------------------------------------
CREATE TABLE public.clinical_parameters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    recorded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Hemodinâmica
    heart_rate INTEGER,
    mean_arterial_pressure INTEGER,
    temperature NUMERIC,
    
    -- Respiratório
    spo2 INTEGER,
    respiratory_support TEXT, -- AA, O2, VNI, IOT, TOT
    fio2 NUMERIC,
    peep NUMERIC,
    
    -- Renal / Balanço
    urine_output_24h NUMERIC,
    fluid_balance_24h NUMERIC,
    
    -- Scores
    sofa_score INTEGER,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- 3. PRESCRIPTIONS (Meds, Antibiotics, DVAs, Sedation)
--------------------------------------------------------
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    
    drug_name TEXT NOT NULL,
    dose NUMERIC,
    unit TEXT,
    route TEXT,
    frequency TEXT,
    
    -- Tags
    is_dva BOOLEAN DEFAULT FALSE,
    is_sedation BOOLEAN DEFAULT FALSE,
    is_antibiotic BOOLEAN DEFAULT FALSE,
    antibiotic_day INTEGER,
    
    is_active BOOLEAN DEFAULT TRUE,
    prescribed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- 4. LAB RESULTS & EXAMS
--------------------------------------------------------
CREATE TABLE public.lab_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    collected_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Infecto
    leukocytes NUMERIC,
    crp NUMERIC, -- PCR
    procalcitonin NUMERIC,
    
    -- Renal
    creatinine NUMERIC,
    urea NUMERIC,
    
    -- Hemato / Perfusão
    hemoglobin NUMERIC,
    platelets NUMERIC,
    lactate NUMERIC,
    
    -- Gaso
    ph NUMERIC,
    pao2 NUMERIC,
    paco2 NUMERIC,
    hco3 NUMERIC,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

--------------------------------------------------------
-- RLS (Row Level Security) - Basic Setup
--------------------------------------------------------
-- For now, enabling anon access for fast dev. 
-- IN PRODUCTION: WE LOCK THIS DOWN TIGHT.
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_parameters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon select on patients" ON public.patients FOR SELECT TO anon USING (true);
CREATE POLICY "Allow anon insert on patients" ON public.patients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Allow anon update on patients" ON public.patients FOR UPDATE TO anon USING (true);
CREATE POLICY "Allow anon delete on patients" ON public.patients FOR DELETE TO anon USING (true);

CREATE POLICY "Allow anon all on clinical_parameters" ON public.clinical_parameters FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon all on prescriptions" ON public.prescriptions FOR ALL TO anon USING (true);
CREATE POLICY "Allow anon all on lab_results" ON public.lab_results FOR ALL TO anon USING (true);

-- Functions for updated_at
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_patients_modtime
    BEFORE UPDATE ON public.patients
    FOR EACH ROW
    EXECUTE FUNCTION update_modified_column();
