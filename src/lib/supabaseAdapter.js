import { supabase } from './supabaseClient';

export const supabaseAdapter = {
  /**
   * 1. LER DADOS: Busca o paciente e os seus históricos mais recentes
   */
  async getPatientData(patientId) {
    try {
      // Usamos a sintaxe de join do Supabase para buscar tudo numa só query
      const { data: paciente, error: patientError } = await supabase
        .from('pacientes')
        .select(`
          *,
          sinais_vitais (*),
          exames_laboratoriais (*)
        `)
        .eq('id', patientId)
        .order('data_hora_medicao', { referencedTable: 'sinais_vitais', ascending: false })
        .order('data_hora_coleta', { referencedTable: 'exames_laboratoriais', ascending: false })
        .single();

      if (patientError) throw patientError;

      // Transformar os dados relacionais do BD de volta para o objeto unificado do React
      return this._mapToUI(paciente);
    } catch (error) {
      console.error('Erro ao buscar dados normalizados:', error);
      throw error;
    }
  },

  /**
   * 2. GUARDAR DADOS: Separa o objeto da interface nas tabelas correspondentes
   */
  async savePatientData(patientId, uiData) {
    try {
      // Passo A: O adaptador divide a "Ficha Completa" em partes (Payloads)
      const vitalsPayload = this._extractVitals(patientId, uiData);
      const labsPayload = this._extractLabs(patientId, uiData);
      
      // Passo B: Inserir Sinais Vitais (Cria um novo ponto no gráfico / time-series)
      // Só insere se houver dados além do próprio ID
      if (Object.keys(vitalsPayload).length > 1) { 
        const { error: vitalsError } = await supabase
          .from('sinais_vitais')
          .insert([vitalsPayload]);
        
        if (vitalsError) throw vitalsError;
      }

      // Passo C: Inserir Exames Laboratoriais
      if (Object.keys(labsPayload).length > 2) { // > 2 porque tem paciente_id e outros_exames
        const { error: labsError } = await supabase
          .from('exames_laboratoriais')
          .insert([labsPayload]);
          
        if (labsError) throw labsError;
      }

      return { success: true };
    } catch (error) {
      console.error('Erro ao guardar dados clínicos:', error);
      throw error; // Deixa o erro subir para a UI exibir o Toast vermelho
    }
  },

  /**
   * ------------------------------------------------------------------
   * MÉTODOS PRIVADOS DE MAPEAMENTO (O Core do Adaptador)
   * ------------------------------------------------------------------
   */

  _extractVitals(patientId, uiData) {
    // Converte os nomes camelCase da UI para snake_case do SQL
    return {
      paciente_id: patientId,
      pas: uiData.sinaisVitais?.pas || null,
      pad: uiData.sinaisVitais?.pad || null,
      pam: uiData.sinaisVitais?.pam || null,
      fc: uiData.sinaisVitais?.fc || null,
      fr: uiData.sinaisVitais?.fr || null,
      spo2: uiData.sinaisVitais?.spo2 || null,
      tax: uiData.sinaisVitais?.tax || null,
      glicemia: uiData.sinaisVitais?.glicemia || null,
      ingesta_ml: uiData.balancoHidrico?.ingesta || null,
      diurese_ml: uiData.balancoHidrico?.diurese || null,
      observacoes: uiData.observacoes || ''
    };
  },

  _extractLabs(patientId, uiData) {
    const colunasOficiais = ['hb', 'ht', 'plaq', 'cr', 'na', 'k', 'lactato'];
    
    const payload = {
      paciente_id: patientId,
      outros_exames: {} // O nosso "colete salva-vidas" JSONB para exames não previstos
    };

    if (!uiData.exames) return payload;

    // Roteamento inteligente de exames
    Object.keys(uiData.exames).forEach(exameKey => {
      const chaveSql = exameKey.toLowerCase();
      
      if (colunasOficiais.includes(chaveSql)) {
        // Se for um exame padrão, vai para a sua própria coluna
        payload[chaveSql] = uiData.exames[exameKey];
      } else {
        // Se for um exame diferente (ex: 'procalcitonina'), guarda no JSONB
        payload.outros_exames[exameKey] = uiData.exames[exameKey];
      }
    });

    return payload;
  },

  _mapToUI(dbData) {
    // Como pedimos ordenado por data descendente, o índice [0] é o mais atual
    const latestVitals = dbData.sinais_vitais?.[0] || {};
    const latestLabs = dbData.exames_laboratoriais?.[0] || {};

    return {
      id: dbData.id,
      nome: dbData.nome, // Vem da tabela de pacientes
      sinaisVitais: {
        pas: latestVitals.pas,
        pad: latestVitals.pad,
        pam: latestVitals.pam,
        fc: latestVitals.fc,
        fr: latestVitals.fr,
        spo2: latestVitals.spo2,
        tax: latestVitals.tax,
        glicemia: latestVitals.glicemia,
      },
      exames: {
        hb: latestLabs.hb,
        ht: latestLabs.ht,
        cr: latestLabs.cr,
        lactato: latestLabs.lactato,
        // O operador "spread" (...) retira os exames raros do JSONB e
        // mistura-os de volta com os exames normais de forma transparente para a UI!
        ...(latestLabs.outros_exames || {}) 
      },
      balancoHidrico: {
        ingesta: latestVitals.ingesta_ml,
        diurese: latestVitals.diurese_ml
      }
    };
  }
};
