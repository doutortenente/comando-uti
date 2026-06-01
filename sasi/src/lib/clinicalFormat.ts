// ============================================================================
// SASI · clinicalFormat — formata valores clínicos do JSONB da evolução
// O modelo SASI v2.0 guarda OBJETOS, não escalares. Ex:
//   hemo.fc   = { max, min, n_maior_100 }
//   hemo.pam  = { max, min, n_menor_65 }
//   resp.spo2 = { max, min, suporte, n_menor_88 }
//   infecto.tmax = { valor, n_maior_38 }
//   renal.eletrolitos = { k, na, mg, cai }
// Estes helpers garantem que nunca renderizamos "[object Object]" nem JSON cru.
// ============================================================================

function fmtNum(n: number): string {
  return Number.isInteger(n) ? String(n) : String(Math.round(n * 10) / 10);
}

/** Extrai um número representativo de um valor escalar ou objeto {max,min,valor}. */
export function clinicalNum(
  val: unknown,
  prefer: 'min' | 'max' | 'valor' = 'valor'
): number | null {
  if (val == null || val === '') return null;
  if (typeof val === 'number') return Number.isFinite(val) ? val : null;
  if (typeof val === 'string') {
    // tendências tipo "0,9 > 2,1 > 1,3" → usa o último valor
    const last = val.split('>').map((s) => s.trim()).filter(Boolean).pop() ?? val;
    const n = parseFloat(last.replace(',', '.'));
    return Number.isNaN(n) ? null : n;
  }
  if (typeof val === 'object') {
    const o = val as Record<string, unknown>;
    const order =
      prefer === 'max'
        ? ['max', 'valor', 'value', 'media', 'min']
        : prefer === 'min'
          ? ['min', 'valor', 'value', 'media', 'max']
          : ['valor', 'value', 'media', 'atual', 'max', 'min'];
    for (const k of order) {
      const n = clinicalNum(o[k]);
      if (n != null) return n;
    }
  }
  return null;
}

/** Extrai {min,max} de um objeto, se existirem. */
export function clinicalRange(val: unknown): { min: number | null; max: number | null } | null {
  if (!val || typeof val !== 'object') return null;
  const o = val as Record<string, unknown>;
  const min = clinicalNum(o.min);
  const max = clinicalNum(o.max);
  if (min == null && max == null) return null;
  return { min, max };
}

/** Texto humano para qualquer valor clínico. Nunca retorna "[object Object]". */
export function clinicalText(val: unknown): string {
  if (val == null || val === '' || val === false) return '';
  if (typeof val === 'number') return fmtNum(val);
  if (typeof val === 'string') return val;
  if (typeof val === 'boolean') return val ? 'Sim' : 'Não';

  if (Array.isArray(val)) {
    return val
      .map((item) => {
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          if (o.droga != null) return String(o.droga);
          if (o.nome != null) return String(o.nome);
          return clinicalText(item);
        }
        return clinicalText(item);
      })
      .filter(Boolean)
      .join('; ');
  }

  if (typeof val === 'object') {
    const range = clinicalRange(val);
    if (range) {
      const { min, max } = range;
      if (min != null && max != null) return min === max ? fmtNum(max) : `${fmtNum(min)}–${fmtNum(max)}`;
      return fmtNum((max ?? min) as number);
    }
    const o = val as Record<string, unknown>;
    if (o.valor != null) return clinicalText(o.valor);
    if (o.value != null) return clinicalText(o.value);
    // objeto tipo eletrólitos → lista compacta "K 4.3 · Na 140"
    const parts = Object.entries(o)
      .filter(([k, v]) => v != null && v !== '' && !k.startsWith('n_'))
      .slice(0, 4)
      .map(([k, v]) => `${k.toUpperCase()} ${clinicalText(v)}`)
      .filter(Boolean);
    return parts.join(' · ');
  }

  return String(val);
}

/** True se o valor tem conteúdo exibível (descarta vazios, arrays/objetos vazios). */
export function hasClinicalContent(val: unknown): boolean {
  if (val == null || val === '' || val === false) return false;
  if (Array.isArray(val)) return val.length > 0 && clinicalText(val) !== '';
  if (typeof val === 'object') return clinicalText(val) !== '';
  return true;
}
