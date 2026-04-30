import { supabase } from './supabase';

/**
 * Adapter para mapear o estado JSON do React (App.jsx) para o esquema Relacional do Supabase.
 */

export const subscribeToPatients = (callback, errorCallback) => {
  // Para manter a reatividade, fazemos fetch inicial e depois um polling (ou real-time).
  // Como as queries envolvem múltiplas tabelas, faremos um fetch e depois ouviremos a tabela principal 'patients'.
  
  const fetchAll = async () => {
    try {
      // 1. Fetch Patients
      const { data: patientsData, error: errPts } = await supabase.from('patients').select('*');
      if (errPts) throw errPts;

      // 2. Fetch Latest Clinical Parameters
      const { data: clinicalData, error: errClin } = await supabase.from('clinical_parameters').select('*');
      if (errClin) throw errClin;

      // 3. Fetch Prescriptions
      const { data: prescriptionsData, error: errPresc } = await supabase.from('prescriptions').select('*').eq('is_active', true);
      if (errPresc) throw errPresc;

      // 4. Fetch Latest Lab Results
      const { data: labData, error: errLabs } = await supabase.from('lab_results').select('*');
      if (errLabs) throw errLabs;

      // Reconstruir o estado do React
      const loadedPts = patientsData.map(pt => {
        // Encontrar os mais recentes para este paciente
        const ptClin = clinicalData.filter(c => c.patient_id === pt.id).sort((a,b) => new Date(b.recorded_at) - new Date(a.recorded_at))[0] || {};
        const ptPresc = prescriptionsData.filter(p => p.patient_id === pt.id) || [];
        const ptLabs = labData.filter(l => l.patient_id === pt.id).sort((a,b) => new Date(b.collected_at) - new Date(a.collected_at))[0] || {};

        return {
          id: pt.id,
          uti: pt.uti,
          nome: pt.name,
          leito: pt.bed,
          hd: pt.diagnosis,
          adm: pt.admission_date,
          alergias: pt.allergies || '',
          peso: '', altura: '', gravidade: '', // Nao persistidos isoladamente
          
          impressao: pt.active_problems || ['', '', '', ''],
          conduta: pt.plan || ['', '', '', ''],
          pendencias: (pt.pending_issues || []).map(txt => ({ checked: false, text: txt })),

          // Dvas & Sedativos (from prescriptions)
          dvas: ptPresc.filter(p => p.is_dva).map(p => ({ droga: p.drug_name, dose: p.dose, running: true })),
          sedativos: ptPresc.filter(p => p.is_sedation).map(p => ({ droga: p.drug_name, dose: p.dose, running: true })),
          
          neuro: { escalas: [], pupilas: 'Isofotoreagentes, sem déficits focais', analgesia: '', camIcu: '', notas: '' },
          
          resp: { 
            suporte: ptClin.respiratory_support || '', 
            fio2O2: ptClin.fio2 || '', 
            vmPeep: ptClin.peep || '',
            spo2: ptClin.spo2 || '',
            dataIntubacao: '', vazaoO2: '', vmModo: '', vmFio2: '', vmVc: '', vmPinspPs: '', pao2: '', fr1: '', fr2: '', frX: '', spo2X: '', ausculta: '', notas: '' 
          },
          
          hemo: { 
            pas1: '', pas2: '', pasX180: '', pasX100: '', pad1: '', pad2: '', padX120: '', padX50: '', 
            pam1: ptClin.mean_arterial_pressure || '', pam2: '', pamX130: '', pamX65: '', 
            fc1: ptClin.heart_rate || '', fc2: '', fcX100: '', ausculta: 'BNF RR 2T SS.', pele: 'TEC < 3s | Extremidades quentes, bem perfundidas. MMII s/ edema s/ TVP.', notas: '' 
          },
          
          tgi: { dx: '', dxX180: '', abdome: 'Semi-globoso, flácido, RHA +, sem sinais de peritonite.', bb: '', viaDieta: '', vazaoDieta: '', dietaOutra: '', aceitacao: '', evacuou: '', evacuacoesNum: '', evacuacoesAspecto: '', evacuacoesDataUltima: '', notas: '' },
          
          renal: { 
            ur1: ptLabs.urea || '', ur2: '', ur3: '', 
            cr1: ptLabs.creatinine || '', cr2: '', cr3: '', 
            tipoDiurese: '', 
            diurese: ptClin.urine_output_24h || '', 
            diureseHoras: '24', 
            bh: ptClin.fluid_balance_24h || '', 
            mg: '', na: '', cai: '', k: '', notas: '' 
          },
          
          hemato: { 
            hb1: ptLabs.hemoglobin || '', ht1: '', 
            plaq1: ptLabs.platelets || '', 
            profilaxiaTvp: '', profilaxiaUlcera: '', notas: '' 
          },
          
          infecto: { 
            tmax: ptClin.temperature || '', tmaxX38: '', 
            atbs: ptPresc.filter(p => p.is_antibiotic).map(p => ({ nome: p.drug_name, dia: p.antibiotic_day })), 
            culturas: [], 
            leuco1: ptLabs.leukocytes || '', leuco2: '', leuco3: '', notas: '' 
          }
        };
      });

      callback(loadedPts);
    } catch (e) {
      errorCallback(e);
    }
  };

  fetchAll();

  // Polling a cada 10 segundos para simular realtime sem complicar subscrição de 4 tabelas
  const interval = setInterval(fetchAll, 10000);

  return () => clearInterval(interval);
};

export const savePatientToSupabase = async (p) => {
  try {
    // 1. Salvar na tabela Patients
    const { error: errPt } = await supabase.from('patients').upsert({
      id: p.id,
      name: p.nome || 'Sem Nome',
      bed: p.leito || '',
      uti: p.uti || 'UTI 2',
      admission_date: p.adm,
      diagnosis: p.hd || '',
      allergies: p.alergias || '',
      active_problems: p.impressao.filter(x => x),
      plan: p.conduta.filter(x => x),
      pending_issues: p.pendencias.filter(x => x.text).map(x => x.text)
    });
    if (errPt) throw errPt;

    // 2. Salvar Clinical Parameters
    const { error: errClin } = await supabase.from('clinical_parameters').insert({
      patient_id: p.id,
      heart_rate: p.hemo.fc1 || null,
      mean_arterial_pressure: p.hemo.pam1 || null,
      temperature: p.infecto.tmax || null,
      spo2: p.resp.spo2 || null,
      respiratory_support: p.resp.suporte || null,
      fio2: p.resp.fio2O2 || p.resp.vmFio2 || null,
      peep: p.resp.vmPeep || null,
      urine_output_24h: p.renal.diurese || null,
      fluid_balance_24h: p.renal.bh || null
    });
    if (errClin) throw errClin;

    // 3. Salvar Prescriptions
    // Deletar anteriores ativas para este paciente
    await supabase.from('prescriptions').delete().eq('patient_id', p.id);
    
    const prescriptionsToInsert = [];
    if (p.dvas) {
      p.dvas.forEach(d => {
        if (d.droga) prescriptionsToInsert.push({ patient_id: p.id, drug_name: d.droga, dose: d.dose, is_dva: true });
      });
    }
    if (p.sedativos) {
      p.sedativos.forEach(s => {
        if (s.droga) prescriptionsToInsert.push({ patient_id: p.id, drug_name: s.droga, dose: s.dose, is_sedation: true });
      });
    }
    if (p.infecto && p.infecto.atbs) {
      p.infecto.atbs.forEach(a => {
        if (a.nome) prescriptionsToInsert.push({ patient_id: p.id, drug_name: a.nome, antibiotic_day: a.dia, is_antibiotic: true });
      });
    }

    if (prescriptionsToInsert.length > 0) {
      const { error: errPresc } = await supabase.from('prescriptions').insert(prescriptionsToInsert);
      if (errPresc) throw errPresc;
    }

    // 4. Salvar Labs
    const { error: errLab } = await supabase.from('lab_results').insert({
      patient_id: p.id,
      leukocytes: p.infecto.leuco1 || null,
      creatinine: p.renal.cr1 || null,
      urea: p.renal.ur1 || null,
      hemoglobin: p.hemato.hb1 || null,
      platelets: p.hemato.plaq1 || null
    });
    if (errLab) throw errLab;

  } catch (error) {
    console.error("Erro ao salvar no Supabase:", error);
    throw error;
  }
};

export const deletePatientFromSupabase = async (id) => {
  const { error } = await supabase.from('patients').delete().eq('id', id);
  if (error) throw error;
};
