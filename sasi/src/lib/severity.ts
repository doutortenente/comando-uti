// ============================================================================
// SASI · severity — 4 níveis clínicos de gravidade (+ óbito)
// Mapeia gravidade do banco → rótulo de plantão (Estável / Watcher / Instável / Crítico)
// ============================================================================

export type GravidadeDb = 'estavel' | 'moderado' | 'grave' | 'critico' | 'obito';

export interface SeverityMeta {
  db: GravidadeDb;
  label: string;
  short: string;
  cardClass: string;
  badgeClass: string;
  borderColor: string;
}

const SEVERITY_MAP: Record<GravidadeDb, SeverityMeta> = {
  estavel: {
    db: 'estavel',
    label: 'Estável',
    short: 'Estável',
    cardClass: 'card-grav-estavel',
    badgeClass: 'gravidade-estavel',
    borderColor: '#10b981',
  },
  moderado: {
    db: 'moderado',
    label: 'Watcher',
    short: 'Watcher',
    cardClass: 'card-grav-moderado',
    badgeClass: 'gravidade-moderado',
    borderColor: '#f59e0b',
  },
  grave: {
    db: 'grave',
    label: 'Instável',
    short: 'Instável',
    cardClass: 'card-grav-grave',
    badgeClass: 'gravidade-grave',
    borderColor: '#f97316',
  },
  critico: {
    db: 'critico',
    label: 'Crítico',
    short: 'Crítico',
    cardClass: 'card-grav-critico',
    badgeClass: 'gravidade-critico',
    borderColor: '#dc2626',
  },
  obito: {
    db: 'obito',
    label: 'Óbito',
    short: 'Óbito',
    cardClass: 'card-grav-obito',
    badgeClass: 'gravidade-obito',
    borderColor: '#475569',
  },
};

export function normalizeGravidade(raw: string | null | undefined): GravidadeDb {
  const g = (raw ?? 'estavel').toLowerCase() as GravidadeDb;
  return g in SEVERITY_MAP ? g : 'estavel';
}

export function getSeverity(raw: string | null | undefined): SeverityMeta {
  return SEVERITY_MAP[normalizeGravidade(raw)];
}

export function severityLabel(raw: string | null | undefined): string {
  return getSeverity(raw).label;
}