// ============================================================================
// Planilhão Geral — Eixo Estado (espelho Excel SASI_UTI_20Leitos por leito)
// Recebe e insere dados tabulados: vitais, laboratório, prescrição vigente
// ============================================================================
import { useState, useEffect, useCallback } from 'react';
import { Heart, FlaskConical, Syringe, Table2, Save, Loader2 } from 'lucide-react';
import type { Evolucao, Paciente, PrescricaoItem } from '../../lib/supabaseClient';
import type { PlanilhaoVitalRow } from '../../lib/sasiSchema';
import { supabase } from '../../lib/supabaseClient';
import {
  extractPlanilhaoVitais, extractTabelaoLabsForEdit, extractPrescricao,
  tabelaoRowsToSnapshot,
} from '../../lib/clinicalExtract';
import VitalsTableEditable from './VitalsTableEditable';
import TabelaoLabsEditable, { type EditableTabelaoRow } from './TabelaoLabsEditable';
import PrescricaoTable from './PrescricaoTable';
import { useToasts } from '../../lib/useToasts';

interface Props {
  paciente: Paciente | null;
  evolucao: Evolucao | null;
  loading: boolean;
  onSaved?: () => void;
}

function SectionHeader({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <h4 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-app-text-muted mb-2">
      {icon} {title}
    </h4>
  );
}

export default function PlanilhaoGeral({ paciente, evolucao, loading, onSaved }: Props) {
  const { addToast } = useToasts();
  const [vitais, setVitais] = useState<PlanilhaoVitalRow[]>([]);
  const [labs, setLabs] = useState<EditableTabelaoRow[]>([]);
  const [prescricao, setPrescricao] = useState<PrescricaoItem[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setVitais(extractPlanilhaoVitais(evolucao));
    setLabs(extractTabelaoLabsForEdit(evolucao));
    setPrescricao(extractPrescricao(evolucao));
  }, [evolucao]);

  const handleSave = useCallback(async () => {
    if (!evolucao?.id) {
      addToast('warning', 'Crie uma evolução na aba Evolução do paciente antes de salvar o planilhão.');
      return;
    }
    setSaving(true);
    const snap = {
      ...(evolucao.sofa_snapshot ?? {}),
      planilhao_vitais: vitais,
      tabelao_labs: tabelaoRowsToSnapshot(labs),
      prescricao_vigente: prescricao,
    };
    const { error } = await supabase
      .from('evolucoes')
      .update({ sofa_snapshot: snap })
      .eq('id', evolucao.id);
    setSaving(false);
    if (error) {
      addToast('danger', `Erro ao salvar planilhão: ${error.message}`);
    } else {
      addToast('success', 'Planilhão geral salvo');
      onSaved?.();
    }
  }, [evolucao, vitais, labs, prescricao, addToast, onSaved]);

  if (loading) {
    return <div className="text-center text-app-text-muted py-12 animate-pulse">Carregando planilhão…</div>;
  }

  if (!evolucao) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-8 text-center text-app-text-muted text-sm">
        Sem evolução registrada. Abra o paciente → aba <strong>Evolução</strong> → Nova evolução.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-bold text-app-text">
            <Table2 className="w-4 h-4 text-app-accent" />
            Planilhão Geral — Dados Tabulados
          </h2>
          <p className="text-[11px] text-app-text-muted mt-0.5">
            {paciente ? `${paciente.uti} · ${paciente.leito} · ${paciente.nome}` : 'Paciente selecionado'}
            {' · '}espelho SASI_UTI_20Leitos
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-white rounded-lg font-semibold shrink-0"
        >
          {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
          Salvar planilhão
        </button>
      </div>

      <section className="bg-app-card border border-app-border rounded-xl p-4">
        <SectionHeader title="Fase 1 — Sinais Vitais" icon={<Heart className="w-3.5 h-3.5" />} />
        <VitalsTableEditable rows={vitais} onChange={setVitais} />
      </section>

      <section className="bg-app-card border border-app-border rounded-xl p-4">
        <SectionHeader title="Laboratório — Tabelão" icon={<FlaskConical className="w-3.5 h-3.5" />} />
        <TabelaoLabsEditable rows={labs} onChange={setLabs} />
      </section>

      <section className="bg-app-card border border-app-border rounded-xl p-4">
        <SectionHeader title="Prescrição / Terapias Vigentes" icon={<Syringe className="w-3.5 h-3.5" />} />
        <PrescricaoTable items={prescricao} editable onChange={setPrescricao} />
      </section>
    </div>
  );
}