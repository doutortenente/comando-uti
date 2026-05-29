// ============================================================================
// PatientSummary — Resumo persistente da admissão (Etapa 1)
// Snapshot por admissão, atualizado em evoluções pontuais
// ============================================================================

import { PatientSummary as PatientSummaryType } from '../lib/supabaseClient';
import { User, Activity, Plus, Trash2, Save, X } from 'lucide-react';
import { useState } from 'react';

interface Props {
  summary?: PatientSummaryType | null;
  loading?: boolean;
  onSave?: (updated: PatientSummaryType) => void;
  onEdit?: () => void;
}

export default function PatientSummaryView({ summary, loading = false, onSave, onEdit }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState<Partial<PatientSummaryType>>(summary || {});

  if (!summary && !isEditing) {
    return (
      <div className="bg-app-card border border-app-border rounded-2xl p-6 text-center">
        <p className="text-app-text-muted text-sm">Nenhum Patient Summary para esta admissão ainda.</p>
        <p className="text-[11px] text-app-text-muted mt-1">Crie um resumo vivo da admissão com dispositivos, metas e plano terapêutico.</p>
        <button 
          onClick={() => {
            // Pre-fill reasonable defaults when creating new
            setDraft({
              data_admissao: new Date().toISOString(),
              dispositivos: [],
              suporte_atual: {},
            });
            setIsEditing(true);
          }}
          className="mt-3 text-xs px-4 py-1.5 bg-app-accent hover:bg-app-accent-hover text-white rounded-lg"
        >
          Criar Patient Summary
        </button>
      </div>
    );
  }

  const handleSave = async () => {
    if (onSave && draft) {
      setIsSaving(true);
      const updated = {
        id: (summary as any)?.id || crypto.randomUUID?.() || `ps_${Date.now()}`,
        paciente_id: (summary as any)?.paciente_id || '',
        data_admissao: draft.data_admissao || (summary as any)?.data_admissao || new Date().toISOString(),
        ...(summary || {}),
        ...draft,
        ultima_atualizacao: new Date().toISOString(),
      } as PatientSummaryType;
      try {
        await onSave(updated);
      } finally {
        setIsSaving(false);
        setIsEditing(false);
      }
    } else {
      setIsEditing(false);
    }
  };

  const handleCancel = () => {
    setDraft(summary || {});
    setIsEditing(false);
  };

  const current = isEditing ? draft : summary;

  if (loading && !isEditing) {
    return (
      <div className="bg-app-card border border-app-border rounded-2xl p-5">
        <div className="flex items-center gap-2 text-sm text-app-text-muted">
          <div className="animate-pulse">Carregando Patient Summary...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-app-card border border-app-border rounded-2xl p-5 space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-2 text-sm font-bold text-app-text">
            <User className="w-4 h-4" /> Patient Summary
          </div>
          <div className="text-xs text-app-text-muted">
            Admissão: {current?.data_admissao ? new Date(current.data_admissao).toLocaleDateString('pt-BR') : '—'} 
            {current?.ultima_atualizacao && ` • Atualizado em ${new Date(current.ultima_atualizacao).toLocaleDateString('pt-BR')}`}
          </div>
        </div>

        <div className="flex gap-2">
          {isEditing ? (
            <>
              <button 
                onClick={handleSave}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white"
              >
                <Save className="w-3.5 h-3.5" /> {isSaving ? 'Salvando...' : 'Salvar'}
              </button>
              <button 
                onClick={handleCancel}
                disabled={isSaving}
                className="flex items-center gap-1 text-xs px-3 py-1 rounded bg-app-tertiary hover:bg-app-border text-app-text disabled:opacity-60"
              >
                <X className="w-3.5 h-3.5" /> Cancelar
              </button>
            </>
          ) : (
            <button 
              onClick={() => {
                setDraft(summary || {});
                setIsEditing(true);
                if (onEdit) onEdit();
              }}
              className="text-xs px-3 py-1 rounded bg-app-accent/10 hover:bg-app-accent/20 text-app-accent"
            >
              Editar
            </button>
          )}
        </div>
      </div>

      {!isEditing ? (
        // VISUALIZAÇÃO
        <div className="space-y-4 text-sm">
          <div>
            <div className="font-bold text-xs text-red-400 mb-1">MOTIVO DA ADMISSÃO / DIAGNÓSTICOS PRINCIPAIS</div>
            <p className="text-app-text-2 leading-snug">{current?.motivo_admissao || '—'}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
            <div>
              <div className="font-bold text-xs text-amber-400 mb-1">ANTECEDENTES RELEVANTES</div>
              <p className="text-app-text-2">{current?.antecedentes || '—'}</p>
            </div>

            <div>
              <div className="font-bold text-xs text-amber-400 mb-1">ALERGIAS</div>
              <p className="text-red-400">{current?.alergias || 'Nenhuma informada'}</p>
            </div>

            <div>
              <div className="font-bold text-xs text-amber-400 mb-1">PESO / ALTURA</div>
              <p className="text-app-text-2">
                {current?.peso ? `${current.peso} kg` : '—'} 
                {current?.altura ? ` / ${current.altura} cm` : ''}
              </p>
            </div>

            <div>
              <div className="font-bold text-xs text-sky-400 mb-1 flex items-center gap-1">
                <Activity className="w-3 h-3" /> DISPOSITIVOS
              </div>
              {current?.dispositivos?.length ? (
                <ul className="text-xs space-y-0.5 text-app-text-2">
                  {current.dispositivos.map((d, i) => (
                    <li key={i}>• {d.tipo} {d.local && `(${d.local})`} {d.data_insercao && `— ${d.data_insercao}`}</li>
                  ))}
                </ul>
              ) : <span className="text-xs text-app-text-muted">Nenhum</span>}
            </div>

            <div>
              <div className="font-bold text-xs text-purple-400 mb-1">SUPORTE ATUAL</div>
              <div className="text-xs text-app-text-2 space-y-0.5">
                {current?.suporte_atual?.dvas && Array.isArray(current.suporte_atual.dvas) && current.suporte_atual.dvas.length > 0 && (
                  <div>DVAs: {current.suporte_atual.dvas.map((d: any) => d.droga || d).join(', ')}</div>
                )}
                {current?.suporte_atual?.ventilacao && <div>Ventilação: {current.suporte_atual.ventilacao}</div>}
                {current?.suporte_atual?.antibioticos && <div>ATB: {current.suporte_atual.antibioticos.join(', ')}</div>}
              </div>
            </div>
          </div>

          {current?.plano_terapeutico_atual && (
            <div>
              <div className="font-bold text-xs text-emerald-400 mb-1 flex items-center gap-2">
                PLANO TERAPÊUTICO ATUAL / METAS
                {current.plano_terapeutico_atual.includes('Última síntese SASI') && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-medium">Sincronizado via SASI</span>
                )}
              </div>
              <p className="text-sm text-app-text-2 whitespace-pre-wrap">{current.plano_terapeutico_atual}</p>
            </div>
          )}
        </div>
      ) : (
        // EDIÇÃO
        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-xs font-bold text-red-400 mb-1">MOTIVO DA ADMISSÃO / DIAGNÓSTICOS PRINCIPAIS</label>
            <textarea
              value={draft.motivo_admissao || ''}
              onChange={(e) => setDraft({ ...draft, motivo_admissao: e.target.value })}
              className="w-full bg-app-tertiary border border-app-border rounded-lg p-2 text-sm h-20"
              placeholder="Ex: Choque cardiogênico / ICFEr crítica pós implante CDI-RV"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">ANTECEDENTES RELEVANTES</label>
              <textarea
                value={draft.antecedentes || ''}
                onChange={(e) => setDraft({ ...draft, antecedentes: e.target.value })}
                className="w-full bg-app-tertiary border border-app-border rounded-lg p-2 text-sm h-20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">ALERGIAS</label>
              <input
                type="text"
                value={draft.alergias || ''}
                onChange={(e) => setDraft({ ...draft, alergias: e.target.value })}
                className="w-full bg-app-tertiary border border-app-border rounded-lg p-2 text-sm"
                placeholder="Ex: Digesan"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">PESO (kg)</label>
              <input
                type="number"
                step="0.1"
                value={draft.peso || ''}
                onChange={(e) => setDraft({ ...draft, peso: e.target.value ? parseFloat(e.target.value) : undefined })}
                className="w-full bg-app-tertiary border border-app-border rounded-lg p-2 text-sm"
                placeholder="Ex: 78.5"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-amber-400 mb-1">ALTURA (cm)</label>
              <input
                type="number"
                value={draft.altura || ''}
                onChange={(e) => setDraft({ ...draft, altura: e.target.value ? parseInt(e.target.value) : undefined })}
                className="w-full bg-app-tertiary border border-app-border rounded-lg p-2 text-sm"
                placeholder="Ex: 175"
              />
            </div>
          </div>

          {/* Dispositivos - lista editável simples */}
          <div>
            <label className="block text-xs font-bold text-sky-400 mb-1">DISPOSITIVOS</label>
            <div className="space-y-2">
              {(draft.dispositivos || []).map((d, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={d.tipo}
                    onChange={(e) => {
                      const newList = [...(draft.dispositivos || [])];
                      newList[i] = { ...newList[i], tipo: e.target.value };
                      setDraft({ ...draft, dispositivos: newList });
                    }}
                    placeholder="Tipo (ex: CDI-RV, POWERPICC)"
                    className="flex-1 bg-app-tertiary border border-app-border rounded px-2 py-1 text-xs"
                  />
                  <input
                    type="text"
                    value={d.data_insercao || ''}
                    onChange={(e) => {
                      const newList = [...(draft.dispositivos || [])];
                      newList[i] = { ...newList[i], data_insercao: e.target.value };
                      setDraft({ ...draft, dispositivos: newList });
                    }}
                    placeholder="Data inserção"
                    className="w-32 bg-app-tertiary border border-app-border rounded px-2 py-1 text-xs"
                  />
                  <button onClick={() => {
                    const newList = (draft.dispositivos || []).filter((_, idx) => idx !== i);
                    setDraft({ ...draft, dispositivos: newList });
                  }} className="text-red-400">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <button 
                onClick={() => setDraft({ 
                  ...draft, 
                  dispositivos: [...(draft.dispositivos || []), { tipo: '', data_insercao: '' }] 
                })}
                className="text-xs flex items-center gap-1 text-sky-400"
              >
                <Plus className="w-3 h-3" /> Adicionar dispositivo
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-emerald-400 mb-1">PLANO TERAPÊUTICO ATUAL / METAS PRINCIPAIS</label>
            <textarea
              value={draft.plano_terapeutico_atual || ''}
              onChange={(e) => setDraft({ ...draft, plano_terapeutico_atual: e.target.value })}
              className="w-full bg-app-tertiary border border-app-border rounded-lg p-2 text-sm h-24"
              placeholder="Ex: Meta balanço negativo agressivo + PAM ≥ 65 + Diurese > 0.5 ml/kg/h"
            />
          </div>
        </div>
      )}
    </div>
  );
}
