// ============================================================================
// SASI · clinicalExtract — extrai dados estruturados de evoluções/dashboard
// Alimenta as 5 janelas: tabelão serial, vitais, terapias, passagem 3-linhas
// ============================================================================
import type {
  DashboardRow,
  Evolucao,
  PatientSummary,
  Pendencia,
  PrescricaoItem,
  SasiCondutaSistema,
  SasiProblemaAtivo,
  SystemKey,
} from './supabaseClient';
import { clinicalText, clinicalNum, clinicalRange, hasClinicalContent } from './clinicalFormat';
import { severityLabel } from './severity';
import {
  TABELAO_LABS, emptyPrescricaoItems, emptyPlanilhaoVitais,
  type TabelaoLabDef, type PlanilhaoVitalRow, type TabelaoLabCell,
} from './sasiSchema';

type R = Record<string, unknown>;

const LAB_KEYS: Array<{ key: string; label: string; systems: SystemKey[] }> = [
  { key: 'hb', label: 'Hb', systems: ['hemato'] },
  { key: 'ht', label: 'Ht', systems: ['hemato'] },
  { key: 'leucocitos', label: 'Leuc', systems: ['hemato', 'infecto'] },
  { key: 'plaquetas', label: 'Plaq', systems: ['hemato'] },
  { key: 'creatinina', label: 'Cr', systems: ['renal'] },
  { key: 'ureia', label: 'Ur', systems: ['renal'] },
  { key: 'k', label: 'K⁺', systems: ['renal'] },
  { key: 'na', label: 'Na⁺', systems: ['renal'] },
  { key: 'lactato', label: 'Lac', systems: ['hemo'] },
  { key: 'pcr', label: 'PCR', systems: ['infecto'] },
  { key: 'procalcitonina', label: 'PCT', systems: ['infecto'] },
];

const SYSTEM_KEYS: SystemKey[] = ['neuro', 'resp', 'hemo', 'tgi', 'renal', 'hemato', 'infecto'];

export interface VitalDisplay {
  label: string;
  value: string;
}

export interface LabSerialRow {
  param: string;
  values: string[];
  dates: string[];
}

/** Linha do tabelão no formato Excel: Exame | Val1 | Val2 | Unid | Ref | Tend | Alerta */
export interface TabelaoRow {
  exame: string;
  unidade: string;
  ref: string;
  val1: string;
  val2: string;
  tendencia: string;
  alerta: string;
  /** Colunas seriais adicionais (datas anteriores) */
  historico?: Array<{ data: string; valor: string }>;
}

export interface Passagem3Linhas {
  linha1: string;
  linha2: string;
  linha3: string;
}

function fmtDate(iso: string | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getSystemData(evol: Evolucao | null, sys: SystemKey): R {
  return (evol?.[sys] ?? {}) as R;
}

export function extractDiagnosticoPrincipal(row: DashboardRow): string {
  const snapshot = row.sofa_snapshot as R | undefined;
  const principais = snapshot?.problemas_principais;
  if (Array.isArray(principais) && principais.length > 0) {
    return String(principais[0]);
  }
  const problemas = snapshot?.problemas_ativos as SasiProblemaAtivo[] | undefined;
  if (Array.isArray(problemas) && problemas.length > 0) {
    return problemas[0].texto;
  }
  return row.hd ?? '—';
}

export function extractDispositivos(
  row: DashboardRow,
  summary?: PatientSummary | null
): string[] {
  const fromSummary = summary?.dispositivos?.map(d => {
    const loc = d.local ? ` (${d.local})` : '';
    return `${d.tipo}${loc}`;
  }) ?? [];

  if (fromSummary.length > 0) return fromSummary;

  const snapshot = row.sofa_snapshot as R | undefined;
  const items: string[] = [];
  const resp = snapshot?.resp as R | undefined;
  const suporte = clinicalText(resp?.suporte ?? resp?.modo_ventilatorio ?? resp?.via_aerea);
  if (suporte) items.push(suporte);

  const tgi = snapshot?.tgi as R | undefined;
  for (const k of ['sng_gtd', 'sne', 'gtt', 'dreno']) {
    const v = clinicalText(tgi?.[k]);
    if (v) items.push(`${k.toUpperCase()}: ${v}`);
  }
  return items;
}

export function extractVitals(evol: Evolucao | null): VitalDisplay[] {
  if (!evol) return [];
  const hemo = getSystemData(evol, 'hemo');
  const resp = getSystemData(evol, 'resp');
  const renal = getSystemData(evol, 'renal');

  const vitals: VitalDisplay[] = [];

  const pasRange = clinicalRange(hemo.pas);
  const padRange = clinicalRange(hemo.pad);
  const pamRange = clinicalRange(hemo.pam);
  const fcRange = clinicalRange(hemo.fc);
  const frRange = clinicalRange(resp.fr);
  const spo2Range = clinicalRange(resp.spo2);

  if (pasRange) vitals.push({ label: 'PAS', value: formatRange(pasRange) });
  if (padRange) vitals.push({ label: 'PAD', value: formatRange(padRange) });
  if (pamRange) vitals.push({ label: 'PAM', value: formatRange(pamRange) });
  if (fcRange) vitals.push({ label: 'FC', value: formatRange(fcRange) });
  if (frRange) vitals.push({ label: 'FR', value: formatRange(frRange) });
  if (spo2Range) vitals.push({ label: 'SpO₂', value: formatRange(spo2Range) });

  const diurese = clinicalNum(renal.diurese_24h ?? renal.diurese_total_ml ?? renal.diurese);
  if (diurese != null) vitals.push({ label: 'Diurese 24h', value: `${diurese} ml` });

  const bh = clinicalNum(renal.bh_ml ?? renal.balanco_hidrico ?? renal.bh);
  if (bh != null) vitals.push({ label: 'BH 24h', value: `${bh > 0 ? '+' : ''}${bh} ml` });

  return vitals;
}

function formatRange(r: { min: number | null; max: number | null }): string {
  const { min, max } = r;
  if (min != null && max != null) {
    const lo = Math.min(min, max);
    const hi = Math.max(min, max);
    return lo === hi ? String(hi) : `${hi}–${lo}`;
  }
  return String(max ?? min ?? '—');
}

export function extractTerapias(evol: Evolucao | null): string[] {
  if (!evol) return [];
  const lines: string[] = [];

  for (const d of (evol.dvas ?? []) as unknown[]) {
    if (typeof d === 'string') lines.push(d);
    else {
      const o = d as R;
      const droga = o.droga ?? o.nome;
      const vazao = o.vazao ? ` ${o.vazao} ml/h` : '';
      if (droga) lines.push(`${droga}${vazao}`);
    }
  }
  for (const s of (evol.sedativos ?? []) as unknown[]) {
    if (typeof s === 'string') lines.push(`Sed: ${s}`);
    else {
      const o = s as R;
      const droga = o.droga ?? o.nome;
      if (droga) lines.push(`Sed: ${droga}`);
    }
  }

  const infecto = getSystemData(evol, 'infecto');
  const atb = clinicalText(infecto.atb_atual ?? infecto.atb ?? infecto.atbs);
  if (atb) lines.push(`ATB: ${atb}`);

  const resp = getSystemData(evol, 'resp');
  const vm = clinicalText(resp.suporte ?? resp.modo_ventilatorio);
  if (vm) lines.push(`VM: ${vm}`);

  return lines;
}

export function extractLabsDodia(evol: Evolucao | null): Array<{ label: string; value: string }> {
  if (!evol) return [];
  const out: Array<{ label: string; value: string }> = [];

  for (const { key, label, systems } of LAB_KEYS) {
    for (const sys of systems) {
      const data = getSystemData(evol, sys);
      const val = data[key];
      if (hasClinicalContent(val)) {
        out.push({ label, value: clinicalText(val) });
        break;
      }
    }
  }
  return out;
}

function findLabValue(data: R, def: TabelaoLabDef): unknown {
  for (const alias of def.aliases) {
    const v = data[alias];
    if (hasClinicalContent(v)) return v;
  }
  return null;
}

function extractLabFromEvol(evol: Evolucao, def: TabelaoLabDef): string {
  for (const sys of def.systems) {
    const data = getSystemData(evol, sys as SystemKey);
    const val = findLabValue(data, def);
    if (hasClinicalContent(val)) return clinicalText(val);
  }
  const snap = evol.sofa_snapshot as R | undefined;
  const tabelao = snap?.tabelao_labs as R | undefined;
  const stored = tabelao?.[def.key] as R | undefined;
  if (stored?.val1) return String(stored.val1);
  return '';
}

/** Tabelão completo no formato SASI Excel (última + penúltima evolução + histórico) */
export function extractTabelaoLabs(evolucoes: Evolucao[]): TabelaoRow[] {
  const sorted = [...evolucoes].sort(
    (a, b) => new Date(b.data_evolucao).getTime() - new Date(a.data_evolucao).getTime()
  );
  const latest = sorted[0];
  const prev = sorted[1];

  return TABELAO_LABS.map(def => {
    const val1 = latest ? extractLabFromEvol(latest, def) : '';
    const val2 = prev ? extractLabFromEvol(prev, def) : '';
    const snap = latest?.sofa_snapshot as R | undefined;
    const stored = (snap?.tabelao_labs as R | undefined)?.[def.key] as R | undefined;

    const historico = sorted.slice(2, 7).reverse().map(ev => ({
      data: fmtDate(ev.data_evolucao),
      valor: extractLabFromEvol(ev, def),
    })).filter(h => h.valor);

    let tendencia = '';
    if (val1 && val2 && val1 !== val2) tendencia = `${val2} → ${val1}`;
    else if (stored?.tendencia) tendencia = String(stored.tendencia);

    return {
      exame: def.exame,
      unidade: def.unidade,
      ref: def.ref,
      val1: val1 || String(stored?.val1 ?? ''),
      val2: val2 || String(stored?.val2 ?? ''),
      tendencia,
      alerta: String(stored?.alerta ?? ''),
      historico: historico.length > 0 ? historico : undefined,
    };
  });
}

function vitalFieldMap(key: string): { sys: SystemKey; maxKey: string; minKey: string } | null {
  const map: Record<string, { sys: SystemKey; maxKey: string; minKey: string }> = {
    pas: { sys: 'hemo', maxKey: 'pas_max', minKey: 'pas_min' },
    pad: { sys: 'hemo', maxKey: 'pad_max', minKey: 'pad_min' },
    pam: { sys: 'hemo', maxKey: 'pam_max', minKey: 'pam_min' },
    fc: { sys: 'hemo', maxKey: 'fc_max', minKey: 'fc_min' },
    fr: { sys: 'resp', maxKey: 'fr_max', minKey: 'fr_min' },
    spo2: { sys: 'resp', maxKey: 'spo2_max', minKey: 'spo2_min' },
    tax: { sys: 'infecto', maxKey: 'tmax', minKey: 'tmin' },
    dx: { sys: 'tgi', maxKey: 'dx_max', minKey: 'dx_min' },
    bh: { sys: 'renal', maxKey: 'bh_ml', minKey: 'bh_ml' },
    diurese: { sys: 'renal', maxKey: 'diurese_total_ml', minKey: 'diurese_total_ml' },
    dieta: { sys: 'tgi', maxKey: 'dieta_vazao', minKey: 'dieta_vazao' },
  };
  return map[key] ?? null;
}

/** Planilhão FASE 1 — sinais vitais editáveis (snapshot ou evolução) */
export function extractPlanilhaoVitais(evol: Evolucao | null): PlanilhaoVitalRow[] {
  const snap = evol?.sofa_snapshot as R | undefined;
  const stored = snap?.planilhao_vitais as PlanilhaoVitalRow[] | undefined;
  if (Array.isArray(stored) && stored.length > 0) return stored;

  const base = emptyPlanilhaoVitais();
  if (!evol) return base;

  return base.map(row => {
    const field = vitalFieldMap(row.key);
    if (!field) return row;
    const data = getSystemData(evol, field.sys);
    const range = clinicalRange(data[row.key] ?? data[field.maxKey]);
    const maxVal = clinicalText(data[field.maxKey] ?? (range?.max != null ? range.max : ''));
    const minVal = clinicalText(data[field.minKey] ?? (range?.min != null ? range.min : ''));
    const obs = clinicalText(data[`${row.key}_obs`] ?? data.obs);
    return {
      ...row,
      max: maxVal === '—' ? '' : maxVal,
      min: minVal === '—' ? '' : minVal,
      obs: obs === '—' ? '' : obs,
    };
  });
}

/** Tabelão editável de uma única evolução (Val1/Val2 do snapshot ou sistemas) */
export function extractTabelaoLabsForEdit(evol: Evolucao | null): Array<TabelaoRow & { key: string }> {
  return TABELAO_LABS.map(def => {
    const val1 = evol ? extractLabFromEvol(evol, def) : '';
    const snap = evol?.sofa_snapshot as R | undefined;
    const stored = (snap?.tabelao_labs as R | undefined)?.[def.key] as TabelaoLabCell | undefined;
    return {
      key: def.key,
      exame: def.exame,
      unidade: def.unidade,
      ref: def.ref,
      val1: val1 || String(stored?.val1 ?? ''),
      val2: String(stored?.val2 ?? ''),
      tendencia: String(stored?.tendencia ?? ''),
      alerta: String(stored?.alerta ?? ''),
    };
  });
}

export function tabelaoRowsToSnapshot(
  rows: Array<TabelaoRow & { key: string }>
): Record<string, TabelaoLabCell> {
  const out: Record<string, TabelaoLabCell> = {};
  for (const row of rows) {
    out[row.key] = {
      val1: row.val1,
      val2: row.val2,
      tendencia: row.tendencia,
      alerta: row.alerta,
    };
  }
  return out;
}

export function extractPrescricao(evol: Evolucao | null): PrescricaoItem[] {
  const snap = evol?.sofa_snapshot as R | undefined;
  const stored = snap?.prescricao_vigente;
  if (Array.isArray(stored) && stored.length > 0) {
    return stored as PrescricaoItem[];
  }
  // Fallback: monta a partir de DVAs/sedativos/ATB
  const items = emptyPrescricaoItems();
  if (!evol) return items;

  let cvIdx = 0;
  for (const d of (evol.dvas ?? []) as unknown[]) {
    if (cvIdx >= 4) break;
    const o = typeof d === 'object' && d ? d as R : {};
    const target = items.filter(it => it.sistema === 'cv_hemo')[cvIdx];
    if (target) {
      target.medicamento = String(o.droga ?? o.nome ?? '');
      target.dose = String(o.vazao ? `${o.vazao} ml/h` : o.dose ?? '');
      target.via = 'IV';
      target.obs = 'DVA';
    }
    cvIdx++;
  }

  let sncIdx = 0;
  for (const s of (evol.sedativos ?? []) as unknown[]) {
    if (sncIdx >= 3) break;
    const o = typeof s === 'object' && s ? s as R : {};
    const target = items.filter(it => it.sistema === 'snc')[sncIdx];
    if (target) {
      target.medicamento = String(o.droga ?? o.nome ?? '');
      target.dose = String(o.vazao ? `${o.vazao} ml/h` : '');
      target.via = 'IV';
      target.obs = 'Sedação';
    }
    sncIdx++;
  }

  const infecto = getSystemData(evol, 'infecto');
  const atb = clinicalText(infecto.atb_atual ?? infecto.atb ?? infecto.atbs);
  if (atb) {
    const target = items.find(it => it.sistema === 'infec_resp' && !it.medicamento);
    if (target) {
      target.medicamento = atb;
      target.dose = clinicalText(infecto.dose_atb ?? infecto.dia_atb);
      target.obs = 'ATB';
    }
  }

  const resp = getSystemData(evol, 'resp');
  const vm = clinicalText(resp.suporte ?? resp.modo_ventilatorio ?? resp.parametros_vm);
  if (vm) {
    const target = items.find(it => it.sistema === 'infec_resp' && !it.medicamento);
    if (target) {
      target.medicamento = vm;
      target.obs = 'Suporte ventilatório';
    }
  }

  return items;
}

export function extractLabsSerial(evolucoes: Evolucao[]): LabSerialRow[] {
  const sorted = [...evolucoes].sort(
    (a, b) => new Date(a.data_evolucao).getTime() - new Date(b.data_evolucao).getTime()
  ).slice(-7);

  return LAB_KEYS.map(({ key, label, systems }) => {
    const values: string[] = [];
    const dates: string[] = [];
    for (const ev of sorted) {
      let val: unknown;
      for (const sys of systems) {
        val = getSystemData(ev, sys)[key];
        if (hasClinicalContent(val)) break;
      }
      if (hasClinicalContent(val)) {
        values.push(clinicalText(val!));
        dates.push(fmtDate(ev.data_evolucao));
      }
    }
    return values.length > 0 ? { param: label, values, dates } : null;
  }).filter((r): r is LabSerialRow => r != null);
}

export function extractExameFisico(evol: Evolucao | null): Array<{ sistema: string; notas: string }> {
  if (!evol) return [];
  const labels: Record<SystemKey, string> = {
    neuro: 'Neuro', resp: 'Resp', hemo: 'Hemo', tgi: 'TGI',
    renal: 'Renal', hemato: 'Hemato', infecto: 'Infecto',
  };

  return SYSTEM_KEYS.map(sys => {
    const data = getSystemData(evol, sys);
    const notas = clinicalText(data.notas ?? data.obs ?? data.notas_neuro ?? data.notas_resp
      ?? data.notas_hemo ?? data.notas_tgi ?? data.notas_renal);
    const extras = Object.entries(data)
      .filter(([k, v]) => !k.startsWith('notas') && k !== 'obs' && hasClinicalContent(v)
        && !['pas', 'pad', 'pam', 'fc', 'fr', 'spo2', 'hb', 'ht'].includes(k))
      .slice(0, 3)
      .map(([k, v]) => `${k}: ${clinicalText(v)}`)
      .join(' · ');
    const text = [notas, extras].filter(Boolean).join(' · ');
    return text ? { sistema: labels[sys], notas: text } : null;
  }).filter((r): r is { sistema: string; notas: string } => r != null);
}

export function extractProblemas(evol: Evolucao | null): SasiProblemaAtivo[] {
  if (!evol) return [];
  if (Array.isArray(evol.problemas_ativos) && evol.problemas_ativos.length > 0) {
    return evol.problemas_ativos;
  }
  return (evol.impressao ?? []).filter(Boolean).map((texto, i) => ({
    id: `legacy-${i}`,
    texto,
    vetor: null,
  }));
}

export function extractCondutas(evol: Evolucao | null): SasiCondutaSistema[] {
  if (!evol) return [];
  if (Array.isArray(evol.condutas_sistemas) && evol.condutas_sistemas.length > 0) {
    return evol.condutas_sistemas;
  }
  return (evol.conduta ?? []).filter(Boolean).map((texto, i) => ({
    id: `legacy-${i}`,
    sistema: 'geral' as const,
    texto,
  }));
}

export function buildPassagem3Linhas(
  row: DashboardRow,
  evol: Evolucao | null,
  pendencias: Pendencia[],
  summary?: PatientSummary | null,
): Passagem3Linhas {
  const grav = severityLabel(row.gravidade);
  const delta = row.delta_sofa_24h;
  const deltaStr = delta != null && delta !== 0
    ? ` SOFA ${delta > 0 ? '↑' : '↓'}${Math.abs(delta)}`
    : '';

  const linha1 = `${row.uti} · L${row.leito} — ${row.nome} | ${grav} | SOFA ${row.sofa_total ?? '—'}${deltaStr} | D${row.dias_internacao}`;

  const problemas = extractProblemas(evol);
  const condutas = extractCondutas(evol);
  const probStr = problemas.slice(0, 3).map(p => {
    const v = p.vetor ? `${p.vetor} ` : '';
    return `${v}${p.texto}`;
  }).join('; ') || extractDiagnosticoPrincipal(row);

  const condStr = condutas.slice(0, 3).map(c => {
    const meta = c.meta ? ` [meta: ${c.meta}]` : '';
    return `${c.texto}${meta}`;
  }).join('; ');

  const dispositivos = extractDispositivos(row, summary);
  const dispStr = dispositivos.length > 0 ? ` | Disp: ${dispositivos.slice(0, 2).join(', ')}` : '';

  const linha2 = `▸ ${probStr}${condStr ? ` → ${condStr}` : ''}${dispStr}`;

  const pendAbertas = pendencias.filter(p => !p.concluida);
  const pendStr = pendAbertas.length > 0
    ? pendAbertas.map(p => p.tarefa).join('; ')
    : 'Sem pendências abertas';

  const riscos = (evol?.riscos ?? []).map(r => r.texto).join('; ');
  const linha3 = `⚑ ${pendStr}${riscos ? ` | Riscos: ${riscos}` : ''}`;

  return { linha1, linha2, linha3 };
}

export function buildPassagemTexto(
  rows: DashboardRow[],
  evolucoes: Map<string, Evolucao | null>,
  pendenciasMap: Map<string, Pendencia[]>,
): string {
  const now = new Date();
  const header = `SASI · Passagem de Turno\n${now.toLocaleDateString('pt-BR')} ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}\n${'═'.repeat(50)}`;

  const blocks = rows.map(row => {
    const evol = evolucoes.get(row.paciente_id) ?? null;
    const pends = pendenciasMap.get(row.paciente_id) ?? [];
    const { linha1, linha2, linha3 } = buildPassagem3Linhas(row, evol, pends);
    return `\n${linha1}\n${linha2}\n${linha3}`;
  });

  return header + blocks.join('\n') + `\n\n${'═'.repeat(50)}\nTotal: ${rows.length} pacientes`;
}