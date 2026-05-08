// ============================================================================
// SASI · exportText.ts — Gera texto formatado de Passagem de Turno
// Modelo baseado no APP Gemini (G.Goggins) com template clínico estruturado
// ============================================================================
import type { Paciente, Evolucao, Pendencia } from './supabaseClient';

type R = Record<string, unknown>;

function v(obj: R | null | undefined, ...keys: string[]): string {
  if (!obj) return '___';
  for (const k of keys) {
    const val = obj[k];
    if (val != null && val !== '') return String(val);
  }
  return '___';
}

function n(obj: R | null | undefined, ...keys: string[]): number | null {
  if (!obj) return null;
  for (const k of keys) {
    const val = obj[k];
    if (val != null && val !== '') {
      const num = typeof val === 'string' ? parseFloat(val.replace(',', '.')) : Number(val);
      if (!Number.isNaN(num)) return num;
    }
  }
  return null;
}

function calcDiureseEfetiva(diurese: number | null, peso: number | null | undefined, horas = 24): string {
  if (diurese == null || !peso) return '___';
  const ef = diurese / peso / horas;
  return ef.toFixed(2);
}

function formatInfusoes(arr: unknown[]): string {
  if (!Array.isArray(arr) || arr.length === 0) return 'Nenhuma';
  return arr.map(item => {
    if (typeof item === 'string') return item;
    const o = item as R;
    if (!o.droga) return '';
    const vazao = o.vazao ? ` - Vazão: ${o.vazao} ml/h` : '';
    return `${o.droga}${vazao}`;
  }).filter(Boolean).join('\n');
}

export function generatePassagemTurno(
  pac: Paciente,
  evol: Evolucao | null,
  pendencias: Pendencia[],
): string {
  const hemo = (evol?.hemo ?? {}) as R;
  const resp = (evol?.resp ?? {}) as R;
  const neuro = (evol?.neuro ?? {}) as R;
  const tgi = (evol?.tgi ?? {}) as R;
  const renal = (evol?.renal ?? {}) as R;
  const hemato = (evol?.hemato ?? {}) as R;
  const infecto = (evol?.infecto ?? {}) as R;

  const dvas = (evol?.dvas ?? []) as unknown[];
  const sedativos = (evol?.sedativos ?? []) as unknown[];
  const impressao = (evol?.impressao ?? []) as string[];
  const conduta = (evol?.conduta ?? []) as string[];

  const diasInternacao = Math.floor(
    (Date.now() - new Date(pac.data_adm).getTime()) / 86400000
  );

  // Vitals
  const pas = v(hemo, 'pas', 'pas_max');
  const pas_min = v(hemo, 'pas_min', 'pas');
  const pad = v(hemo, 'pad', 'pad_max');
  const pad_min = v(hemo, 'pad_min', 'pad');
  const pam = v(hemo, 'pam', 'pam_media', 'pam_max');
  const pam_min = v(hemo, 'pam_min', 'pam');
  const fc = v(hemo, 'fc', 'fc_max');
  const fc_min = v(hemo, 'fc_min', 'fc');
  const fr = v(resp, 'fr', 'fr_total');
  const fr_min = v(resp, 'fr_min', 'fr');
  const spo2 = v(resp, 'spo2');
  const tmax = v(infecto, 'tmax', 'temperatura', 'temp');
  const dx = v(tgi, 'dx', 'glicemia');
  const diurese = v(renal, 'diurese', 'diurese_24h');
  const bh = v(renal, 'bh', 'balanco_hidrico');

  // Labs
  const ur1 = v(renal, 'ureia', 'ur', 'ur1');
  const ur2 = v(renal, 'ur2', 'ureia_prev');
  const ur3 = v(renal, 'ur3');
  const cr1 = v(renal, 'creatinina', 'cr', 'cr1');
  const cr2 = v(renal, 'cr2', 'creatinina_prev');
  const cr3 = v(renal, 'cr3');
  const hb1 = v(hemato, 'hb', 'hemoglobina', 'hb1');
  const hb2 = v(hemato, 'hb2', 'hb_prev');
  const hb3 = v(hemato, 'hb3');
  const ht1 = v(hemato, 'ht', 'hematocrito', 'ht1');
  const ht2 = v(hemato, 'ht2', 'ht_prev');
  const ht3 = v(hemato, 'ht3');
  const plaq1 = v(hemato, 'plaquetas', 'plaq', 'plaq1');
  const plaq2 = v(hemato, 'plaq2', 'plaquetas_prev');
  const plaq3 = v(hemato, 'plaq3');
  const leuco1 = v(hemato, 'leucocitos', 'leuco', 'leuco1');
  const leuco2 = v(hemato, 'leuco2', 'leucocitos_prev');
  const leuco3 = v(hemato, 'leuco3');
  const mg = v(renal, 'mg');
  const na = v(renal, 'na', 'sodio');
  const cai = v(renal, 'ca', 'cai');
  const k = v(renal, 'k', 'potassio');

  // Neuro
  const glasgow = v(neuro, 'glasgow', 'ecg');
  const rass = v(neuro, 'rass');
  const pupilas = v(neuro, 'pupilas', 'pupilas_dir');
  const analgesia = v(neuro, 'analgesia', 'sedacao_meta');
  const camIcu = neuro.cam_icu ?? neuro.delirium_cam ?? neuro.camIcu;
  const camText = camIcu === 'Positivo' || camIcu === true
    ? '[X] Positivo | [ ] Negativo'
    : camIcu === 'Negativo' || camIcu === false
    ? '[ ] Positivo | [X] Negativo'
    : '[ ] Positivo | [ ] Negativo';

  // Resp
  const ausculta = v(resp, 'ausculta');
  const auscOpts = [
    'MV + BIlateralmente, SRA',
    'MV + Bilateralmente, creptações bibasais',
    'MV + Bilateralemtente, reduzido globalmente, sra',
    'MV + Bilateralmente, Roncos difusos',
    'MV + BIlateralmente, com Sibilos',
  ];
  const auscLines = auscOpts.map(opt => {
    const match = ausculta !== '___' && ausculta.toLowerCase().includes(opt.substring(4, 20).toLowerCase());
    return `${match ? '[X]' : '[ ]'}  \`${opt}\``;
  }).join('\n');

  // Hemo
  const auscCardio = v(hemo, 'ausculta', 'ausculta_cardiaca');
  const pele = v(hemo, 'pele', 'extremidades');

  // TGI
  const dieta = v(tgi, 'dieta_tipo', 'dieta');
  const aceitacao = v(tgi, 'dieta_aceitacao', 'aceitacao');
  const evacuacao = v(tgi, 'evacuacao', 'evacuacoes');
  const abdome = v(tgi, 'abdome');

  // Infecto
  const atb = v(infecto, 'atb_atual', 'atb');
  const diaAtb = v(infecto, 'dia_atb');
  const culturas = v(infecto, 'culturas', 'culturas_pendentes');
  const pcr = v(infecto, 'pcr');
  const pct = v(infecto, 'procalcitonina', 'pct');

  // Hemato profilaxias
  const profTvp = v(hemato, 'profilaxia_tvp');
  const profUlcera = v(infecto, 'profilaxia_ulcera');
  const profs = [profTvp, profUlcera].filter(p => p !== '___').join(' + ') || '___';

  // Diurese efetiva
  const diureseNum = n(renal, 'diurese', 'diurese_24h');
  const diureseEf = calcDiureseEfetiva(diureseNum, pac.peso);

  // Impressão
  const impressaoText = impressao.length > 0
    ? impressao.map((item, i) => `${i + 1}. ${item || '------------------------------'}`).join('\n')
    : '------------------------------\n------------------------------\n------------------------------';

  // Conduta
  const condutaText = conduta.length > 0
    ? conduta.map((item, i) => `${i + 1}. ${item || '------------------------------'}`).join('\n')
    : '------------------------------\n------------------------------\n------------------------------';

  // Pendências
  const pendText = pendencias.length > 0
    ? pendencias.map(p => `[${p.concluida ? 'X' : ' '}] ${p.tarefa || '------------------------------'}`).join('\n')
    : '[ ] ------------------------------\n[ ] ------------------------------\n[ ] ------------------------------';

  return `# PASSAGEM DE TURNO - UCI

## ${pac.uti}

Leito ${pac.leito} - ${pac.nome}
HD: ${pac.hd || '___'} | Adm: ${new Date(pac.data_adm).toLocaleDateString('pt-BR')} (D${diasInternacao})
Peso: ${pac.peso || '___'} kg | Idade: ${pac.idade || '___'} a | Gravidade: ${pac.gravidade}
Alergias: ${pac.alergias || 'Nega'}

- Infusões:
DVA: ${formatInfusoes(dvas)}
Sedação: ${formatInfusoes(sedativos)}

Sinais vitais últimas 24 hrs:
PAS: ${pas_min} - ${pas} mmHg
PAD: ${pad_min} - ${pad} mmHg
PAm: ${pam_min} - ${pam} mmHg
FC: ${fc_min} - ${fc} Bpm
FR: ${fr_min} - ${fr} Ipm // SpO2: ${spo2} % aa
Tmax: ${tmax} °C // DX: ${dx} mg/dL
Dieta: ${dieta}, ${aceitacao} aceitação | Evacuações: ${evacuacao}
Diurese: ${diurese} ml // BH: ${bh} ml

Avaliação estruturada por Sistemas (Sinais vitais, laboratório e exame físico):
- Neurológico:
ECG - ${glasgow} | RASS - ${rass}
Pupilas: ${pupilas}
Analgesia: ${analgesia}
CAM - ICU: ${camText}

- Respiratório:
FR: ${fr_min} - ${fr} Ipm // SpO2: ${spo2} % aa
Ausculta pulmonar:
${auscLines}

- Hemodinâmico:
PAS: ${pas_min} - ${pas} mmHg
PAD: ${pad_min} - ${pad} mmHg
PAm: ${pam_min} - ${pam} mmHg
FC: ${fc_min} - ${fc} Bpm
Ausculta: ${auscCardio}
Pele Pulso e Extremidades:
${pele}

- TGI / Nutrição: Dieta: ${dieta}, ${aceitacao} aceitação | DX: ${dx} mg/dL | Evacuações: ${evacuacao} | Abdome: ${abdome}

- Renal / Metab.:
Ur: ${ur1} > ${ur2} > ${ur3} mg/dL
CR: ${cr1} > ${cr2} > ${cr3} mg/dL
Diurese: ${diurese} ml | BH ${bh} ml => Diurese efetiva: ${diureseEf} ml/kg/hr
Eletrólitos: Mg: ${mg} / Na: ${na} / Cai: ${cai} / K: ${k}

- Hemato:
Hb: ${hb1} > ${hb2} > ${hb3} g/dL
HT: ${ht1} > ${ht2} > ${ht3} %
Plaquetas: ${plaq1} > ${plaq2} > ${plaq3} /µL
Profilaxias: ${profs}

- Infecto:
Tmax: ${tmax} °C | ATB: D${diaAtb} ${atb} | Culturas: ${culturas}
Leucócitos: ${leuco1} > ${leuco2} > ${leuco3} /µL | PCR: ${pcr} | PCT: ${pct}

Impressão clínica / Problemas ativos
${impressaoText}

Conduta/Plano 12–24 hrs
${condutaText}

Pendências / Riscos e Contingências
${pendText}

---
`;
}

export function generateAllPassagens(
  patients: { pac: Paciente; evol: Evolucao | null; pend: Pendencia[] }[],
): string {
  const header = `# PASSAGEM DE TURNO - UCI\n# ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
  const body = patients
    .map(({ pac, evol, pend }) => generatePassagemTurno(pac, evol, pend))
    .join('\n\n=========================================================\n\n');
  return header + body;
}
