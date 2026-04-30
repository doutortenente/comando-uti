import React, { useState, useEffect } from 'react';
import { subscribeToPatients, savePatientToSupabase, deletePatientFromSupabase } from './lib/supabaseAdapter';
import {
  Printer, Copy, Activity, Brain, Wind, HeartPulse, Utensils, Droplets, TestTube, Bug,
  AlertCircle, ListChecks, ShieldAlert, Pill, Plus, Trash2, MessageSquareText, AlertTriangle,
  ChevronDown, ChevronUp, ClipboardList, Syringe, Microscope, Clipboard, Beaker, Users,
  UserPlus, ArrowLeft, Settings, Moon, Sun, Wand2, CheckCircle2, Calculator, Flame,
  Cloud, CloudOff, Download
} from 'lucide-react';

// ==========================================
// CONFIGURAÇÃO SUPABASE (NUVEM TÁTICA)
// ==========================================
// A instância do Supabase é importada de src/lib/supabase.js

// ==========================================
// DICIONÁRIOS E CONSTANTES CLÍNICAS
// ==========================================
const DVA_DICT = {
  'Noradrenalina': { diluicoes: [{ label: 'Padrão (16mg/250ml - 64mcg/ml)', factor: 64, type: 'mcg/kg/min' }, { label: 'Simples (8mg/250ml - 32mcg/ml)', factor: 32, type: 'mcg/kg/min' }, { label: 'Concentrada (32mg/250ml - 128mcg/ml)', factor: 128, type: 'mcg/kg/min' }], min: 0.01, max: 2.0 },
  'Adrenalina': { diluicoes: [{ label: 'Padrão (16mg/250ml - 64mcg/ml)', factor: 64, type: 'mcg/kg/min' }], min: 0.01, max: 2.0 },
  'Dobutamina': { diluicoes: [{ label: 'Padrão (250mg/250ml - 1000mcg/ml)', factor: 1000, type: 'mcg/kg/min' }], min: 2.0, max: 20.0 },
  'Vasopressina': { diluicoes: [{ label: 'Padrão (20U/100ml - 0.2U/ml)', factor: 0.2, type: 'U/min' }], min: 0.01, max: 0.04 },
  'Nipride (Nitroprussiato)': { diluicoes: [{ label: 'Padrão (50mg/250ml - 200mcg/ml)', factor: 200, type: 'mcg/kg/min' }], min: 0.1, max: 10.0 },
  'Tridil (Nitroglicerina)': { diluicoes: [{ label: 'Padrão (50mg/250ml - 200mcg/ml)', factor: 200, type: 'mcg/min' }], min: 5.0, max: 200.0 },
  'Esmolol': { diluicoes: [{ label: 'Padrão (2500mg/250ml - 10mg/ml)', factor: 10000, type: 'mcg/kg/min' }], min: 50.0, max: 300.0 }
};

const SEDACAO_DICT = {
  'Fentanil': { diluicoes: [{ label: 'Padrão (1000mcg/100ml - 10mcg/ml)', factor: 10, type: 'mcg/kg/h' }, { label: 'Concentrada Pura (50mcg/ml)', factor: 50, type: 'mcg/kg/h' }], min: 0.5, max: 3.0 },
  'Midazolam': { diluicoes: [{ label: 'Padrão (150mg/150ml - 1mg/ml)', factor: 1, type: 'mg/kg/h' }, { label: 'Simples (50mg/100ml - 0.5mg/ml)', factor: 0.5, type: 'mg/kg/h' }], min: 0.05, max: 0.2 },
  'Propofol': { diluicoes: [{ label: '1% (10mg/ml)', factor: 10, type: 'mg/kg/h' }, { label: '2% (20mg/ml)', factor: 20, type: 'mg/kg/h' }], min: 0.5, max: 4.0 },
  'Precedex (Dexmedetomidina)': { diluicoes: [{ label: 'Padrão (400mcg/100ml - 4mcg/ml)', factor: 4, type: 'mcg/kg/h' }], min: 0.2, max: 1.5 }
};

const ESCALAS_NEURO_DICT = {
  'ECG (Glasgow)': { desc: 'Ocular(1-4), Verbal(1-5), Motora(1-6). Score: 3 a 15.' },
  'RASS': { desc: 'Agitação(+1 a +4) ou Sedação(-1 a -5).' },
  'FOUR': { desc: 'Olhos(0-4), Motor(0-4), Tronco(0-4), Resp(0-4). Score: 0 a 16.' },
  'NIHSS': { desc: 'Déficit neurológico/AVC. Score: 0 a 42.' },
  'Ramsay': { desc: 'Nível de sedação. Score: 1 a 6.' }
};

// ==========================================
// COMPONENTES AUXILIARES UI (COM A11Y)
// ==========================================
const InlineInput = ({ val, path, ph, w = "w-12", updateField, type = "text", ariaLabel }) => (
  <input
    type={type}
    inputMode={type === 'number' ? 'numeric' : 'text'}
    aria-label={ariaLabel || ph || "Campo de entrada"}
    className={`border-b-2 border-slate-300 focus:border-blue-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 text-center bg-white/60 rounded-t px-1 font-medium text-slate-800 ${w} transition-colors print:border-none print:bg-transparent print:p-0 dark-input`}
    placeholder={ph}
    value={val || ''}
    onChange={(e) => updateField(path, e.target.value)}
  />
);

const NotasField = ({ notasValue, showNotas, onToggle, onUpdate, sistemaNome }) => (
  <div className="mt-3 no-print">
    <button
      onClick={onToggle}
      aria-expanded={showNotas || !!notasValue}
      aria-label={`${showNotas || notasValue ? 'Ocultar' : 'Adicionar'} Notas para ${sistemaNome}`}
      className={`flex items-center gap-1 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/50 rounded px-1 ${showNotas || notasValue ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400 hover:text-blue-500'}`}
    >
      <MessageSquareText size={14} aria-hidden="true" />
      {showNotas || notasValue ? 'Ocultar Notas' : 'Adicionar Notas'}
    </button>
    {(showNotas || notasValue) && (
      <textarea
        aria-label={`Notas adicionais para ${sistemaNome}`}
        className="w-full mt-2 bg-yellow-50/50 border border-yellow-200 focus:border-yellow-400 focus:outline-none focus:ring-2 focus:ring-yellow-400/50 rounded-lg p-2 text-sm text-slate-700 placeholder:text-yellow-600/50 dark-textarea"
        placeholder={`Notas adicionais para ${sistemaNome}...`}
        rows={2}
        value={notasValue || ''}
        onChange={(e) => onUpdate(e.target.value)}
      />
    )}
  </div>
);

const Accordion = ({ title, icon: Icon, count, isOpen, onToggle, colorClass, children }) => {
  const colors = {
    purple: { btnBg: 'bg-white', btnBorder: 'border-purple-100', iconBg: 'bg-purple-100', iconText: 'text-purple-600', text: 'text-purple-900', badgeBg: 'bg-purple-500', hoverBg: 'hover:bg-purple-50', chevron: 'text-purple-400', ring: 'focus:ring-purple-500/50' },
    rose: { btnBg: 'bg-white', btnBorder: 'border-rose-100', iconBg: 'bg-rose-100', iconText: 'text-rose-600', text: 'text-rose-900', badgeBg: 'bg-rose-500', hoverBg: 'hover:bg-rose-50', chevron: 'text-rose-400', ring: 'focus:ring-rose-500/50' },
    teal: { btnBg: 'bg-white', btnBorder: 'border-teal-100', iconBg: 'bg-teal-100', iconText: 'text-teal-600', text: 'text-teal-900', badgeBg: 'bg-teal-500', hoverBg: 'hover:bg-teal-50', chevron: 'text-teal-400', ring: 'focus:ring-teal-500/50' }
  }[colorClass] || colors.purple;

  return (
    <div className="flex flex-col gap-2 mt-2 mb-2">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        aria-controls={`accordion-content-${title.replace(/\s+/g, '-')}`}
        className={`w-full flex items-center justify-between ${colors.btnBg} p-3 rounded-xl border ${colors.btnBorder} shadow-sm hover:shadow-md transition-all group focus:outline-none focus:ring-2 ${colors.ring} no-print dark-card`}
      >
        <div className="flex items-center gap-3">
          <div className={`${colors.iconBg} ${colors.iconText} p-1.5 rounded-lg group-hover:scale-110 transition-transform dark-icon`}><Icon size={16} aria-hidden="true" /></div>
          <span className={`font-bold ${colors.text} text-sm uppercase tracking-wide dark-text-title`}>{title}</span>
          {count > 0 && <span className={`${colors.badgeBg} text-white px-2 py-0.5 rounded-full text-xs font-bold shadow-sm`} aria-label={`${count} itens ativos`}>{count}</span>}
        </div>
        <div className={`${colors.hoverBg} p-1 rounded-md ${colors.chevron} group-hover:text-current transition-colors dark-hover`}>
          {isOpen ? <ChevronUp size={16} aria-hidden="true" /> : <ChevronDown size={16} aria-hidden="true" />}
        </div>
      </button>
      <div
        id={`accordion-content-${title.replace(/\s+/g, '-')}`}
        className={`${isOpen ? 'block animate-in fade-in slide-in-from-top-2 duration-300' : 'hidden'} print-block ml-2 sm:ml-4 pl-2 sm:pl-4 border-l-2 ${colors.btnBorder} space-y-3`}
      >
        {children}
      </div>
    </div>
  );
};

// ==========================================
// FUNÇÕES DE LÓGICA CLÍNICA E INTELIGÊNCIA
// ==========================================
const getInitialState = (uti = 'UTI 2', id = null) => ({
  id: id || Math.random().toString(36).substring(2, 9),
  uti: uti,
  nome: '', leito: '', hd: '', adm: new Date().toLocaleDateString('pt-BR'),
  peso: '', altura: '', alergias: '', gravidade: '',
  dvas: [], sedativos: [],
  neuro: { escalas: [], pupilas: 'Isofotoreagentes, sem déficits focais', analgesia: '', camIcu: '', notas: '' },
  resp: { suporte: '', dataIntubacao: '', vazaoO2: '', fio2O2: '', vmModo: '', vmPeep: '', vmFio2: '', vmVc: '', vmPinspPs: '', pao2: '', fr1: '', fr2: '', frX: '', spo2: '', spo2X: '', ausculta: '', notas: '' },
  hemo: { pas1: '', pas2: '', pasX180: '', pasX100: '', pad1: '', pad2: '', padX120: '', padX50: '', pam1: '', pam2: '', pamX130: '', pamX65: '', fc1: '', fc2: '', fcX100: '', ausculta: 'BNF RR 2T SS.', pele: 'TEC < 3s | Extremidades quentes, bem perfundidas. MMII s/ edema s/ TVP.', notas: '' },
  tgi: { dx: '', dxX180: '', abdome: 'Semi-globoso, flácido, RHA +, sem sinais de peritonite.', bb: '', viaDieta: '', vazaoDieta: '', dietaOutra: '', aceitacao: '', evacuou: '', evacuacoesNum: '', evacuacoesAspecto: '', evacuacoesDataUltima: '', notas: '' },
  renal: { ur1: '', ur2: '', ur3: '', cr1: '', cr2: '', cr3: '', tipoDiurese: '', diurese: '', diureseHoras: '24', bh: '', mg: '', na: '', cai: '', k: '', notas: '' },
  hemato: { hb1: '', ht1: '', plaq1: '', profilaxiaTvp: '', profilaxiaUlcera: '', notas: '' },
  infecto: { tmax: '', tmaxX38: '', atbs: [], culturas: [], leuco1: '', leuco2: '', leuco3: '', notas: '' },
  impressao: ['', '', '', ''], conduta: ['', '', '', ''],
  pendencias: [{ checked: false, text: '' }, { checked: false, text: '' }, { checked: false, text: '' }]
});

const getClinicalIntelligence = (p) => {
  let sofa = 0;
  let sofaDet = [];

  // 1. Resp
  let fio2 = parseFloat(p.resp.vmFio2) || parseFloat(p.resp.fio2O2) || 21;
  let pao2 = parseFloat(p.resp.pao2);
  if (pao2 && fio2) {
    let ratio = (pao2 / fio2) * 100;
    if (ratio < 100) { sofa += 4; sofaDet.push('Resp: 4'); }
    else if (ratio < 200) { sofa += 3; sofaDet.push('Resp: 3'); }
    else if (ratio < 300) { sofa += 2; sofaDet.push('Resp: 2'); }
    else if (ratio <= 400) { sofa += 1; sofaDet.push('Resp: 1'); }
  }

  // 2. Coag
  let plaq = parseFloat(p.hemato.plaq1);
  if (plaq) {
    let pVal = plaq > 1000 ? plaq / 1000 : plaq;
    if (pVal < 20) { sofa += 4; sofaDet.push('Coag: 4'); }
    else if (pVal < 50) { sofa += 3; sofaDet.push('Coag: 3'); }
    else if (pVal < 100) { sofa += 2; sofaDet.push('Coag: 2'); }
    else if (pVal < 150) { sofa += 1; sofaDet.push('Coag: 1'); }
  }

  // 3. Liver
  let bb = parseFloat(p.tgi.bb);
  if (bb) {
    if (bb >= 12.0) { sofa += 4; sofaDet.push('Hep: 4'); }
    else if (bb >= 6.0) { sofa += 3; sofaDet.push('Hep: 3'); }
    else if (bb >= 2.0) { sofa += 2; sofaDet.push('Hep: 2'); }
    else if (bb >= 1.2) { sofa += 1; sofaDet.push('Hep: 1'); }
  }

  // 4. Cardio
  let pam = parseFloat(p.hemo.pam1);
  let hasDVA = p.dvas && p.dvas.length > 0;
  if (hasDVA) {
    let isHighDose = p.dvas.some(d => d.droga === 'Noradrenalina' && parseFloat(d.vazao) > 10);
    if (isHighDose) { sofa += 4; sofaDet.push('Cardio: 4 (>0.1 DVA)'); }
    else { sofa += 3; sofaDet.push('Cardio: 3 (DVA)'); }
  } else if (pam && pam < 70) {
    sofa += 1; sofaDet.push('Cardio: 1 (PAM < 70)');
  }

  // 5. Neuro
  let gcsEsc = p.neuro.escalas && p.neuro.escalas.find(e => e.nome === 'ECG (Glasgow)');
  if (gcsEsc && gcsEsc.valor) {
    let gcs = parseInt(gcsEsc.valor);
    if (gcs < 6) { sofa += 4; sofaDet.push('Neuro: 4'); }
    else if (gcs <= 9) { sofa += 3; sofaDet.push('Neuro: 3'); }
    else if (gcs <= 12) { sofa += 2; sofaDet.push('Neuro: 2'); }
    else if (gcs <= 14) { sofa += 1; sofaDet.push('Neuro: 1'); }
  }

  // 6. Renal
  let cr = parseFloat(p.renal.cr1);
  if (cr) {
    if (cr >= 5.0) { sofa += 4; sofaDet.push('Renal: 4'); }
    else if (cr >= 3.5) { sofa += 3; sofaDet.push('Renal: 3'); }
    else if (cr >= 2.0) { sofa += 2; sofaDet.push('Renal: 2'); }
    else if (cr >= 1.2) { sofa += 1; sofaDet.push('Renal: 1'); }
  }

  // Sepsis Check
  let hasInfec = (p.infecto.atbs && p.infecto.atbs.length > 0) || parseFloat(p.infecto.tmax) > 38 || parseFloat(p.infecto.leuco1) > 12000 || (p.infecto.culturas && p.infecto.culturas.length > 0);
  let isSeptic = hasInfec && sofa >= 2;

  // Campos em falta
  let missing = [];
  if (!pao2) missing.push("PaO2");
  if (!plaq) missing.push("Plaquetas");
  if (!bb) missing.push("Bilirrubina");
  if (!pam && !hasDVA) missing.push("PAM");
  if (!gcsEsc) missing.push("Glasgow");
  if (!cr) missing.push("Creatinina");

  return { sofa, sofaDet, isSeptic, hasInfec, missing };
}

const PRELOADED_PATIENTS = [
  {
    ...getInitialState('UTI 2', 'p01'), leito: '01', nome: 'EUGENIA', hd: 'PO tardio ablação FA | IC Aguda | Derrame Pleural | Choque séptico foco Urinário', adm: '12/03/26', peso: '77', altura: '1.60', alergias: 'Nega', gravidade: 'Instável',
    neuro: { ...getInitialState().neuro, escalas: [{ nome: 'ECG (Glasgow)', valor: '15' }], pupilas: 'PIRF', analgesia: '', camIcu: 'Negativo', notas: 'vigil, calma e colaborativa' },
    resp: { ...getInitialState().resp, suporte: 'Ar ambiente', fr1: '', fr2: '', spo2: '', ausculta: 'MV + bil com estretores em bases' },
    hemo: { ...getInitialState().hemo, pam1: '60', ausculta: 'Ritmo cardíaco irregular, 2T, BNF', pele: 'TEC < 3s | Pulsos presentes simétricos, panturrilhas livres sem edemas' },
    dvas: [{ droga: 'Noradrenalina', diluicao: 0, vazao: '15' }],
    renal: { ...getInitialState().renal, cr1: '2.1' },
    tgi: { ...getInitialState().tgi, abdome: 'Globoso RHA + sem massas ou visceromegalias, DB negativo', viaDieta: 'Via oral', dx: '' },
    infecto: { ...getInitialState().infecto, atbs: [{ nome: 'Outro', nomePersonalizado: 'Torgena + Aztreonam', dose: '', dias: '3' }], culturas: [{ tipo: 'HMC', data: '18/03', status: 'Positiva', detalhe: 'Klebsiella pneumoniae MDR' }, { tipo: 'URC', data: '18/03', status: 'Positiva', detalhe: 'Klebsiella pneumoniae MDR' }] },
    impressao: ['PO tardio Estudo eletrofisiológico com ablação FA', 'IC Aguda Perfil B', 'Derrame Pleural moderado Bilateral (D>E)', 'Choque séptico foco Urinário (Bacteremia 17/03)'],
    conduta: ['Vigilância hemodinâmica > Desmame recente de nora', 'Aguarda US de torax / Drenagem', 'Manter Mg > 2 e K > 4 devido FA', 'Torgena + Aztreonam guiado por culturas']
  }
];

const calcDoseInfusao = (infusao, dictMap, pesoAtual) => {
  if (!infusao.droga || !infusao.vazao) return null;
  const dict = dictMap[infusao.droga];
  if (!dict) return null;
  const dil = dict.diluicoes[infusao.diluicao || 0];
  if (!dil) return null;

  let dose = 0;
  if (dil.type === 'mcg/kg/min') {
    if (!pesoAtual) return { error: 'Insira o Peso' };
    dose = (parseFloat(infusao.vazao) * dil.factor) / (parseFloat(pesoAtual) * 60);
  } else if (dil.type === 'U/min' || dil.type === 'mcg/min') {
    dose = (parseFloat(infusao.vazao) * dil.factor) / 60;
  } else if (dil.type === 'mcg/kg/h' || dil.type === 'mg/kg/h') {
    if (!pesoAtual) return { error: 'Insira o Peso' };
    dose = (parseFloat(infusao.vazao) * dil.factor) / parseFloat(pesoAtual);
  }

  const isOk = dose >= dict.min && dose <= dict.max;
  return { value: dose.toFixed(2), unit: dil.type, min: dict.min, max: dict.max, isOk };
};

const calcDiureseEfetiva = (diurese, peso, horas) => {
  if (diurese && peso && horas) {
    return (parseFloat(diurese) / parseFloat(peso) / parseFloat(horas)).toFixed(2);
  }
  return '___';
};

const isHigh = (v1, v2, threshold) => (v1 !== '' && parseFloat(v1) > threshold) || (v2 !== '' && parseFloat(v2) > threshold);
const isLow = (v1, v2, threshold) => (v1 !== '' && parseFloat(v1) < threshold) || (v2 !== '' && parseFloat(v2) < threshold);

const generateSinglePatientText = (d) => {
  const getCamIcu = () => d.neuro.camIcu === 'Positivo' ? '[X] Positivo | [ ] Negativo' : d.neuro.camIcu === 'Negativo' ? '[ ] Positivo | [X] Negativo' : '[ ] Positivo | [ ] Negativo';
  const getAuscultaResp = (tipo) => d.resp.ausculta === tipo ? '[X]' : '[ ]';
  const pendenciasText = d.pendencias.map(p => `[${p.checked ? 'X' : ' '}] ${p.text || '______________________________'}`).join('\n');
  const profs = [d.hemato.profilaxiaTvp, d.hemato.profilaxiaUlcera].filter(Boolean).join(' + ');

  const intell = getClinicalIntelligence(d);

  let dietaText = d.tgi.viaDieta || '____';
  if (d.tgi.viaDieta === 'Outra' && d.tgi.dietaOutra) dietaText = d.tgi.dietaOutra;
  if (d.tgi.viaDieta && d.tgi.viaDieta !== 'Via oral' && d.tgi.viaDieta !== 'Jejum') dietaText += ` (Vazão: ${d.tgi.vazaoDieta || '___'} ml/h)`;

  let evacuacoesText = '____';
  if (d.tgi.evacuou === 'Sim') evacuacoesText = `Sim (${d.tgi.evacuacoesNum || '___'} vezes | Aspecto/Vol: ${d.tgi.evacuacoesAspecto || '___'})`;
  else if (d.tgi.evacuou === 'Não') evacuacoesText = `Não (Última em: ${d.tgi.evacuacoesDataUltima || '___'})`;

  let suporteRespText = d.resp.suporte || 'Ar ambiente';
  if (d.resp.suporte === 'IOT + VM') suporteRespText += ` (Data IOT: ${d.resp.dataIntubacao || '___'}) -> Modo: ${d.resp.vmModo || '___'} | PEEP: ${d.resp.vmPeep || '___'} | FiO2: ${d.resp.vmFio2 || '___'}% | VC: ${d.resp.vmVc || '___'} | P.Insp/PS: ${d.resp.vmPinspPs || '___'} | PaO2: ${d.resp.pao2 || '___'}`;
  else if (d.resp.suporte === 'CNL O2') suporteRespText += ` (${d.resp.vazaoO2 || '___'} L/min) | PaO2: ${d.resp.pao2 || '___'}`;
  else if (d.resp.suporte === 'CNAF') suporteRespText += ` (Vazão: ${d.resp.vazaoO2 || '___'} L/min | FiO2: ${d.resp.fio2O2 || '___'}%) | PaO2: ${d.resp.pao2 || '___'}`;

  const formatInfusaoText = (infusoes, dictMap) => infusoes.length > 0 ? infusoes.map(inf => {
    if (!inf.droga) return '';
    const doseData = calcDoseInfusao(inf, dictMap, d.peso);
    return `${inf.droga} - Vazão: ${inf.vazao || '___'} ml/h${doseData && !doseData.error ? ` -> [ ${doseData.value} ${doseData.unit} ]` : ''}`;
  }).filter(Boolean).join('\n      ') : 'Nenhuma';

  const atbsText = d.infecto.atbs.length > 0 ? d.infecto.atbs.map(a => `${a.nome === 'Outro' ? a.nomePersonalizado : a.nome || '___'} ${a.dose ? `(${a.dose})` : ''} ${a.dias ? `- D${a.dias}` : ''}`).filter(Boolean).join('\n     ') : 'Nenhum';
  const culturasText = d.infecto.culturas.map(c => `- ${c.tipo || '___'} (${c.data || '__/__'}): ${c.status || '___'}${((c.status === 'Parcial positiva' || c.status === 'Positiva') && c.detalhe) ? ` -> ${c.detalhe}` : ''}`).join('\n');
  const printNotas = (notas) => notas ? `\n   ↳ Notas: ${notas}` : '';

  return `# PASSAGEM DE TURNO - ${d.uti || 'UTI 2'}
## Leito: ${d.leito || '-'}                                       
Nome/Iniciais: ${d.nome || '_______________________________'} 
HD: ${d.hd || '_______________________________'} | Adm: ${d.adm}
Peso: ${d.peso || '___'} kg | Altura: ${d.altura || '___'} m | Gravidade: ${d.gravidade || 'Não classificada'}
Alergias: ${d.alergias || 'Nega'}
> SOFA Score Estimado: ${intell.sofa} ${intell.isSeptic ? '| ⚠️ ALERTA SEPSE-3 ⚠️' : ''}

Avaliação estruturada por Sistemas:
- Neurológico: 
Sedação:  ${formatInfusaoText(d.sedativos, SEDACAO_DICT)}
Escalas: ${d.neuro.escalas.length > 0 ? d.neuro.escalas.map(esc => `${esc.nome}: ${esc.valor || '___'}`).join(' | ') : 'Nenhuma'}
Pupilas: ${d.neuro.pupilas}
Analgesia: ${d.neuro.analgesia || '_______'} Adequada 
CAM - ICU: ${getCamIcu()}${printNotas(d.neuro.notas)}

- Respiratório: 
Suporte: ${suporteRespText}
FR: ${d.resp.fr1 || '___'} - ${d.resp.fr2 || '___'} Ipm ${isHigh(d.resp.fr1, d.resp.fr2, 20) ? `(${d.resp.frX || '___'} x > 20)` : ''} // SpO2: ${d.resp.spo2 || '___'} % aa ${isLow(d.resp.spo2, '', 92) ? `(${d.resp.spo2X || '___'} x < 92)` : ''} 
Ausculta pulmonar:
${getAuscultaResp('MV + BIlateralmente, SRA')}  MV + BIlateralmente, SRA 
${getAuscultaResp('MV + Bilateralmente, creptações bibasais')}  MV + Bilateralmente, creptações bibasais
${getAuscultaResp('MV + Bilateralemtente, reduzido globalmente, sra')}  MV + Reduzido globalmente, sra 
${getAuscultaResp('MV + Bilateralmente, Roncos difusos')}  MV + Bilateralmente, Roncos difusos 
${getAuscultaResp('MV + BIlateralmente, com Sibilos')}  MV + Bilateralmente, com Sibilos ${printNotas(d.resp.notas)}

- Hemodinâmico: 
DVA:  ${formatInfusaoText(d.dvas, DVA_DICT)}
PAS: ${d.hemo.pas1 || '___'} - ${d.hemo.pas2 || '___'} mmHg ${isHigh(d.hemo.pas1, d.hemo.pas2, 180) ? `(${d.hemo.pasX180 || '___'} x > 180)` : ''} ${isLow(d.hemo.pas1, d.hemo.pas2, 100) ? `(${d.hemo.pasX100 || '___'} x < 100)` : ''} 
PAD: ${d.hemo.pad1 || '___'} - ${d.hemo.pad2 || '___'} mmHg ${isHigh(d.hemo.pad1, d.hemo.pad2, 120) ? `(${d.hemo.padX120 || '___'} x > 120)` : ''} ${isLow(d.hemo.pad1, d.hemo.pad2, 50) ? `(${d.hemo.padX50 || '___'} x < 50)` : ''} 
PAm: ${d.hemo.pam1 || '___'} - ${d.hemo.pam2 || '___'} mmHg ${isHigh(d.hemo.pam1, d.hemo.pam2, 130) ? `(${d.hemo.pamX130 || '___'} x > 130)` : ''} ${isLow(d.hemo.pam1, d.hemo.pam2, 65) ? `(${d.hemo.pamX65 || '___'} x < 65)` : ''} 
FC:  ${d.hemo.fc1 || '___'} - ${d.hemo.fc2 || '___'} Bpm ${isHigh(d.hemo.fc1, d.hemo.fc2, 100) ? `(${d.hemo.fcX100 || '___'} x > 100)` : ''}
Ausculta: ${d.hemo.ausculta}
Pele Pulso e Extremidades: 
${d.hemo.pele}${printNotas(d.hemo.notas)}

- TGI / Nutrição: 
Dieta: ${dietaText} | Aceitação: ${d.tgi.aceitacao || '____'}
Bilirrubina: ${d.tgi.bb || '___'} mg/dL | DX: ${d.tgi.dx || '___'} mg/dL ${isHigh(d.tgi.dx, '', 180) ? `(${d.tgi.dxX180 || '___'} x > 180)` : ''} 
Evacuações: ${evacuacoesText}
Abdome: ${d.tgi.abdome}${printNotas(d.tgi.notas)}

- Renal / Metab.: 
Ur ( - ): ${d.renal.ur1 || '___'} > ${d.renal.ur2 || '___'} > ${d.renal.ur3 || '___'} mg/dL | Mg: ${d.renal.mg || '___'} | Na: ${d.renal.na || '___'}
CR ( - ): ${d.renal.cr1 || '___'} > ${d.renal.cr2 || '___'} > ${d.renal.cr3 || '___'} mg/dL | Cai: ${d.renal.cai || '___'} | K: ${d.renal.k || '___'}
Diurese (${d.renal.tipoDiurese ? `${d.renal.tipoDiurese} - ` : ''}${d.renal.diureseHoras || '24'}h): ${d.renal.diurese || '___'} ml | BH ${d.renal.bh || '___'} ml. => Ef: ${calcDiureseEfetiva(d.renal.diurese, d.peso, d.renal.diureseHoras)} ml/kg/hr${printNotas(d.renal.notas)}

- Hemato: 
Hb: ${d.hemato.hb1 || '___'} g/dL | HT: ${d.hemato.ht1 || '___'} % | Plaquetas: ${d.hemato.plaq1 || '___'} /µL 
Profilaxias: ${profs || '______________________'}${printNotas(d.hemato.notas)}

- Infecto: 
Tax: ${d.infecto.tmax || '___'} °C ${isHigh(d.infecto.tmax, '', 38) ? `(${d.infecto.tmaxX38 || '___'} x > 38)` : ''} | Leucócitos: ${d.infecto.leuco1 || '___'} /µL 
ATB: 
     ${atbsText}
Culturas: 
${culturasText}
${printNotas(d.infecto.notas)}

Impressão clínica / Problemas ativos
${d.impressao.map(i => i || '------------------------------').join('\n')}

Conduta/Plano 12–24 hrs
${d.conduta.map(c => c || '------------------------------').join('\n')}

Pendências / Riscos e contingências 
${pendenciasText}
`;
};

// ==========================================
// COMPONENTE PRINCIPAL DA APLICAÇÃO (DASHBOARD)
// ==========================================
export default function App() {
  const [patients, setPatients] = useState([]);
  const [activePatientId, setActivePatientId] = useState(null);

  const [authUser, setAuthUser] = useState(null);
  const [cloudStatus, setCloudStatus] = useState('connecting');

  const [activeTab, setActiveTab] = useState('UTI 2');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');

  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [importStatus, setImportStatus] = useState('');
  const [importTargetUTI, setImportTargetUTI] = useState('UTI 2');

  const [dialog, setDialog] = useState({ isOpen: false, message: '', type: 'alert', onConfirm: null });

  const showAlert = (message) => setDialog({ isOpen: true, message, type: 'alert', onConfirm: null });
  const showConfirm = (message, onConfirm) => setDialog({ isOpen: true, message, type: 'confirm', onConfirm });
  const closeDialog = () => setDialog({ isOpen: false, message: '', type: 'alert', onConfirm: null });

  // AUTENTICAÇÃO (MOCK PARA SUPABASE ANON)
  useEffect(() => {
    // Para simplificar no desenvolvimento local, assumimos autenticação anonima OK.
    setAuthUser({ uid: 'anon-user' });
  }, []);

  // SINCRONIZAÇÃO SUPABASE E INJEÇÃO DA SEED BÁSICA
  useEffect(() => {
    if (!authUser) return;
    setCloudStatus('syncing');

    const unsub = subscribeToPatients((loadedPts) => {
      if (loadedPts.length === 0 && !window.__db_seeded_uti) {
        // Injeção de dados de base no primeiro acesso
        PRELOADED_PATIENTS.forEach(p => {
          savePatientToSupabase(p).catch(e => console.error(e));
        });
        window.__db_seeded_uti = true;
      } else if (loadedPts.length > 0) {
        setPatients(loadedPts);
      } else {
        setPatients([]);
      }
      setCloudStatus('connected');
    }, (error) => {
      console.error("Erro na sincronização:", error);
      setCloudStatus('error');
    });

    return unsub;
  }, [authUser]);

  const triggerUpdatePatient = (updatedPatient) => {
    if (authUser) {
      savePatientToSupabase(updatedPatient)
        .catch(e => console.error("Falha ao salvar:", e));
    } else {
      setPatients(pts => pts.map(p => p.id === updatedPatient.id ? updatedPatient : p));
    }
  };

  const addPatient = () => {
    const newPatient = getInitialState(activeTab === 'IMPORT' ? 'UTI 2' : activeTab);
    if (authUser) {
      savePatientToSupabase(newPatient)
        .catch(e => console.error(e));
    } else {
      setPatients([...patients, newPatient]);
    }
    setActivePatientId(newPatient.id);
  };

  const triggerDeletePatient = (id, callback) => {
    showConfirm("Tem a certeza que deseja eliminar este paciente?", () => {
      if (authUser) {
        deletePatientFromSupabase(id).catch(e => console.error(e));
      } else {
        setPatients(prev => prev.filter(p => p.id !== id));
      }
      if (callback) callback();
    });
  };

  const clearAllData = () => {
    showConfirm("ATENÇÃO PERIGO: Isto irá apagar TODOS os pacientes de TODAS as UTIs do sistema na NUVEM. Confirma?", async () => {
      if (authUser) {
        for (const p of patients) {
          await deletePatientFromSupabase(p.id).catch(e => console.error(e));
        }
      } else {
        setPatients([]);
      }
      setIsSettingsOpen(false);
    });
  };

  const TABS = [
    { id: 'UTI 2', label: 'UTI 2 - 12 leitos', icon: Users },
    { id: 'UTI 3', label: 'UTI 3 - 13 leitos', icon: Users },
    { id: 'UTI 4', label: 'UTI 4 - 8 leitos', icon: Users },
    { id: 'IMPORT', label: 'Importação em Lote', icon: Wand2 }
  ];

  const displayedPatients = patients.filter(p => p.uti === activeTab);

  const copyAllPatients = () => {
    if (displayedPatients.length === 0) return showAlert('Nenhum paciente registado nesta UTI!');
    const allText = displayedPatients.map(p => generateSinglePatientText(p)).join('\n\n=========================================================\n\n');

    try {
      navigator.clipboard.writeText(allText).then(() => showAlert('Plantão completo copiado com sucesso!'));
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = allText;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.setAttribute("aria-hidden", "true");
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showAlert('Plantão completo copiado com sucesso (via execCommand)!');
      } catch (err) {
        showAlert('Falha ao copiar o plantão.');
      }
      document.body.removeChild(textArea);
    }
  };

  const exportToCSV = () => {
    if (displayedPatients.length === 0) return showAlert('Nenhum paciente para exportar.');

    const headers = ['UTI', 'Leito', 'Nome do Paciente', 'Gravidade', 'SOFA Estimado', 'Alerta Sepse', 'Diagnóstico/HD'];
    const rows = displayedPatients.map(p => {
      const intell = getClinicalIntelligence(p);
      return [
        p.uti,
        p.leito,
        p.nome || 'Não identificado',
        p.gravidade || 'Não definida',
        intell.sofa,
        intell.isSeptic ? 'SIM' : 'NÃO',
        p.hd || 'Sem dados'
      ].map(val => `"${String(val).replace(/"/g, '""')}"`).join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Relatorio_UTI_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleAIImport = async () => {
    if (!importText.trim()) return showAlert("Cole as evoluções para importar.");
    const apiKey = userApiKey.trim() || "";

    setIsImporting(true);
    setImportStatus('Estabelecendo link seguro com a IA...');
    try {
      const prompt = `Atue como um intensivista sênior implacável. Analise o texto ou leitura de OCR abaixo contendo sinais vitais, balanço hídrico, laboratório e evolução.
      
      REGRAS CRÍTICAS DE EXTRAÇÃO E VALIDAÇÃO (HITL):
      1. Retorne EXATAMENTE UM JSON ARRAY válido. NADA de markdown ou formatação (sem \`\`\`json).
      2. Intervalos de sinais vitais (PAS, PAD, PAM, FC, FR): extraia o MÁXIMO e o MÍNIMO.
         - Mapeie SEMPRE o MÁXIMO para o campo 1 (ex: pas1, fc1) e o MÍNIMO para o campo 2 (ex: pas2, fc2). Se o texto original inverteu, CORRIJA A ORDEM.
      3. Checagens lógicas de limites "Absurdos":
         Se qualquer valor cair nas regras abaixo, ou tiver letras/símbolos onde deveria ser número, adicione a tag " (revisar)" DIRETAMENTE NO VALOR DA STRING no JSON.
         - PAS < 50 ou > 260
         - PAM < 30 ou > 200
         - FC < 20 ou > 250
         - FR < 4 ou > 80
         - SpO2 < 50 ou > 100 (nunca > 100)
         - Tmax (Tax) < 30 ou > 43
         - DX < 20 ou > 800
         - Diurese < 0 ou > 15000
         - BH < -10000 ou > 10000
      4. Para sequências de laboratório (UR, CR, DX), se houver múltiplos valores, mapeie os mais recentes nos campos 1, prévios no 2 e 3. Adicione " (revisar)" apenas no valor isolado que for absurdo.
      5. Se o dado não existir no texto, deixe a string vazia "". Não invente dados. Mantenha vírgulas decimais se vierem do OCR.
      
      ESTRUTURA EXATA ESPERADA:
      [
        {
          "nome": "Nome do Paciente", "leito": "Numero/Letra", "hd": "Diagnóstico", "adm": "DD/MM", "peso": "", "altura": "", "gravidade": "Estável" | "Potencialmente Instável" | "Instável" | "Crítico",
          "alergias": "Nega",
          "dvas": [{"droga": "Noradrenalina", "diluicao": 0, "vazao": "10"}],
          "sedativos": [],
          "neuro": {"pupilas": "", "analgesia": "", "camIcu": "", "notas": ""},
          "resp": {"suporte": "", "vmModo": "", "vmPeep": "", "vmFio2": "", "pao2": "", "fr1": "Máx", "fr2": "Mín", "spo2": "", "ausculta": "", "notas": ""},
          "hemo": {"pas1": "Máx", "pas2": "Mín", "pad1": "Máx", "pad2": "Mín", "pam1": "Máx", "pam2": "Mín", "fc1": "Máx", "fc2": "Mín", "ausculta": "", "pele": "", "notas": ""},
          "tgi": {"bb": "", "dx": "", "abdome": "", "viaDieta": "", "aceitacao": "", "evacuou": "", "notas": ""},
          "renal": {"ur1": "", "ur2": "", "ur3": "", "cr1": "", "cr2": "", "cr3": "", "mg": "", "na": "", "k": "", "cai": "", "diurese": "", "tipoDiurese": "", "bh": "", "notas": ""},
          "hemato": {"hb1": "", "ht1": "", "plaq1": "", "profilaxiaTvp": "", "profilaxiaUlcera": "", "notas": ""},
          "infecto": {"tmax": "", "leuco1": "", "atbs": [], "culturas": [], "notas": ""},
          "impressao": ["1. Problema"],
          "conduta": ["Plano"],
          "pendencias": [{"checked": false, "text": "Pendência"}]
        }
      ]
      
      Texto a analisar:
      ${importText}`;

      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: "application/json" }
      };

      setImportStatus('Extraindo DVA, Ventilação e OCR de exames...');
      const fetchWithBackoff = async (retries = 5, delay = 1000) => {
        try {
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          const result = await response.json();
          if (result.error) throw new Error(result.error.message);
          return result;
        } catch (error) {
          if (retries > 0) {
            setImportStatus(`Interferência detectada. Retentando em ${delay}ms...`);
            await new Promise(res => setTimeout(res, delay));
            return fetchWithBackoff(retries - 1, delay * 2);
          }
          throw error;
        }
      };

      const result = await fetchWithBackoff();

      setImportStatus('Processando matriz de dados e limites absurdos...');
      let rawText = result.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Resposta vazia da IA.");

      rawText = rawText.replace(/```json/gi, '').replace(/```/g, '').trim();
      const parsedData = JSON.parse(rawText);

      if (Array.isArray(parsedData)) {
        const newPatients = parsedData.map(p => {
          const base = getInitialState(importTargetUTI);
          return {
            ...base,
            ...p,
            id: Math.random().toString(36).substring(2, 9),
            neuro: { ...base.neuro, ...(p.neuro || {}) },
            resp: { ...base.resp, ...(p.resp || {}) },
            hemo: { ...base.hemo, ...(p.hemo || {}) },
            tgi: { ...base.tgi, ...(p.tgi || {}) },
            renal: { ...base.renal, ...(p.renal || {}) },
            hemato: { ...base.hemato, ...(p.hemato || {}) },
            infecto: { ...base.infecto, ...(p.infecto || {}) }
          };
        });

        if (authUser) {
          newPatients.forEach(p => {
            savePatientToSupabase(p).catch(e => console.error(e));
          });
        } else {
          setPatients(prev => [...prev, ...newPatients]);
        }

        showAlert(`SUCESSO: ${newPatients.length} pacientes importados com extração OCR e validação estruturada!`);
        setImportText('');
        setActiveTab(importTargetUTI);
      } else {
        throw new Error("O formato retornado não é um Array de pacientes.");
      }
    } catch (error) {
      showAlert("Falha tática na comunicação com a IA. Recuando. Erro: " + error.message);
    } finally {
      setIsImporting(false);
      setImportStatus('');
    }
  };

  const themeClass = isDarkMode ? 'dark-theme bg-slate-900 text-slate-200' : 'bg-slate-200 text-slate-800';

  return (
    <div className={`min-h-screen font-sans overflow-x-hidden ${themeClass}`}>
      <style>{`
        @media print {
          body, .dark-theme { background-color: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-break-inside-avoid { break-inside: avoid; }
          .print-border-none { border: none !important; box-shadow: none !important; background: transparent !important; }
          select { appearance: none; border: none; background: transparent; }
          input::placeholder, textarea::placeholder { color: transparent !important; }
          .print-block { display: block !important; }
        }
        
        .dark-theme .bg-white { background-color: #1e293b !important; border-color: #334155 !important; color: #f1f5f9 !important; }
        .dark-theme .bg-slate-50, .dark-theme .bg-slate-100 { background-color: #0f172a !important; border-color: #1e293b !important; color: #cbd5e1 !important; }
        .dark-theme .text-slate-800, .dark-theme .text-slate-700 { color: #f8fafc !important; }
        .dark-theme .text-slate-500 { color: #94a3b8 !important; }
        .dark-theme input, .dark-theme select, .dark-theme textarea { background-color: #334155 !important; color: #f8fafc !important; border-color: #475569 !important; }
        .dark-theme .bg-slate-800 { background-color: #020617 !important; border-color: #1e293b !important; }

        @keyframes pulse-red {
          0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); border-color: rgba(239, 68, 68, 1); }
          50% { box-shadow: 0 0 0 10px rgba(239, 68, 68, 0); border-color: rgba(239, 68, 68, 0.4); }
        }
        .sepsis-alert { animation: pulse-red 2s infinite; }
      `}</style>

      {/* MÓDULO DE DIÁLOGO TÁTICO INTEGRADO (A11Y ROLES) */}
      {dialog.isOpen && (
        <div
          role="alertdialog"
          aria-modal="true"
          aria-labelledby="dialog-title"
          aria-describedby="dialog-desc"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-sm relative text-center">
            <div className={`mx-auto flex items-center justify-center h-12 w-12 rounded-full mb-4 ${dialog.type === 'confirm' ? 'bg-red-100 text-red-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {dialog.type === 'confirm' ? <AlertTriangle className="h-6 w-6" aria-hidden="true" /> : <CheckCircle2 className="h-6 w-6" aria-hidden="true" />}
            </div>
            <h3 id="dialog-title" className="text-lg leading-6 font-black text-slate-900 mb-2">{dialog.type === 'confirm' ? 'Confirmação' : 'Aviso Tático'}</h3>
            <p id="dialog-desc" className="text-sm font-medium text-slate-500 mb-6">{dialog.message}</p>
            <div className="flex flex-col sm:flex-row gap-3 w-full justify-center">
              {dialog.type === 'confirm' && (
                <button
                  onClick={closeDialog}
                  aria-label="Cancelar ação"
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-2.5 px-4 rounded-xl transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400"
                >
                  Cancelar
                </button>
              )}
              <button
                onClick={() => {
                  if (dialog.onConfirm) dialog.onConfirm();
                  closeDialog();
                }}
                aria-label={dialog.type === 'confirm' ? 'Confirmar Ação' : 'Entendido'}
                className={`flex-1 font-bold py-2.5 px-4 rounded-xl transition-colors text-white focus:outline-none focus:ring-2 ${dialog.type === 'confirm' ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500' : 'bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500'}`}
              >
                {dialog.type === 'confirm' ? 'Confirmar Ação' : 'Entendido'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE CONFIGURAÇÕES */}
      {isSettingsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="settings-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200"
        >
          <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-2xl w-full max-w-md relative">
            <button
              onClick={() => setIsSettingsOpen(false)}
              aria-label="Fechar configurações"
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500 rounded p-1"
            >
              <Trash2 size={24} className="hidden" aria-hidden="true" />
            </button>
            <h2 id="settings-title" className="text-2xl font-black mb-6 flex items-center gap-2 text-slate-800"><Settings className="text-slate-500" aria-hidden="true" /> Configurações</h2>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex flex-col">
                  <span className="font-bold text-slate-700">Modo Noturno</span>
                  <span className="text-xs text-slate-500">Alivia os olhos durante a noite</span>
                </div>
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  aria-label={isDarkMode ? "Mudar para modo claro" : "Mudar para modo escuro"}
                  className={`p-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${isDarkMode ? 'bg-indigo-100 text-indigo-600' : 'bg-amber-100 text-amber-600'}`}
                >
                  {isDarkMode ? <Moon size={20} aria-hidden="true" /> : <Sun size={20} aria-hidden="true" />}
                </button>
              </div>

              <div className="flex flex-col gap-2 p-4 bg-slate-50 rounded-xl border border-slate-200">
                <label htmlFor="api-key-input" className="font-bold text-slate-700 flex items-center gap-1"><Wand2 size={16} aria-hidden="true" /> Chave API (Google Gemini)</label>
                <span className="text-xs text-slate-500 leading-tight">Apenas necessária se rodar fora desta plataforma. Deixe em branco aqui.</span>
                <input
                  id="api-key-input"
                  type="password"
                  placeholder="Cole a sua API Key aqui..."
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm"
                  value={userApiKey}
                  onChange={(e) => setUserApiKey(e.target.value)}
                />
              </div>

              <div className="p-4 bg-red-50 rounded-xl border border-red-200 !bg-red-50 !border-red-200">
                <h3 className="font-bold text-red-700 flex items-center gap-1 mb-2 !text-red-700"><AlertTriangle size={16} aria-hidden="true" /> Zona de Perigo</h3>
                <button
                  onClick={clearAllData}
                  aria-label="Zerar Todos os Dados do Sistema"
                  className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2"
                >
                  <Trash2 size={18} aria-hidden="true" /> Zerar Todos os Dados
                </button>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(false)}
              aria-label="Fechar janela de configurações"
              className="mt-8 w-full bg-slate-800 text-white font-bold py-3 rounded-xl hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2"
            >
              Fechar Configurações
            </button>
          </div>
        </div>
      )}

      {!activePatientId ? (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="bg-emerald-500 p-3 rounded-2xl shadow-sm"><Activity size={32} className="text-white" aria-hidden="true" /></div>
              <div>
                <h1 className="text-3xl font-black tracking-tight text-slate-800">Passagem de Turno</h1>
                <h2 className="text-emerald-600 font-bold flex items-center gap-2">
                  Gestão Clínica Inteligente
                  {cloudStatus === 'connected' ? <Cloud size={14} title="Nuvem Sincronizada" /> : <CloudOff size={14} className="text-red-500" title="Nuvem Offline" />}
                </h2>
              </div>
            </div>
            <button
              onClick={() => setIsSettingsOpen(true)}
              aria-label="Abrir Configurações do Sistema"
              className="p-3 bg-white rounded-xl shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors text-slate-600 focus:outline-none focus:ring-2 focus:ring-slate-500"
            >
              <Settings size={24} aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Navegação das UTIs" className="flex overflow-x-auto gap-2 mb-6 pb-2 snap-x hide-scrollbar">
            {TABS.map(tab => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-pressed={isActive}
                  aria-label={`Visualizar ${tab.label}`}
                  className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold whitespace-nowrap transition-all shadow-sm snap-start focus:outline-none focus:ring-2 focus:ring-slate-500 ${isActive ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'}`}
                >
                  <TabIcon size={18} aria-hidden="true" /> {tab.label}
                  {tab.id !== 'IMPORT' && <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${isActive ? 'bg-white/20' : 'bg-slate-200 text-slate-600'}`} aria-label={`${patients.filter(p => p.uti === tab.id).length} pacientes`}>{patients.filter(p => p.uti === tab.id).length}</span>}
                </button>
              )
            })}
          </nav>

          {activeTab === 'IMPORT' && (
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 animate-in fade-in duration-300">
              <div className="flex items-center gap-3 mb-6 border-b border-slate-100 pb-4">
                <div className="bg-indigo-100 text-indigo-600 p-2 rounded-lg"><Wand2 size={24} aria-hidden="true" /></div>
                <div>
                  <h3 className="text-xl font-black text-slate-800">Importação com IA (OCR Validado)</h3>
                  <p className="text-sm text-slate-500 font-medium">Cole o texto/OCR do plantão. A IA corrige valores, extrai cartões e faz validação Max/Min.</p>
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 w-fit">
                  <label htmlFor="import-target" className="font-bold text-slate-700 text-sm">1. Destino da Importação:</label>
                  <select
                    id="import-target"
                    className="bg-white border border-slate-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-sm text-slate-800"
                    value={importTargetUTI}
                    onChange={(e) => setImportTargetUTI(e.target.value)}
                  >
                    <option value="UTI 2">UTI 2</option>
                    <option value="UTI 3">UTI 3</option>
                    <option value="UTI 4">UTI 4</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label htmlFor="import-text" className="font-bold text-slate-700 text-sm ml-1">2. Texto das Evoluções/OCR:</label>
                  <textarea
                    id="import-text"
                    className="w-full h-64 p-4 rounded-xl border border-slate-200 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 resize-y text-sm font-medium bg-slate-50/50"
                    placeholder="Cole aqui o texto da evolução médica ou OCR de exames..."
                    value={importText}
                    onChange={(e) => setImportText(e.target.value)}
                  ></textarea>
                </div>

                <button
                  onClick={handleAIImport}
                  disabled={isImporting}
                  aria-label={isImporting ? "A processar importação com IA" : "Extrair Cartões com IA"}
                  className={`w-full py-4 rounded-xl font-black text-lg flex items-center justify-center gap-2 transition-all shadow-md mt-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 ${isImporting ? 'bg-indigo-300 text-white cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.99]'}`}
                >
                  {isImporting ? <><Activity className="animate-spin" size={24} aria-hidden="true" /> <span className="text-sm sm:text-lg">{importStatus || 'Processando...'}</span></> : <><Wand2 size={24} aria-hidden="true" /> Extrair Cartões com IA</>}
                </button>
              </div>
            </div>
          )}

          {activeTab !== 'IMPORT' && (
            <div className="animate-in fade-in duration-300">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
                <h3 className="text-xl font-black text-slate-700 flex items-center gap-2"><ClipboardList aria-hidden="true" /> Gestão de Leitos</h3>
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={exportToCSV}
                    aria-label="Baixar Relatório em Excel/CSV"
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    <Download size={16} aria-hidden="true" /> <span className="hidden sm:inline">Exportar Excel</span>
                  </button>
                  <button
                    onClick={copyAllPatients}
                    aria-label="Copiar dados de todos os pacientes deste plantão"
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-slate-500"
                  >
                    <Copy size={16} aria-hidden="true" /> <span className="hidden sm:inline">Copiar Plantão</span>
                  </button>
                  <button
                    onClick={addPatient}
                    aria-label="Adicionar Novo Paciente"
                    className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl font-bold transition-all shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <UserPlus size={16} aria-hidden="true" /> <span className="hidden sm:inline">Add Paciente</span>
                  </button>
                </div>
              </div>

              {displayedPatients.length === 0 ? (
                <div className="bg-white/50 border-2 border-dashed border-slate-300 rounded-2xl p-16 flex flex-col items-center justify-center text-slate-500 mt-6" role="status" aria-live="polite">
                  <Users size={48} className="mb-4 text-slate-400" aria-hidden="true" />
                  <h3 className="text-xl font-bold mb-2 text-slate-700">Unidade Vazia</h3>
                  <p>Clique em "Add Paciente" ou use a Importação IA.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" role="list">
                  {displayedPatients.map(p => {
                    const intell = getClinicalIntelligence(p);

                    const getGravityColor = () => {
                      if (intell.isSeptic) return 'border-l-red-600 bg-red-50/50 sepsis-alert';
                      switch (p.gravidade) {
                        case 'Crítico': return 'border-l-red-500 bg-red-50/30';
                        case 'Instável': return 'border-l-orange-500 bg-orange-50/30';
                        case 'Potencialmente Instável': return 'border-l-yellow-500 bg-yellow-50/30';
                        case 'Estável': return 'border-l-emerald-500 bg-emerald-50/30';
                        default: return 'border-l-slate-300 bg-white';
                      }
                    };

                    const hasDVA = p.dvas && p.dvas.length > 0;
                    const hasSed = p.sedativos && p.sedativos.length > 0;
                    const hasVM = p.resp.suporte.includes('IOT');
                    const hasVNI = p.resp.suporte.includes('VNI') || p.resp.suporte.includes('CNAF');
                    const hasATB = p.infecto.atbs && p.infecto.atbs.length > 0;
                    const hasPendencias = p.pendencias && p.pendencias.some(pend => pend.text.trim() !== '');

                    return (
                      <div
                        key={p.id}
                        role="listitem"
                        tabIndex={0}
                        aria-label={`Visualizar paciente ${p.nome || 'Não identificado'}, Leito ${p.leito || 'Desconhecido'}`}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setActivePatientId(p.id) }}
                        className={`relative flex flex-col justify-between p-4 rounded-2xl shadow-md border-y border-r border-l-8 ${getGravityColor()} hover:shadow-md transition-all hover:-translate-y-1 cursor-pointer group focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-800 dark:border-slate-700`}
                        onClick={() => setActivePatientId(p.id)}
                      >
                        <button
                          onClick={(e) => { e.stopPropagation(); triggerDeletePatient(p.id); }}
                          aria-label={`Eliminar paciente ${p.nome || 'Não identificado'}`}
                          className="absolute top-3 right-3 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1 focus:opacity-100 focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                        >
                          <Trash2 size={16} aria-hidden="true" />
                        </button>

                        <div>
                          <div className="flex items-baseline justify-between gap-2 mb-1">
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold uppercase text-slate-500 tracking-wider">Leito</span>
                              <span className="text-2xl font-black text-slate-800">{p.leito || '-'}</span>
                            </div>
                            <div className={`flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-md ${intell.sofa >= 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-600'}`} title="SOFA Score" aria-label={`Score SOFA estimado: ${intell.sofa}`}>
                              <Calculator size={10} aria-hidden="true" /> SOFA {intell.sofa}
                            </div>
                          </div>

                          <h3 className="font-bold text-lg text-slate-700 leading-tight mb-2 truncate" title={p.nome}>{p.nome || 'Não identificado'}</h3>
                          <p className="text-xs text-slate-500 font-medium line-clamp-2 leading-relaxed h-8">{p.hd || 'Sem HD informada'}</p>
                        </div>

                        {intell.isSeptic && (
                          <div className="mt-2 bg-red-600 text-white text-[10px] font-black uppercase tracking-wider py-1 px-2 rounded flex items-center justify-center gap-1 animate-pulse" role="alert" aria-live="assertive">
                            <Flame size={12} aria-hidden="true" /> Alerta Sepse-3
                          </div>
                        )}

                        <div className="mt-3 pt-3 border-t border-slate-200/60 dark:border-slate-700 flex flex-wrap gap-2" aria-label="Suportes e Terapias Ativas">
                          {hasDVA && <span className="flex items-center gap-1 bg-rose-100 text-rose-700 px-2 py-1 rounded text-[10px] font-bold" title="Drogas Vasoativas em uso"><Droplets size={12} aria-hidden="true" /> DVA</span>}
                          {hasSed && <span className="flex items-center gap-1 bg-purple-100 text-purple-700 px-2 py-1 rounded text-[10px] font-bold" title="Sedação em uso"><Syringe size={12} aria-hidden="true" /> Sed</span>}
                          {hasVM && <span className="flex items-center gap-1 bg-sky-100 text-sky-700 px-2 py-1 rounded text-[10px] font-bold" title="Ventilação Mecânica Invasiva"><Wind size={12} aria-hidden="true" /> VM</span>}
                          {hasVNI && <span className="flex items-center gap-1 bg-sky-50 text-sky-600 px-2 py-1 rounded text-[10px] font-bold border border-sky-100" title="Suporte Não Invasivo (VNI/CNAF)"><Wind size={12} aria-hidden="true" /> VNI</span>}
                          {hasATB && <span className="flex items-center gap-1 bg-teal-100 text-teal-700 px-2 py-1 rounded text-[10px] font-bold" title="Antibióticos em uso"><Pill size={12} aria-hidden="true" /> ATB</span>}
                          {hasPendencias && <span className="flex items-center gap-1 bg-orange-100 text-orange-700 px-2 py-1 rounded text-[10px] font-bold ml-auto" title="Possui pendências em aberto"><ClipboardList size={12} aria-hidden="true" /></span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <PatientCard
          data={patients.find(p => p.id === activePatientId)}
          updatePatientObj={triggerUpdatePatient}
          onBack={() => setActivePatientId(null)}
          onDelete={() => triggerDeletePatient(activePatientId, () => setActivePatientId(null))}
          showAlert={showAlert}
        />
      )}
    </div>
  );
}

// ==========================================
// COMPONENTE DO FORMULÁRIO DE PACIENTE INDIVIDUAL
// ==========================================
function PatientCard({ data, updatePatientObj, onBack, onDelete, showAlert }) {
  if (!data) return null;
  const [showNotas, setShowNotas] = useState({});
  const [expandedSections, setExpandedSections] = useState({ sedativos: false, escalas: false, dvas: false, infecto: false });

  const toggleNotas = (sistema) => setShowNotas(prev => ({ ...prev, [sistema]: !prev[sistema] }));
  const toggleSection = (sec) => setExpandedSections(prev => ({ ...prev, [sec]: !prev[sec] }));

  const updateField = (path, value) => {
    let newData = { ...data };
    const keys = path.split('.');
    if (keys.length === 1) {
      newData[keys[0]] = value;
    } else {
      newData[keys[0]] = { ...newData[keys[0]], [keys[1]]: value };
    }
    updatePatientObj(newData);
  };

  const updateArrayField = (section, index, value, field = null) => {
    let newArray = [...data[section]];
    if (field) {
      newArray[index] = { ...newArray[index], [field]: value };
    } else {
      newArray[index] = value;
    }
    updatePatientObj({ ...data, [section]: newArray });
  };

  const addInfusao = (tipo) => {
    updatePatientObj({ ...data, [tipo]: [...(data[tipo] || []), { droga: '', diluicao: 0, vazao: '' }] });
  };

  const removeInfusao = (tipo, index) => {
    updatePatientObj({ ...data, [tipo]: data[tipo].filter((_, i) => i !== index) });
  };

  const updateInfusao = (tipo, index, field, value) => {
    const newArray = [...data[tipo]];
    newArray[index] = { ...newArray[index], [field]: value };
    if (field === 'droga') newArray[index].diluicao = 0;
    updatePatientObj({ ...data, [tipo]: newArray });
  };

  const addAtb = () => {
    const newAtbs = [...(data.infecto.atbs || []), { nome: '', nomePersonalizado: '', dose: '', dias: '' }];
    updatePatientObj({ ...data, infecto: { ...data.infecto, atbs: newAtbs } });
  };

  const removeAtb = (index) => {
    const newAtbs = [...data.infecto.atbs];
    newAtbs.splice(index, 1);
    updatePatientObj({ ...data, infecto: { ...data.infecto, atbs: newAtbs } });
  };

  const updateAtb = (index, field, value) => {
    const newAtbs = [...data.infecto.atbs];
    newAtbs[index] = { ...newAtbs[index], [field]: value };
    updatePatientObj({ ...data, infecto: { ...data.infecto, atbs: newAtbs } });
  };

  const addCultura = () => {
    const newCults = [...(data.infecto.culturas || []), { tipo: '', data: '', status: '', detalhe: '' }];
    updatePatientObj({ ...data, infecto: { ...data.infecto, culturas: newCults } });
  };

  const removeCultura = (index) => {
    const newCults = [...data.infecto.culturas];
    newCults.splice(index, 1);
    updatePatientObj({ ...data, infecto: { ...data.infecto, culturas: newCults } });
  };

  const updateCultura = (index, field, value) => {
    const newCults = [...data.infecto.culturas];
    newCults[index] = { ...newCults[index], [field]: value };
    updatePatientObj({ ...data, infecto: { ...data.infecto, culturas: newCults } });
  };

  const addEscala = () => {
    const newEscalas = [...(data.neuro.escalas || []), { nome: '', valor: '' }];
    updatePatientObj({ ...data, neuro: { ...data.neuro, escalas: newEscalas } });
  };

  const removeEscala = (index) => {
    const newEscalas = data.neuro.escalas.filter((_, i) => i !== index);
    updatePatientObj({ ...data, neuro: { ...data.neuro, escalas: newEscalas } });
  };

  const updateEscala = (index, field, value) => {
    const newEscalas = [...data.neuro.escalas];
    newEscalas[index] = { ...newEscalas[index], [field]: value };
    updatePatientObj({ ...data, neuro: { ...data.neuro, escalas: newEscalas } });
  };

  const handleCopy = () => {
    const textToCopy = generateSinglePatientText(data);
    try {
      navigator.clipboard.writeText(textToCopy).then(() => showAlert('Paciente copiado com sucesso!'));
    } catch (err) {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.left = "-9999px";
      textArea.setAttribute("aria-hidden", "true");
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        showAlert('Paciente copiado com sucesso (via execCommand)!');
      } catch (err) {
        showAlert('Falha ao copiar.');
      }
      document.body.removeChild(textArea);
    }
  };

  const intell = getClinicalIntelligence(data);

  return (
    <div className="max-w-4xl mx-auto bg-white shadow-2xl rounded-2xl overflow-hidden print-border-none mt-4 md:mt-8 animate-in slide-in-from-bottom-4 duration-300">

      {/* HEADER DO CARTÃO */}
      <div className="bg-slate-800 text-white p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:bg-white print:text-black print:border-b-2 print:border-black">
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onBack}
            aria-label="Voltar à visão geral dos leitos"
            className="no-print bg-slate-700 hover:bg-slate-600 p-2.5 rounded-xl transition-colors mr-2 flex-shrink-0 focus:outline-none focus:ring-2 focus:ring-white"
            title="Voltar ao Mapa da UTI"
          >
            <ArrowLeft size={24} className="text-white" aria-hidden="true" />
          </button>
          <Activity size={32} className="text-emerald-400 print:text-black flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-black tracking-tight leading-tight truncate">PASSAGEM DE TURNO</h1>
            <h2 className="text-sm sm:text-lg font-medium text-emerald-400 print:text-slate-700">{data.uti}</h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto no-print">
          <button
            onClick={onDelete}
            aria-label="Eliminar Registo deste Paciente"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-red-600 px-4 py-2 sm:py-3 rounded-xl font-semibold transition-all active:scale-95 shadow-lg focus:outline-none focus:ring-2 focus:ring-red-500"
            title="Apagar este paciente"
          >
            <Trash2 size={18} aria-hidden="true" />
          </button>
          <button
            onClick={handleCopy}
            aria-label="Copiar relatório estruturado do paciente"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 px-4 py-2 sm:py-3 rounded-xl font-semibold transition-all active:scale-95 shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
          >
            <Copy size={18} aria-hidden="true" /> Copiar
          </button>
          <button
            onClick={window.print}
            aria-label="Imprimir ficha do paciente"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 px-4 py-2 sm:py-3 rounded-xl font-semibold transition-all active:scale-95 shadow-lg focus:outline-none focus:ring-2 focus:ring-white"
          >
            <Printer size={18} aria-hidden="true" /> Imprimir
          </button>
        </div>
      </div>

      {/* MÓDULO INTELIGÊNCIA */}
      <div role="status" aria-live="polite" className={`p-4 mx-3 sm:mx-6 mt-4 sm:mt-6 rounded-xl border-l-4 shadow-sm print-break-inside-avoid ${intell.isSeptic ? 'bg-red-50 border-red-600' : 'bg-slate-100 border-slate-400'}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${intell.isSeptic ? 'bg-red-600 text-white' : 'bg-slate-800 text-white'}`} aria-hidden="true">
              {intell.isSeptic ? <Flame size={20} /> : <Calculator size={20} />}
            </div>
            <div>
              <h3 className={`font-black uppercase tracking-wider text-sm ${intell.isSeptic ? 'text-red-700' : 'text-slate-700'}`}>
                {intell.isSeptic ? 'ALERTA SÉPTICO DETETADO (SEPSIS-3)' : 'INTELIGÊNCIA CLÍNICA - SOFA'}
              </h3>
              <p className="text-xs font-medium text-slate-500">
                Score SOFA Estimado: <span className={`font-black text-sm ${intell.isSeptic ? 'text-red-600' : 'text-slate-800'}`}>{intell.sofa}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-start sm:items-end gap-1">
            {intell.sofaDet.length > 0 && (
              <div className="flex flex-wrap gap-1" aria-label="Detalhes do cálculo SOFA">
                {intell.sofaDet.map((d, i) => <span key={i} className="text-[9px] font-bold bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">{d}</span>)}
              </div>
            )}
            {intell.missing.length > 0 && (
              <span className="text-[10px] font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">Faltam dados: {intell.missing.join(', ')}</span>
            )}
          </div>
        </div>
      </div>

      <div className="p-3 sm:p-6 space-y-4 sm:space-y-6 bg-slate-50 print:bg-white pt-2">

        {/* IDENTIFICAÇÃO BÁSICA */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:border-b space-y-3">
          <div className="flex flex-col sm:flex-row gap-3 border-b border-slate-100 pb-3 print:border-none">
            <div className="flex items-center gap-2 flex-[2]">
              <label htmlFor="input-nome" className="font-bold text-slate-500 uppercase text-xs tracking-wider">Nome/Iniciais:</label>
              <input id="input-nome" type="text" className="flex-1 border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded px-1 font-bold text-lg dark-input" value={data.nome || ''} onChange={(e) => updateField('nome', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1">
              <label htmlFor="input-leito" className="font-bold text-slate-500 uppercase text-xs tracking-wider">Leito:</label>
              <input id="input-leito" type="text" className="flex-1 border-b-2 border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded px-1 font-bold text-lg dark-input" value={data.leito || ''} onChange={(e) => updateField('leito', e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-[2] min-w-[200px]">
              <label htmlFor="input-hd" className="font-bold text-slate-500 uppercase text-xs tracking-wider">HD:</label>
              <input id="input-hd" type="text" className="flex-1 border-b border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded px-1 font-medium dark-input" value={data.hd || ''} onChange={(e) => updateField('hd', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[120px]">
              <label htmlFor="input-adm" className="font-bold text-slate-500 uppercase text-xs tracking-wider">Adm:</label>
              <input id="input-adm" type="text" className="flex-1 border-b border-slate-200 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded px-1 text-slate-600 font-medium dark-input" value={data.adm || ''} onChange={(e) => updateField('adm', e.target.value)} />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 flex-wrap bg-slate-50 p-2 rounded-lg border border-slate-100 print:bg-transparent print:border-none">
            <div className="flex items-center gap-2">
              <label htmlFor="input-peso" className="font-bold text-slate-500 uppercase text-xs tracking-wider">Peso(kg):</label>
              <input id="input-peso" type="number" className="w-16 border-b border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded px-1 bg-transparent font-bold text-center text-emerald-700 dark-input" value={data.peso || ''} onChange={(e) => updateField('peso', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="input-altura" className="font-bold text-slate-500 uppercase text-xs tracking-wider">Altura(m):</label>
              <input id="input-altura" type="number" step="0.01" className="w-16 border-b border-slate-300 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 rounded px-1 bg-transparent text-center dark-input" value={data.altura || ''} onChange={(e) => updateField('altura', e.target.value)} />
            </div>
            <div className="flex items-center gap-2 flex-1 min-w-[150px]">
              <label htmlFor="input-alergias" className="font-bold text-red-500 uppercase text-xs tracking-wider">Alergias:</label>
              <input id="input-alergias" type="text" className="flex-1 border-b border-red-200 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/30 rounded px-1 bg-transparent text-red-700 font-medium placeholder:text-red-300 dark-input" placeholder="Nega alergias" value={data.alergias || ''} onChange={(e) => updateField('alergias', e.target.value)} />
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="input-gravidade" className="font-bold text-slate-500 uppercase text-xs tracking-wider">Gravidade:</label>
              <select id="input-gravidade" className="bg-white border border-slate-200 p-1 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm font-semibold text-slate-700 dark-input" value={data.gravidade || ''} onChange={(e) => updateField('gravidade', e.target.value)}>
                <option value="">Selecione...</option>
                <option value="Estável">1 - Estável</option>
                <option value="Potencialmente Instável">2 - Potencialmente Instável</option>
                <option value="Instável">3 - Instável</option>
                <option value="Crítico">4 - Crítico</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {/* NEUROLÓGICO */}
          <div className="bg-purple-50 border-l-4 border-purple-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid">
            <div className="flex items-center justify-between mb-4 border-b border-purple-200 pb-2">
              <h4 className="font-bold text-purple-800 uppercase tracking-widest text-sm flex items-center gap-2"><Brain size={16} aria-hidden="true" /> Neurológico</h4>
            </div>

            <div className="space-y-4 text-sm text-purple-900">
              <Accordion title="Sedação / Analgesia" icon={Syringe} count={(data.sedativos || []).length} isOpen={expandedSections.sedativos} onToggle={() => toggleSection('sedativos')} colorClass="purple">
                {(!data.sedativos || data.sedativos.length === 0) && <span className="text-xs text-slate-400 italic block py-1">Nenhuma Sedação em uso.</span>}
                {(data.sedativos || []).map((sed, idx) => {
                  const doseData = calcDoseInfusao(sed, SEDACAO_DICT, data.peso);
                  return (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-purple-100 relative shadow-sm">
                      <button
                        onClick={() => removeInfusao('sedativos', idx)}
                        aria-label={`Remover sedativo ${sed.droga || 'sem nome'}`}
                        className="absolute top-3 right-3 text-red-300 hover:text-red-500 no-print transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pr-6">
                        <div className="flex flex-col gap-1">
                          <label htmlFor={`sed-droga-${idx}`} className="text-[10px] font-bold text-purple-600 uppercase">Fármaco</label>
                          <select id={`sed-droga-${idx}`} className="bg-purple-50/50 border border-purple-200 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-bold text-purple-900 dark-input" value={sed.droga || ''} onChange={(e) => updateInfusao('sedativos', idx, 'droga', e.target.value)}>
                            <option value="">Selecione...</option>
                            {Object.keys(SEDACAO_DICT).map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        </div>
                        {sed.droga && (
                          <div className="flex flex-col gap-1">
                            <label htmlFor={`sed-dilu-${idx}`} className="text-[10px] font-bold text-purple-600 uppercase">Diluição</label>
                            <select id={`sed-dilu-${idx}`} className="bg-purple-50/50 border border-purple-200 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs text-purple-800 dark-input" value={sed.diluicao || 0} onChange={(e) => updateInfusao('sedativos', idx, 'diluicao', e.target.value)}>
                              {SEDACAO_DICT[sed.droga].diluicoes.map((dil, i) => <option key={i} value={i}>{dil.label}</option>)}
                            </select>
                          </div>
                        )}
                      </div>
                      {sed.droga && (
                        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-purple-50/30 p-2.5 rounded-lg border border-purple-100">
                          <div className="flex items-center gap-2 shrink-0 bg-white px-2 py-1 rounded border border-purple-100 shadow-sm">
                            <label htmlFor={`sed-vazao-${idx}`} className="font-bold text-[10px] uppercase text-purple-600">Vazão:</label>
                            <input id={`sed-vazao-${idx}`} type="number" step="0.1" className="w-14 border-b-2 border-purple-300 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded text-center font-bold text-sm bg-transparent" placeholder="ml/h" value={sed.vazao || ''} onChange={(e) => updateInfusao('sedativos', idx, 'vazao', e.target.value)} />
                            <span className="text-[10px] text-slate-500 font-bold" aria-hidden="true">ml/h</span>
                          </div>
                          <div className="flex-1 sm:border-l-2 border-purple-200 pl-3">
                            {doseData ? (
                              doseData.error ? <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded w-fit"><AlertTriangle size={10} aria-hidden="true" /> {doseData.error}</span> :
                                <div className="flex flex-col"><span className="font-black text-purple-900 text-sm flex items-baseline gap-1" aria-label={`Dose calculada: ${doseData.value} ${doseData.unit}`}>{doseData.value} <span className="text-[10px] font-bold text-purple-600" aria-hidden="true">{doseData.unit}</span></span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 w-fit ${doseData.isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>Faixa Segura: {doseData.min} a {doseData.max}</span></div>
                            ) : <span className="text-[10px] text-slate-400 italic">Insira a vazão para calcular dose</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                <button
                  onClick={() => addInfusao('sedativos')}
                  className="no-print w-full py-2 flex items-center justify-center gap-2 text-purple-600 bg-purple-100/50 hover:bg-purple-100 border-2 border-purple-200 border-dashed rounded-xl text-xs font-bold transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <Plus size={14} aria-hidden="true" /> Adicionar Nova Sedação
                </button>
              </Accordion>

              <Accordion title="Escalas Clínicas" icon={Clipboard} count={(data.neuro.escalas || []).length} isOpen={expandedSections.escalas} onToggle={() => toggleSection('escalas')} colorClass="purple">
                {(!data.neuro.escalas || data.neuro.escalas.length === 0) && <div className="text-xs text-slate-400 italic py-1">Nenhuma escala registada.</div>}
                {(data.neuro.escalas || []).map((esc, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-purple-100 relative shadow-sm">
                    <button
                      onClick={() => removeEscala(idx)}
                      aria-label="Remover esta escala"
                      className="absolute top-3 right-3 text-red-300 hover:text-red-500 no-print transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <div className="flex flex-col gap-2 pr-6">
                      <div className="flex flex-wrap items-center gap-3">
                        <select aria-label="Nome da Escala" className="bg-purple-50/50 border border-purple-200 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-purple-500 text-xs font-bold text-purple-900 dark-input" value={esc.nome || ''} onChange={(e) => updateEscala(idx, 'nome', e.target.value)}>
                          <option value="">Selecionar Escala...</option>
                          {Object.keys(ESCALAS_NEURO_DICT).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        {esc.nome && (
                          <div className="flex items-center gap-2 bg-purple-50 px-2 py-1 rounded-md border border-purple-100">
                            <label htmlFor={`esc-val-${idx}`} className="font-bold text-[10px] uppercase text-purple-700">Score:</label>
                            <input id={`esc-val-${idx}`} type="text" className="w-16 border-b-2 border-purple-300 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50 rounded text-center bg-transparent font-bold text-sm" placeholder="..." value={esc.valor || ''} onChange={(e) => updateEscala(idx, 'valor', e.target.value)} />
                          </div>
                        )}
                      </div>
                      {esc.nome && <span className="text-[10px] font-medium text-purple-700 italic bg-purple-100/50 px-2 py-1 rounded border border-purple-100">{ESCALAS_NEURO_DICT[esc.nome].desc}</span>}
                    </div>
                  </div>
                ))}
                <button
                  onClick={addEscala}
                  className="no-print w-full py-2 flex items-center justify-center gap-2 text-purple-600 bg-purple-100/50 hover:bg-purple-100 border-2 border-purple-200 border-dashed rounded-xl text-xs font-bold transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <Plus size={14} aria-hidden="true" /> Adicionar Nova Escala
                </button>
              </Accordion>

              <div className="flex flex-col gap-3 pt-3 mt-3 border-t border-purple-100">
                <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                  <label htmlFor="input-pupilas" className="font-bold text-xs uppercase text-purple-800 shrink-0">Pupilas:</label>
                  <input id="input-pupilas" type="text" className="w-full bg-transparent border-b border-purple-300 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500/30 rounded px-1 font-medium dark-input" value={data.neuro.pupilas || ''} onChange={(e) => updateField('neuro.pupilas', e.target.value)} />
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-3 pt-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-purple-800">Analgesia:</span>
                    <InlineInput val={data.neuro.analgesia} path="neuro.analgesia" ph="____" w="w-20" updateField={updateField} ariaLabel="Nível de analgesia" />
                    <span className="text-[10px] text-purple-600 font-bold bg-white px-2 py-0.5 rounded shadow-sm border border-purple-100">Adequada</span>
                  </div>
                  <div className="hidden sm:block w-px h-6 bg-purple-200"></div>
                  <div className="flex items-center gap-2 bg-white p-1.5 rounded-lg shadow-sm border border-purple-100">
                    <span className="font-bold text-xs uppercase text-purple-800 px-1" id="camicu-label">CAM-ICU:</span>
                    <label className="flex items-center gap-1 cursor-pointer font-bold text-purple-900 text-xs bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors focus-within:ring-2 focus-within:ring-purple-500">
                      <input type="radio" name="camicu" checked={data.neuro.camIcu === 'Positivo'} onChange={() => updateField('neuro.camIcu', 'Positivo')} className="accent-purple-600 focus:outline-none" aria-labelledby="camicu-label" /> Pos
                    </label>
                    <label className="flex items-center gap-1 cursor-pointer font-bold text-purple-900 text-xs bg-purple-50 px-2 py-1 rounded hover:bg-purple-100 transition-colors focus-within:ring-2 focus-within:ring-purple-500">
                      <input type="radio" name="camicu" checked={data.neuro.camIcu === 'Negativo'} onChange={() => updateField('neuro.camIcu', 'Negativo')} className="accent-purple-600 focus:outline-none" aria-labelledby="camicu-label" /> Neg
                    </label>
                  </div>
                </div>
              </div>

              <NotasField sistemaNome="Neurológico" notasValue={data.neuro.notas} showNotas={showNotas.neuro} onToggle={() => toggleNotas('neuro')} onUpdate={(val) => updateField('neuro.notas', val)} />
            </div>
          </div>

          {/* RESPIRATÓRIO */}
          <div className="bg-sky-50 border-l-4 border-sky-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid">
            <h4 className="font-bold text-sky-800 uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-sky-200 pb-2"><Wind size={16} aria-hidden="true" /> Respiratório</h4>
            <div className="space-y-4 text-sm text-sky-900">

              <div className="flex flex-col gap-3 bg-white p-3 rounded-xl border border-sky-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-3">
                  <label htmlFor="select-suporte-o2" className="font-bold text-xs uppercase text-sky-800">Suporte O2:</label>
                  <select id="select-suporte-o2" className="bg-sky-50/50 border border-sky-200 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-bold text-sky-900 dark-input" value={data.resp.suporte || ''} onChange={(e) => updateField('resp.suporte', e.target.value)}>
                    <option value="">Ar ambiente</option>
                    <option value="IOT + VM">1. IOT + VM</option>
                    <option value="VNI 8/8 hrs">2. VNI 8/8 hrs</option>
                    <option value="CNL O2">3. CNL O2</option>
                    <option value="CNAF">4. CNAF</option>
                  </select>

                  {data.resp.suporte === 'IOT + VM' && (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-2 py-1 rounded-md ml-auto sm:ml-0">
                      <span className="text-[10px] font-bold text-sky-700 uppercase">Data IOT:</span>
                      <InlineInput val={data.resp.dataIntubacao} path="resp.dataIntubacao" w="w-16" ph="dd/mm" updateField={updateField} ariaLabel="Data de Intubação" />
                    </div>
                  )}
                  {data.resp.suporte === 'CNL O2' && (
                    <div className="flex items-center gap-2 bg-sky-50 border border-sky-200 px-2 py-1 rounded-md">
                      <span className="text-[10px] font-bold text-sky-700 uppercase">Vazão:</span>
                      <InlineInput val={data.resp.vazaoO2} path="resp.vazaoO2" w="w-12" ph="L/m" updateField={updateField} type="number" ariaLabel="Vazão em Litros por minuto" />
                      <span className="text-xs font-bold text-sky-600" aria-hidden="true">L/min</span>
                    </div>
                  )}
                  {data.resp.suporte === 'CNAF' && (
                    <div className="flex flex-wrap items-center gap-4 bg-sky-50 border border-sky-200 px-3 py-1 rounded-md">
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-sky-700 uppercase">Vazão:</span>
                        <InlineInput val={data.resp.vazaoO2} path="resp.vazaoO2" w="w-10" ph="L/m" updateField={updateField} type="number" ariaLabel="Vazão O2" />
                        <span className="text-[10px] font-bold text-sky-600" aria-hidden="true">L/min</span>
                      </div>
                      <div className="hidden sm:block w-px h-4 bg-sky-300"></div>
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] font-bold text-sky-700 uppercase">FiO2:</span>
                        <InlineInput val={data.resp.fio2O2} path="resp.fio2O2" w="w-10" ph="%" updateField={updateField} type="number" ariaLabel="FiO2 percentagem" />
                        <span className="text-[10px] font-bold text-sky-600" aria-hidden="true">%</span>
                      </div>
                    </div>
                  )}
                </div>

                {data.resp.suporte === 'IOT + VM' && (
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 bg-sky-50/50 p-3 rounded-lg border border-sky-100 mt-1">
                    <div className="flex flex-col gap-1"><label htmlFor="vm-modo" className="text-[10px] font-bold uppercase text-sky-700">Modo</label><select id="vm-modo" className="bg-white border border-sky-200 rounded p-1 focus:outline-none focus:ring-2 focus:ring-sky-500 text-xs font-bold text-sky-900 dark-input" value={data.resp.vmModo || ''} onChange={(e) => updateField('resp.vmModo', e.target.value)}><option value="">-</option><option value="VCV">VCV</option><option value="PCV">PCV</option><option value="PRVC">PRVC</option><option value="PSV">PSV</option></select></div>
                    <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase text-sky-700">PEEP</span><InlineInput val={data.resp.vmPeep} path="resp.vmPeep" w="w-full" updateField={updateField} type="number" ariaLabel="PEEP" /></div>
                    <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase text-sky-700">FiO2 (%)</span><InlineInput val={data.resp.vmFio2} path="resp.vmFio2" w="w-full" updateField={updateField} type="number" ariaLabel="FiO2 ventilação" /></div>
                    <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase text-sky-700">Vol. Corr.</span><InlineInput val={data.resp.vmVc} path="resp.vmVc" w="w-full" updateField={updateField} type="number" ariaLabel="Volume Corrente" /></div>
                    <div className="flex flex-col gap-1"><span className="text-[10px] font-bold uppercase text-sky-700">P.Insp/PS</span><InlineInput val={data.resp.vmPinspPs} path="resp.vmPinspPs" w="w-full" updateField={updateField} type="number" ariaLabel="Pressão Inspiratória ou de Suporte" /></div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-3 bg-white p-3 rounded-xl border border-sky-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase text-sky-800">PaO2:</span>
                  <InlineInput val={data.resp.pao2} path="resp.pao2" w="w-10" updateField={updateField} type="number" ariaLabel="Pressão Parcial de Oxigênio (PaO2)" /> <span className="font-bold text-[10px] text-sky-600" aria-hidden="true">mmHg</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-sky-100"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase text-sky-800">FR:</span>
                  <InlineInput val={data.resp.fr1} path="resp.fr1" w="w-10" updateField={updateField} type="number" ariaLabel="Frequência Respiratória inicial" /> - <InlineInput val={data.resp.fr2} path="resp.fr2" w="w-10" updateField={updateField} type="number" ariaLabel="Frequência Respiratória final" />
                  {isHigh(data.resp.fr1, data.resp.fr2, 20) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded ml-1 animate-in fade-in" aria-label="Alerta FR alta">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />( <InlineInput val={data.resp.frX} path="resp.frX" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes FR maior que 20" /> x {'>'} 20 )
                    </span>
                  )}
                </div>
                <div className="hidden sm:block w-px h-6 bg-sky-100"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs uppercase text-sky-800">SpO2:</span>
                  <InlineInput val={data.resp.spo2} path="resp.spo2" w="w-10" updateField={updateField} type="number" ariaLabel="Saturação de Oxigênio (SpO2)" /> <span className="text-xs font-bold text-sky-600" aria-hidden="true">%</span>
                  {isLow(data.resp.spo2, '', 92) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded ml-1 animate-in fade-in" aria-label="Alerta SpO2 baixa">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />( <InlineInput val={data.resp.spo2X} path="resp.spo2X" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes SpO2 menor que 92" /> x {'<'} 92 )
                    </span>
                  )}
                </div>
              </div>

              <div className="flex flex-col gap-1">
                <label htmlFor="select-ausculta" className="font-bold text-[10px] uppercase text-sky-800">Ausculta Pulmonar:</label>
                <select id="select-ausculta" className="w-full bg-white border border-sky-200 p-2.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm font-bold text-sky-900 shadow-sm dark-input" value={data.resp.ausculta || ''} onChange={(e) => updateField('resp.ausculta', e.target.value)}>
                  <option value="">Selecione a ausculta...</option>
                  <option value="MV + BIlateralmente, SRA">MV + Bilateralmente, Sem Ruídos (SRA)</option>
                  <option value="MV + Bilateralmente, creptações bibasais">MV + Bilateralmente, creptações bibasais</option>
                  <option value="MV + Bilateralemtente, reduzido globalmente, sra">MV + Reduzido globalmente, SRA</option>
                  <option value="MV + Bilateralmente, Roncos difusos">MV + Bilateralmente, Roncos difusos</option>
                  <option value="MV + BIlateralmente, com Sibilos">MV + Bilateralmente, Sibilos</option>
                </select>
              </div>
              <NotasField sistemaNome="Respiratório" notasValue={data.resp.notas} showNotas={showNotas.resp} onToggle={() => toggleNotas('resp')} onUpdate={(val) => updateField('resp.notas', val)} />
            </div>
          </div>

          {/* HEMODINÂMICO */}
          <div className="bg-rose-50 border-l-4 border-rose-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid lg:col-span-2">
            <div className="flex items-center justify-between mb-4 border-b border-rose-200 pb-2">
              <h4 className="font-bold text-rose-800 uppercase tracking-widest text-sm flex items-center gap-2"><HeartPulse size={16} aria-hidden="true" /> Hemodinâmico</h4>
            </div>

            <Accordion title="Drogas Vasoativas (DVA)" icon={Droplets} count={(data.dvas || []).length} isOpen={expandedSections.dvas} onToggle={() => toggleSection('dvas')} colorClass="rose">
              {(!data.dvas || data.dvas.length === 0) && <span className="text-xs text-slate-400 italic block py-1">Nenhuma DVA em uso.</span>}
              {(data.dvas || []).map((dva, idx) => {
                const doseData = calcDoseInfusao(dva, DVA_DICT, data.peso);
                return (
                  <div key={idx} className="bg-white p-3 rounded-xl border border-rose-100 relative shadow-sm">
                    <button
                      onClick={() => removeInfusao('dvas', idx)}
                      aria-label={`Remover DVA ${dva.droga || 'sem nome'}`}
                      className="absolute top-3 right-3 text-red-300 hover:text-red-500 no-print transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                    >
                      <Trash2 size={14} aria-hidden="true" />
                    </button>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3 pr-6">
                      <div className="flex flex-col gap-1">
                        <label htmlFor={`dva-droga-${idx}`} className="text-[10px] font-bold text-rose-600 uppercase">Fármaco</label>
                        <select id={`dva-droga-${idx}`} className="bg-rose-50/50 border border-rose-200 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs font-bold text-rose-900 dark-input" value={dva.droga || ''} onChange={(e) => updateInfusao('dvas', idx, 'droga', e.target.value)}>
                          <option value="">Selecione...</option>
                          {Object.keys(DVA_DICT).map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                      </div>
                      {dva.droga && (
                        <div className="flex flex-col gap-1">
                          <label htmlFor={`dva-dilu-${idx}`} className="text-[10px] font-bold text-rose-600 uppercase">Diluição</label>
                          <select id={`dva-dilu-${idx}`} className="bg-rose-50/50 border border-rose-200 p-1.5 rounded focus:outline-none focus:ring-2 focus:ring-rose-500 text-xs text-rose-800 dark-input" value={dva.diluicao || 0} onChange={(e) => updateInfusao('dvas', idx, 'diluicao', e.target.value)}>
                            {DVA_DICT[dva.droga].diluicoes.map((dil, i) => <option key={i} value={i}>{dil.label}</option>)}
                          </select>
                        </div>
                      )}
                    </div>
                    {dva.droga && (
                      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-rose-50/30 p-2.5 rounded-lg border border-rose-100">
                        <div className="flex items-center gap-2 shrink-0 bg-white px-2 py-1 rounded border border-rose-100 shadow-sm">
                          <label htmlFor={`dva-vazao-${idx}`} className="font-bold text-[10px] uppercase text-rose-600">Vazão:</label>
                          <input id={`dva-vazao-${idx}`} type="number" step="0.1" className="w-14 border-b-2 border-rose-300 focus:border-rose-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 rounded text-center font-bold text-sm bg-transparent" placeholder="ml/h" value={dva.vazao || ''} onChange={(e) => updateInfusao('dvas', idx, 'vazao', e.target.value)} />
                          <span className="text-[10px] text-slate-500 font-bold" aria-hidden="true">ml/h</span>
                        </div>
                        <div className="flex-1 sm:border-l-2 border-rose-200 pl-3">
                          {doseData ? (
                            doseData.error ? <span className="text-[10px] font-bold text-red-500 flex items-center gap-1 bg-red-50 px-2 py-1 rounded w-fit"><AlertTriangle size={10} aria-hidden="true" /> {doseData.error}</span> :
                              <div className="flex flex-col"><span className="font-black text-rose-900 text-sm flex items-baseline gap-1" aria-label={`Dose calculada: ${doseData.value} ${doseData.unit}`}>{doseData.value} <span className="text-[10px] font-bold text-rose-600" aria-hidden="true">{doseData.unit}</span></span><span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md mt-1 w-fit ${doseData.isOk ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>Faixa Segura: {doseData.min} a {doseData.max}</span></div>
                          ) : <span className="text-[10px] text-slate-400 italic">Insira a vazão para calcular dose</span>}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
              <button
                onClick={() => addInfusao('dvas')}
                className="no-print w-full py-2 flex items-center justify-center gap-2 text-rose-600 bg-rose-100/50 hover:bg-rose-100 border-2 border-rose-200 border-dashed rounded-xl text-xs font-bold transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-rose-500"
              >
                <Plus size={14} aria-hidden="true" /> Adicionar Nova DVA
              </button>
            </Accordion>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-rose-900 bg-white p-4 rounded-xl border border-rose-100 shadow-sm mt-3">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2 border-b border-rose-50 pb-2">
                  <span className="font-bold text-xs uppercase text-rose-800 w-8">PAS:</span>
                  <InlineInput val={data.hemo.pas1} path="hemo.pas1" w="w-10" updateField={updateField} type="text" ariaLabel="Pressão Arterial Sistólica Máxima" />-<InlineInput val={data.hemo.pas2} path="hemo.pas2" w="w-10" updateField={updateField} type="text" ariaLabel="Pressão Arterial Sistólica Mínima" />
                  {isHigh(data.hemo.pas1, data.hemo.pas2, 180) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de pico hipertensivo PAS">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.pasX180} path="hemo.pasX180" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes PAS maior que 180" />x {'>'} 180)
                    </span>
                  )}
                  {isLow(data.hemo.pas1, data.hemo.pas2, 100) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de hipotensão PAS">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.pasX100} path="hemo.pasX100" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes PAS menor que 100" />x {'<'} 100)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-rose-50 pb-2">
                  <span className="font-bold text-xs uppercase text-rose-800 w-8">PAD:</span>
                  <InlineInput val={data.hemo.pad1} path="hemo.pad1" w="w-10" updateField={updateField} type="text" ariaLabel="Pressão Arterial Diastólica Máxima" />-<InlineInput val={data.hemo.pad2} path="hemo.pad2" w="w-10" updateField={updateField} type="text" ariaLabel="Pressão Arterial Diastólica Mínima" />
                  {isHigh(data.hemo.pad1, data.hemo.pad2, 120) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de pico PAD">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.padX120} path="hemo.padX120" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes PAD maior que 120" />x {'>'} 120)
                    </span>
                  )}
                  {isLow(data.hemo.pad1, data.hemo.pad2, 50) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de hipotensão PAD">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.padX50} path="hemo.padX50" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes PAD menor que 50" />x {'<'} 50)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 border-b border-rose-50 pb-2">
                  <span className="font-bold text-xs uppercase text-rose-800 w-8">PAm:</span>
                  <InlineInput val={data.hemo.pam1} path="hemo.pam1" w="w-10" updateField={updateField} type="text" ariaLabel="Pressão Arterial Média Máxima" />-<InlineInput val={data.hemo.pam2} path="hemo.pam2" w="w-10" updateField={updateField} type="text" ariaLabel="Pressão Arterial Média Mínima" />
                  {isHigh(data.hemo.pam1, data.hemo.pam2, 130) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de pico PAM">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.pamX130} path="hemo.pamX130" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes PAM maior que 130" />x {'>'} 130)
                    </span>
                  )}
                  {isLow(data.hemo.pam1, data.hemo.pam2, 65) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de hipotensão PAM">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.pamX65} path="hemo.pamX65" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes PAM menor que 65" />x {'<'} 65)
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-bold text-xs uppercase text-rose-800 w-8">FC:</span>
                  <InlineInput val={data.hemo.fc1} path="hemo.fc1" w="w-10" updateField={updateField} type="text" ariaLabel="Frequência Cardíaca Máxima" />-<InlineInput val={data.hemo.fc2} path="hemo.fc2" w="w-10" updateField={updateField} type="text" ariaLabel="Frequência Cardíaca Mínima" />
                  {isHigh(data.hemo.fc1, data.hemo.fc2, 100) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded animate-in fade-in" aria-label="Alerta de Taquicardia">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />(<InlineInput val={data.hemo.fcX100} path="hemo.fcX100" w="w-6" updateField={updateField} type="number" ariaLabel="Quantas vezes FC maior que 100" />x {'>'} 100)
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 sm:border-l-2 border-rose-100 sm:pl-4 pt-3 sm:pt-0 border-t-2 sm:border-t-0">
                <div className="flex flex-col gap-1">
                  <label htmlFor="hemo-ausc" className="font-bold text-[10px] uppercase text-rose-600">Ausculta Cardíaca:</label>
                  <input id="hemo-ausc" type="text" className="w-full bg-transparent border-b border-rose-300 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 rounded px-1 font-bold text-rose-900 dark-input" value={data.hemo.ausculta || ''} onChange={(e) => updateField('hemo.ausculta', e.target.value)} />
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="hemo-pele" className="font-bold text-[10px] uppercase text-rose-600">Pele, Pulso e Extremidades:</label>
                  <input id="hemo-pele" type="text" className="w-full bg-transparent border-b border-rose-300 focus:border-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500/30 rounded px-1 font-medium text-sm dark-input" value={data.hemo.pele || ''} onChange={(e) => updateField('hemo.pele', e.target.value)} />
                </div>
              </div>
            </div>
            <NotasField sistemaNome="Hemodinâmico" notasValue={data.hemo.notas} showNotas={showNotas.hemo} onToggle={() => toggleNotas('hemo')} onUpdate={(val) => updateField('hemo.notas', val)} />
          </div>

          {/* TGI / NUTRIÇÃO */}
          <div className="bg-amber-50 border-l-4 border-amber-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid">
            <h4 className="font-bold text-amber-800 uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-amber-200 pb-2"><Utensils size={16} aria-hidden="true" /> TGI / Nutrição</h4>
            <div className="space-y-4 text-sm text-amber-900">

              <div className="flex flex-col gap-4 bg-white p-4 rounded-xl border border-amber-100 shadow-sm">
                <div className="flex flex-wrap items-center gap-y-3 gap-x-6 border-b border-amber-50 pb-3">
                  <div className="flex flex-wrap items-center gap-2 flex-1 min-w-[200px]">
                    <label htmlFor="tgi-dieta" className="font-bold text-xs uppercase text-amber-800">Dieta:</label>
                    <select id="tgi-dieta" className="bg-amber-50/50 border border-amber-200 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold text-amber-900 dark-input" value={data.tgi.viaDieta || ''} onChange={(e) => updateField('tgi.viaDieta', e.target.value)}>
                      <option value="">Selecione...</option>
                      <option value="Jejum">Jejum</option>
                      <option value="Via oral">Via oral</option>
                      <option value="TNE - SNE">TNE - SNE</option>
                      <option value="TNE - GTT">TNE - GTT</option>
                      <option value="NPT">NPT</option>
                      <option value="Outra">Outra</option>
                    </select>

                    {data.tgi.viaDieta === 'Outra' && (
                      <input type="text" className="flex-1 min-w-[120px] border-b border-amber-300 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded px-1 bg-transparent placeholder:text-amber-300 text-sm font-medium ml-2 dark-input" placeholder="Especifique..." aria-label="Especifique a dieta" value={data.tgi.dietaOutra || ''} onChange={(e) => updateField('tgi.dietaOutra', e.target.value)} />
                    )}

                    {data.tgi.viaDieta && data.tgi.viaDieta !== 'Via oral' && data.tgi.viaDieta !== 'Jejum' && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md ml-auto sm:ml-0">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Vazão:</span>
                        <InlineInput val={data.tgi.vazaoDieta} path="tgi.vazaoDieta" w="w-12" ph="ml/h" updateField={updateField} type="number" ariaLabel="Vazão da dieta" />
                        <span className="text-[10px] font-bold text-amber-600" aria-hidden="true">ml/h</span>
                      </div>
                    )}
                  </div>

                  <div className="hidden sm:block w-px h-8 bg-amber-100"></div>

                  <div className="flex items-center gap-2">
                    <label htmlFor="tgi-aceita" className="font-bold text-[10px] uppercase text-amber-700">Aceitação:</label>
                    <select id="tgi-aceita" className="bg-amber-50/50 border border-amber-200 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold text-amber-900 dark-input" value={data.tgi.aceitacao || ''} onChange={(e) => updateField('tgi.aceitacao', e.target.value)}>
                      <option value="">-</option>
                      <option value="Boa">Boa</option>
                      <option value="Regular">Regular</option>
                      <option value="Ruim">Ruim</option>
                      <option value="Recusa">Recusa</option>
                      <option value="Pausa">Pausa</option>
                    </select>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-y-3 gap-x-6">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-[10px] uppercase text-amber-700">Bilirrubina:</span>
                    <InlineInput val={data.tgi.bb} path="tgi.bb" w="w-12" updateField={updateField} type="text" ariaLabel="Bilirrubina Total" />
                  </div>

                  <div className="hidden sm:block w-px h-8 bg-amber-100"></div>

                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs uppercase text-amber-800">DX:</span>
                    <InlineInput val={data.tgi.dx} path="tgi.dx" w="w-12" updateField={updateField} type="text" ariaLabel="Dextrostris / Glicemia" /> <span className="font-bold text-xs text-amber-600" aria-hidden="true">mg/dL</span>
                    {isHigh(data.tgi.dx, '', 180) && (
                      <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded ml-1 animate-in fade-in" aria-label="Alerta de Hiperglicemia">
                        <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />( <InlineInput val={data.tgi.dxX180} path="tgi.dxX180" w="w-6" updateField={updateField} type="number" ariaLabel="Vezes dextrostris maior que 180" /> x {'>'} 180 )
                      </span>
                    )}
                  </div>

                  <div className="hidden sm:block w-px h-8 bg-amber-100"></div>

                  <div className="flex items-center gap-2 flex-1">
                    <label htmlFor="tgi-evacua" className="font-bold text-[10px] uppercase text-amber-700">Evacuações:</label>
                    <select id="tgi-evacua" className="bg-amber-50/50 border border-amber-200 p-1.5 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-bold text-amber-900 dark-input" value={data.tgi.evacuou || ''} onChange={(e) => updateField('tgi.evacuou', e.target.value)}>
                      <option value="">-</option>
                      <option value="Sim">Sim</option>
                      <option value="Não">Não</option>
                    </select>

                    {data.tgi.evacuou === 'Sim' && (
                      <div className="flex flex-wrap items-center gap-2 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md ml-2">
                        <InlineInput val={data.tgi.evacuacoesNum} path="tgi.evacuacoesNum" w="w-6" ph="Nº" updateField={updateField} type="number" ariaLabel="Número de evacuações" />
                        <span className="text-[10px] font-bold text-amber-600" aria-hidden="true">x</span>
                        <div className="w-px h-3 bg-amber-300 mx-1"></div>
                        <input type="text" className="w-20 sm:w-28 border-b border-amber-300 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded px-1 bg-transparent text-xs font-medium dark-input" placeholder="Ex: Pastosa" aria-label="Aspecto das fezes" value={data.tgi.evacuacoesAspecto || ''} onChange={(e) => updateField('tgi.evacuacoesAspecto', e.target.value)} />
                      </div>
                    )}

                    {data.tgi.evacuou === 'Não' && (
                      <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 px-2 py-1 rounded-md ml-2">
                        <span className="text-[10px] font-bold text-amber-700 uppercase">Data últ:</span>
                        <InlineInput val={data.tgi.evacuacoesDataUltima} path="tgi.evacuacoesDataUltima" w="w-14" ph="dd/mm" updateField={updateField} ariaLabel="Data da última evacuação" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-1 mt-3 px-1">
                <label htmlFor="tgi-exame" className="text-[10px] font-bold uppercase text-amber-600">Exame Físico Abdome:</label>
                <input id="tgi-exame" type="text" className="w-full bg-transparent border-b border-amber-300 focus:border-amber-600 focus:outline-none focus:ring-2 focus:ring-amber-500/30 rounded px-1 text-sm font-medium text-amber-900 dark-input" value={data.tgi.abdome || ''} onChange={(e) => updateField('tgi.abdome', e.target.value)} />
              </div>

              <NotasField sistemaNome="TGI/Nutrição" notasValue={data.tgi.notas} showNotas={showNotas.tgi} onToggle={() => toggleNotas('tgi')} onUpdate={(val) => updateField('tgi.notas', val)} />
            </div>
          </div>

          {/* RENAL / METABÓLICO */}
          <div className="bg-lime-50 border-l-4 border-lime-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid">
            <h4 className="font-bold text-lime-800 uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-lime-200 pb-2"><Beaker size={16} aria-hidden="true" /> Renal / Metabólico</h4>
            <div className="space-y-4 text-sm text-lime-900">

              <div className="flex flex-col sm:flex-row gap-4 bg-white p-4 rounded-xl border border-lime-100 shadow-sm">
                <div className="flex flex-col gap-3 justify-center min-w-[110px]">
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6 text-right text-xs uppercase text-lime-800">Ur:</span>
                    <InlineInput val={data.renal.ur1} path="renal.ur1" w="w-10" updateField={updateField} ariaLabel="Ureia recente" /> {'>'} <InlineInput val={data.renal.ur2} path="renal.ur2" w="w-10" updateField={updateField} ariaLabel="Ureia prévia 1" /> {'>'} <InlineInput val={data.renal.ur3} path="renal.ur3" w="w-10" updateField={updateField} ariaLabel="Ureia prévia 2" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold w-6 text-right text-xs uppercase text-lime-800">CR:</span>
                    <InlineInput val={data.renal.cr1} path="renal.cr1" w="w-10" updateField={updateField} ariaLabel="Creatinina recente" /> {'>'} <InlineInput val={data.renal.cr2} path="renal.cr2" w="w-10" updateField={updateField} ariaLabel="Creatinina prévia 1" /> {'>'} <InlineInput val={data.renal.cr3} path="renal.cr3" w="w-10" updateField={updateField} ariaLabel="Creatinina prévia 2" />
                  </div>
                </div>

                <div className="hidden sm:block w-px bg-lime-100"></div>
                <div className="sm:hidden h-px w-full bg-lime-100"></div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 flex-1 items-center">
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase text-lime-600 w-5">Mg</span><InlineInput val={data.renal.mg} path="renal.mg" w="w-full max-w-[60px]" updateField={updateField} ariaLabel="Magnésio" /></div>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase text-lime-600 w-5">Na</span><InlineInput val={data.renal.na} path="renal.na" w="w-full max-w-[60px]" updateField={updateField} ariaLabel="Sódio" /></div>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase text-lime-600 w-5">Cai</span><InlineInput val={data.renal.cai} path="renal.cai" w="w-full max-w-[60px]" updateField={updateField} ariaLabel="Cálcio Iônico" /></div>
                  <div className="flex items-center gap-2"><span className="text-[10px] font-bold uppercase text-lime-600 w-5">K</span><InlineInput val={data.renal.k} path="renal.k" w="w-full max-w-[60px]" updateField={updateField} ariaLabel="Potássio" /></div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-3 bg-white p-3 rounded-xl border border-lime-100 shadow-sm">
                <div className="flex items-center gap-2 flex-wrap">
                  <label htmlFor="renal-diurese-tipo" className="font-bold text-[10px] uppercase text-lime-600">Diurese:</label>
                  <select id="renal-diurese-tipo" className="bg-lime-50/50 border border-lime-200 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-lime-500 text-xs font-bold text-lime-900 print:appearance-none print:border-none print:bg-transparent dark-input" value={data.renal.tipoDiurese || ''} onChange={(e) => updateField('renal.tipoDiurese', e.target.value)}>
                    <option value="">Tipo...</option>
                    <option value="Espontânea">Espontânea</option>
                    <option value="SVD">SVD</option>
                    <option value="TRS">TRS</option>
                  </select>

                  <div className="flex items-center bg-lime-50 border border-lime-200 px-2 py-1 rounded-md">
                    <InlineInput val={data.renal.diureseHoras} path="renal.diureseHoras" w="w-6" updateField={updateField} type="number" ariaLabel="Horas de diurese recolhida" />
                    <span className="text-[10px] text-lime-600 font-bold mr-2" aria-hidden="true">h:</span>
                    <input type="text" className="w-16 border-b-2 border-lime-300 focus:border-lime-600 focus:outline-none focus:ring-2 focus:ring-lime-500/50 rounded px-1 text-center bg-transparent font-black text-[15px] text-lime-900 dark-input" value={data.renal.diurese || ''} onChange={(e) => updateField('renal.diurese', e.target.value)} aria-label="Volume de diurese em ml" />
                    <span className="text-[10px] text-lime-600 font-bold ml-1" aria-hidden="true">ml</span>
                  </div>
                </div>

                <div className="hidden sm:block w-px h-6 bg-lime-200"></div>

                <div className="flex items-center gap-2 bg-lime-50 border border-lime-200 px-2 py-1.5 rounded-md">
                  <span className="font-bold text-[10px] uppercase text-lime-600">Balanço H. (BH):</span>
                  <InlineInput val={data.renal.bh} path="renal.bh" w="w-14" updateField={updateField} type="text" ariaLabel="Balanço Hídrico em ml" />
                  <span className="text-[10px] font-bold text-lime-600" aria-hidden="true">ml</span>
                </div>

                <div className="w-full sm:w-auto bg-lime-600 px-3 py-1.5 rounded-lg flex items-center justify-center gap-2 sm:ml-auto shadow-sm" aria-label={`Taxa de Diurese Efetiva calculada: ${calcDiureseEfetiva(data.renal.diurese, data.peso, data.renal.diureseHoras)} ml por kg por hora`}>
                  <span className="font-bold text-[10px] uppercase text-lime-100" aria-hidden="true">Ef:</span>
                  <span className="font-black text-white" aria-hidden="true">{calcDiureseEfetiva(data.renal.diurese, data.peso, data.renal.diureseHoras)}</span> <span className="text-[10px] font-bold text-lime-200" aria-hidden="true">ml/kg/h</span>
                </div>
              </div>

              <NotasField sistemaNome="Renal" notasValue={data.renal.notas} showNotas={showNotas.renal} onToggle={() => toggleNotas('renal')} onUpdate={(val) => updateField('renal.notas', val)} />
            </div>
          </div>

          {/* HEMATO */}
          <div className="bg-pink-50 border-l-4 border-pink-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid">
            <h4 className="font-bold text-pink-800 uppercase tracking-widest text-sm flex items-center gap-2 mb-4 border-b border-pink-200 pb-2"><TestTube size={16} aria-hidden="true" /> Hemato</h4>
            <div className="space-y-4 text-sm text-pink-900">
              <div className="flex flex-wrap items-center justify-between sm:justify-start sm:gap-8 gap-y-3 bg-white p-4 rounded-xl border border-pink-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase text-pink-600">Hb:</span>
                  <InlineInput val={data.hemato.hb1} path="hemato.hb1" w="w-12" updateField={updateField} type="text" ariaLabel="Hemoglobina" />
                  <span className="text-[10px] font-bold text-pink-600" aria-hidden="true">g/dL</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-pink-100"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase text-pink-600">HT:</span>
                  <InlineInput val={data.hemato.ht1} path="hemato.ht1" w="w-12" updateField={updateField} type="text" ariaLabel="Hematócrito" />
                  <span className="text-[10px] font-bold text-pink-600" aria-hidden="true">%</span>
                </div>
                <div className="hidden sm:block w-px h-6 bg-pink-100"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase text-pink-600">Plaq:</span>
                  <InlineInput val={data.hemato.plaq1} path="hemato.plaq1" w="w-16" updateField={updateField} type="text" ariaLabel="Plaquetas" />
                </div>
              </div>

              <div className="flex flex-col gap-2 bg-white/50 p-3 rounded-xl border border-pink-100">
                <span className="font-bold text-[10px] uppercase text-pink-800 mb-1 block">Profilaxias</span>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-pink-50 shadow-sm focus-within:ring-2 focus-within:ring-pink-500">
                  <div className="bg-pink-100 p-1.5 rounded-md text-pink-600" aria-hidden="true"><ShieldAlert size={14} /></div>
                  <select aria-label="Profilaxia TVP" className="flex-1 bg-transparent outline-none font-bold text-xs text-pink-900 dark-input" value={data.hemato.profilaxiaTvp || ''} onChange={(e) => updateField('hemato.profilaxiaTvp', e.target.value)}>
                    <option value="">TVP (Nenhuma selecionada)</option>
                    <option value="Enoxaparina 40mg">Enoxaparina 40mg</option>
                    <option value="Heparina SC 5000UI">Heparina SC 5000UI</option>
                    <option value="Compressão Mecânica">Compressão Mecânica</option>
                  </select>
                </div>
                <div className="flex items-center gap-3 bg-white p-1.5 rounded-lg border border-pink-50 shadow-sm focus-within:ring-2 focus-within:ring-pink-500">
                  <div className="bg-pink-100 p-1.5 rounded-md text-pink-600" aria-hidden="true"><Pill size={14} /></div>
                  <select aria-label="Profilaxia de Úlcera" className="flex-1 bg-transparent outline-none font-bold text-xs text-pink-900 dark-input" value={data.hemato.profilaxiaUlcera || ''} onChange={(e) => updateField('hemato.profilaxiaUlcera', e.target.value)}>
                    <option value="">Úlcera (Nenhuma selecionada)</option>
                    <option value="Omeprazol 40mg">Omeprazol 40mg</option>
                    <option value="Pantoprazol 40mg">Pantoprazol 40mg</option>
                    <option value="Ranitidina">Ranitidina</option>
                  </select>
                </div>
              </div>
              <NotasField sistemaNome="Hematológico" notasValue={data.hemato.notas} showNotas={showNotas.hemato} onToggle={() => toggleNotas('hemato')} onUpdate={(val) => updateField('hemato.notas', val)} />
            </div>
          </div>

          {/* INFECTO */}
          <div className="bg-teal-50 border-l-4 border-teal-500 rounded-r-xl p-4 shadow-sm print-break-inside-avoid">
            <div className="flex items-center justify-between mb-4 border-b border-teal-200 pb-2">
              <h4 className="font-bold text-teal-800 uppercase tracking-widest text-sm flex items-center gap-2"><Bug size={16} aria-hidden="true" /> Infecto</h4>
            </div>

            <div className="space-y-4 text-sm text-teal-900">

              <div className="flex flex-wrap items-center justify-between sm:justify-start sm:gap-8 gap-y-3 bg-white p-4 rounded-xl border border-teal-100 shadow-sm">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase text-teal-600">Tax:</span>
                  <InlineInput val={data.infecto.tmax} path="infecto.tmax" w="w-12" updateField={updateField} type="text" ariaLabel="Temperatura Máxima" />
                  <span className="font-bold text-[10px] text-teal-600" aria-hidden="true">°C</span>
                  {isHigh(data.infecto.tmax, '', 38) && (
                    <span className="inline-flex items-center gap-0.5 text-[10px] font-bold bg-red-50 text-red-700 border border-red-200 px-1.5 py-0.5 rounded ml-2 animate-in fade-in" aria-label="Alerta de Febre">
                      <AlertTriangle size={10} className="text-red-500" aria-hidden="true" />( <InlineInput val={data.infecto.tmaxX38} path="infecto.tmaxX38" w="w-6" updateField={updateField} type="number" ariaLabel="Vezes temperatura maior que 38" /> x {'>'} 38 )
                    </span>
                  )}
                </div>
                <div className="hidden sm:block w-px h-6 bg-teal-100"></div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[10px] uppercase text-teal-600">Leucócitos:</span>
                  <InlineInput val={data.infecto.leuco1} path="infecto.leuco1" w="w-16" updateField={updateField} type="text" ariaLabel="Contagem de Leucócitos" />
                  <span className="text-[10px] font-bold text-teal-600" aria-hidden="true">/µL</span>
                </div>
              </div>

              <Accordion title="Antibióticos & Culturas" icon={Microscope} count={(data.infecto.atbs || []).length + (data.infecto.culturas || []).length} isOpen={expandedSections.infecto} onToggle={() => toggleSection('infecto')} colorClass="teal">
                <div className="mb-4 border-b border-teal-100 pb-4">
                  <h5 className="text-[10px] font-bold text-teal-600 uppercase mb-3 flex items-center gap-1"><Activity size={12} aria-hidden="true" /> Antibioticoterapia Ativa</h5>
                  {(!data.infecto.atbs || data.infecto.atbs.length === 0) && <span className="text-xs text-slate-400 italic block mb-2">Nenhum ATB em uso.</span>}

                  {(data.infecto.atbs || []).map((atb, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-teal-100 relative shadow-sm mb-2">
                      <button
                        onClick={() => removeAtb(idx)}
                        aria-label={`Remover antibiótico ${atb.nome || 'sem nome'}`}
                        className="absolute top-3 right-3 text-red-300 hover:text-red-500 no-print transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>

                      <div className="flex flex-col sm:flex-row gap-3 pr-6">
                        <div className="flex flex-col gap-1 flex-[2] min-w-[140px]">
                          <label htmlFor={`atb-nome-${idx}`} className="text-[10px] font-bold text-teal-500 uppercase">Fármaco</label>
                          <select id={`atb-nome-${idx}`} className="bg-teal-50/50 border border-teal-200 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold text-teal-900 w-full dark-input" value={atb.nome || ''} onChange={(e) => updateAtb(idx, 'nome', e.target.value)}>
                            <option value="">Selecionar...</option>
                            <option value="Meropenem">Meropenem</option>
                            <option value="Pip-Tazo">Pip-Tazo</option>
                            <option value="Vancomicina">Vancomicina</option>
                            <option value="Ceftriaxona">Ceftriaxona</option>
                            <option value="Cefepime">Cefepime</option>
                            <option value="Polimixina B">Polimixina B</option>
                            <option value="Linezolida">Linezolida</option>
                            <option value="Outro">Outro...</option>
                          </select>
                          {atb.nome === 'Outro' && (
                            <input type="text" aria-label="Nome personalizado do ATB" className="border-b border-teal-300 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 rounded px-1 bg-transparent text-xs font-bold mt-1 dark-input" placeholder="Escreva o nome..." value={atb.nomePersonalizado || ''} onChange={(e) => updateAtb(idx, 'nomePersonalizado', e.target.value)} />
                          )}
                        </div>

                        <div className="flex flex-col gap-1 flex-1 min-w-[100px]">
                          <label htmlFor={`atb-dose-${idx}`} className="text-[10px] font-bold text-teal-500 uppercase">Dose</label>
                          <input id={`atb-dose-${idx}`} type="text" className="w-full bg-teal-50 border border-teal-100 px-2 py-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-medium dark-input" placeholder="Ex: 1g 12/12h" value={atb.dose || ''} onChange={(e) => updateAtb(idx, 'dose', e.target.value)} />
                        </div>

                        <div className="flex flex-col gap-1 w-16 shrink-0">
                          <label htmlFor={`atb-dia-${idx}`} className="text-[10px] font-bold text-teal-500 uppercase text-center">Dia</label>
                          <div className="flex items-center justify-center bg-teal-50 border border-teal-100 px-1 py-1.5 rounded-md">
                            <span className="font-bold text-teal-800 text-[10px] mr-1" aria-hidden="true">D</span>
                            <input id={`atb-dia-${idx}`} type="number" className="w-6 border-b-2 border-teal-300 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/50 rounded px-1 text-center bg-transparent font-bold text-sm dark-input" placeholder="1" value={atb.dias || ''} onChange={(e) => updateAtb(idx, 'dias', e.target.value)} />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    onClick={addAtb}
                    className="no-print w-full py-2 mt-2 flex items-center justify-center gap-2 text-teal-600 bg-teal-100/50 hover:bg-teal-100 border-2 border-teal-200 border-dashed rounded-xl text-xs font-bold transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <Plus size={14} aria-hidden="true" /> Adicionar ATB
                  </button>
                </div>

                <div>
                  <h5 className="text-[10px] font-bold text-teal-600 uppercase mb-3 flex items-center gap-1"><TestTube size={12} aria-hidden="true" /> Monitorização de Culturas</h5>
                  {(!data.infecto.culturas || data.infecto.culturas.length === 0) && <span className="text-xs text-slate-400 italic block mb-2">Nenhuma cultura registada.</span>}

                  {(data.infecto.culturas || []).map((cult, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-teal-100 relative shadow-sm mb-2">
                      <button
                        onClick={() => removeCultura(idx)}
                        aria-label={`Remover cultura tipo ${cult.tipo || 'sem tipo'}`}
                        className="absolute top-3 right-3 text-red-300 hover:text-red-500 no-print transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
                      >
                        <Trash2 size={14} aria-hidden="true" />
                      </button>

                      <div className="flex flex-wrap items-center gap-3 pr-6">
                        <input type="text" aria-label="Tipo de Cultura" className="w-16 sm:w-20 border-b-2 border-teal-200 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/30 rounded px-1 bg-transparent text-sm font-bold uppercase text-teal-900 dark-input" placeholder="Tipo" value={cult.tipo || ''} onChange={(e) => updateCultura(idx, 'tipo', e.target.value)} />

                        <div className="flex items-center gap-1 bg-teal-50 px-2 py-1 rounded-md border border-teal-100">
                          <label htmlFor={`cult-data-${idx}`} className="text-[10px] font-bold text-teal-600">Data:</label>
                          <input id={`cult-data-${idx}`} type="text" className="w-14 border-b border-teal-300 focus:border-teal-600 focus:outline-none focus:ring-2 focus:ring-teal-500/30 rounded px-1 bg-transparent text-xs text-center font-medium dark-input" placeholder="dd/mm" value={cult.data || ''} onChange={(e) => updateCultura(idx, 'data', e.target.value)} />
                        </div>

                        <select aria-label="Status da cultura" className="flex-1 min-w-[130px] bg-teal-50 border border-teal-200 p-1.5 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-500 text-xs font-bold text-teal-900 dark-input" value={cult.status || ''} onChange={(e) => updateCultura(idx, 'status', e.target.value)}>
                          <option value="">Status da Cultura...</option>
                          <option value="Em andamento">Em andamento</option>
                          <option value="Negativa">Negativa</option>
                          <option value="Parcial">Parcial</option>
                          <option value="Parcial positiva">Parcial positiva</option>
                          <option value="Positiva">Positiva</option>
                        </select>
                      </div>

                      {(cult.status === 'Parcial positiva' || cult.status === 'Positiva') && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-yellow-50 p-2.5 rounded-lg border border-yellow-200 mt-3 animate-in fade-in">
                          <label htmlFor={`cult-det-${idx}`} className="text-[10px] font-bold text-yellow-800 uppercase shrink-0 flex items-center gap-1"><AlertTriangle size={12} className="text-yellow-600" aria-hidden="true" />Isolamento:</label>
                          <input id={`cult-det-${idx}`} type="text" className="flex-1 bg-transparent border-b border-yellow-300 focus:border-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-500/30 rounded px-1 text-xs text-yellow-900 font-medium w-full dark-input" placeholder="Ex: E. coli ESBL / Antibiograma em curso..." value={cult.detalhe || ''} onChange={(e) => updateCultura(idx, 'detalhe', e.target.value)} />
                        </div>
                      )}
                    </div>
                  ))}

                  <button
                    onClick={addCultura}
                    className="no-print w-full py-2 mt-2 flex items-center justify-center gap-2 text-teal-600 bg-teal-100/50 hover:bg-teal-100 border-2 border-teal-200 border-dashed rounded-xl text-xs font-bold transition-all hover:scale-[1.01] focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <Plus size={14} aria-hidden="true" /> Adicionar Cultura
                  </button>
                </div>
              </Accordion>

              <NotasField sistemaNome="Infecciologia" notasValue={data.infecto.notas} showNotas={showNotas.infecto} onToggle={() => toggleNotas('infecto')} onUpdate={(val) => updateField('infecto.notas', val)} />
            </div>
          </div>

        </div>

        {/* SESSÕES DE TEXTO LIVRE */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-8 p-3 sm:p-6 pt-0 sm:pt-0 bg-slate-50 print:bg-white">

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print-break-inside-avoid">
            <h4 className="font-bold text-red-600 uppercase tracking-widest text-sm flex items-center gap-2 mb-3 border-b border-red-100 pb-2"><AlertCircle size={16} aria-hidden="true" /> Problemas Ativos</h4>
            <div className="space-y-2">
              {(data.impressao || ['', '', '', '']).map((linha, i) => (
                <div key={`imp-${i}`} className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold" aria-hidden="true">{i + 1}.</span>
                  <input type="text" aria-label={`Problema ativo ${i + 1}`} className="flex-1 bg-slate-50 border-b border-slate-200 focus:border-red-400 focus:bg-red-50/30 focus:outline-none focus:ring-2 focus:ring-red-400/30 py-1 px-2 rounded transition-colors text-sm font-medium print:bg-transparent print:border-none dark-input" value={linha || ''} onChange={(e) => updateArrayField('impressao', i, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm print-break-inside-avoid">
            <h4 className="font-bold text-emerald-600 uppercase tracking-widest text-sm flex items-center gap-2 mb-3 border-b border-emerald-100 pb-2"><ListChecks size={16} aria-hidden="true" /> Plano 12-24h</h4>
            <div className="space-y-2">
              {(data.conduta || ['', '', '', '']).map((linha, i) => (
                <div key={`cond-${i}`} className="flex items-center gap-2">
                  <span className="text-slate-300 font-bold" aria-hidden="true">{i + 1}.</span>
                  <input type="text" aria-label={`Passo do plano ${i + 1}`} className="flex-1 bg-slate-50 border-b border-slate-200 focus:border-emerald-400 focus:bg-emerald-50/30 focus:outline-none focus:ring-2 focus:ring-emerald-400/30 py-1 px-2 rounded transition-colors text-sm font-medium print:bg-transparent print:border-none dark-input" value={linha || ''} onChange={(e) => updateArrayField('conduta', i, e.target.value)} />
                </div>
              ))}
            </div>
          </div>

          <div className="bg-orange-50/50 border border-orange-200 rounded-xl p-4 shadow-sm md:col-span-2 print-break-inside-avoid">
            <h4 className="font-bold text-orange-600 uppercase tracking-widest text-sm flex items-center gap-2 mb-3 border-b border-orange-200 pb-2"><ClipboardList size={16} aria-hidden="true" /> Pendências / Riscos e contingências</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
              {(data.pendencias || []).map((pend, i) => (
                <div key={`pend-${i}`} className="flex items-center gap-3 bg-white p-2 rounded-lg border border-orange-100 shadow-sm print:shadow-none print:border-none focus-within:ring-2 focus-within:ring-orange-500">
                  <input
                    id={`pend-check-${i}`}
                    type="checkbox"
                    aria-label={`Marcar pendência ${i + 1} como concluída`}
                    className="w-5 h-5 text-orange-500 rounded cursor-pointer accent-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500"
                    checked={pend.checked || false}
                    onChange={(e) => updateArrayField('pendencias', i, e.target.checked, 'checked')}
                  />
                  <input
                    type="text"
                    aria-label={`Descrição da pendência ${i + 1}`}
                    className="flex-1 bg-transparent border-b border-orange-200 focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-500/30 rounded px-1 text-sm font-medium text-orange-900 placeholder:text-orange-300 print:border-none dark-input"
                    value={pend.text || ''}
                    onChange={(e) => updateArrayField('pendencias', i, e.target.value, 'text')}
                    placeholder={`Descreva a pendência...`}
                  />
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}