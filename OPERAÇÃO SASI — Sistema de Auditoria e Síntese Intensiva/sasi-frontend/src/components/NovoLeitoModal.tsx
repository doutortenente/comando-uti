// ============================================================================
// SASI · NovoLeitoModal — admissão manual de paciente (sem skill).
// INSERT direto em `pacientes` (RLS por auth.uid() = user_id).
// ============================================================================
import { useState, type FormEvent } from 'react';
import { X, BedDouble, AlertCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToasts } from '../lib/useToasts';

interface Props {
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

const UTIS = ['UTI2', 'UTI3', 'UTI4'] as const;
const GRAVIDADES = ['estavel', 'moderado', 'grave', 'critico'] as const;

export default function NovoLeitoModal({ userId, onClose, onSuccess }: Props) {
  const { addToast } = useToasts();
  const [form, setForm] = useState({
    uti: 'UTI2' as (typeof UTIS)[number],
    leito: '',
    nome: '',
    idade: '',
    peso: '',
    altura: '',
    alergias: '',
    hd: '',
    gravidade: 'moderado' as (typeof GRAVIDADES)[number],
    data_adm: new Date().toISOString().split('T')[0],
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validações client-side
    if (!form.leito.trim()) return setError('Leito é obrigatório.');
    if (!form.nome.trim()) return setError('Nome do paciente é obrigatório.');
    if (form.data_adm > new Date().toISOString().split('T')[0])
      return setError('Data de admissão não pode ser futura.');

    setSaving(true);
    const { error: dbError } = await supabase.from('pacientes').insert({
      user_id: userId,
      uti: form.uti,
      leito: form.leito.trim(),
      nome: form.nome.trim(),
      idade: form.idade ? Number(form.idade) : null,
      peso: form.peso ? Number(form.peso) : null,
      altura: form.altura ? Number(form.altura) : null,
      alergias: form.alergias.trim() || null,
      hd: form.hd.trim() || null,
      gravidade: form.gravidade,
      data_adm: form.data_adm,
      status_leito: 'ativo',
    });
    setSaving(false);

    if (dbError) {
      setError(dbError.message);
      return;
    }

    addToast('success', `${form.nome.trim()} admitido em ${form.uti} · Leito ${form.leito.trim()}`);
    onSuccess();
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-lg bg-app-card border border-app-border rounded-2xl shadow-2xl my-8 sasi-fade-in">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 hover:bg-app-tertiary rounded-lg text-app-text-muted hover:text-app-text transition z-10"
          aria-label="Fechar"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="px-5 pt-5 pb-4 border-b border-app-border">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-app-accent">
              <BedDouble className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-app-text">Novo Leito</h2>
              <p className="text-xs text-app-text-muted">Admissão manual de paciente</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="p-5 space-y-4">
          {/* UTI + Leito */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">UTI *</span>
              <select
                value={form.uti}
                onChange={(e) => set('uti', e.target.value as (typeof UTIS)[number])}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text text-sm focus:border-app-accent focus:outline-none transition"
              >
                {UTIS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">Leito *</span>
              <input
                type="text"
                value={form.leito}
                onChange={(e) => set('leito', e.target.value)}
                placeholder="Ex: 01, 12A"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition"
              />
            </label>
          </div>

          {/* Nome */}
          <label className="block">
            <span className="text-xs text-app-text-2 font-medium">Nome do paciente *</span>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => set('nome', e.target.value)}
              placeholder="Nome completo"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition"
            />
          </label>

          {/* Idade + Peso + Altura */}
          <div className="grid grid-cols-3 gap-3">
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">Idade</span>
              <input
                type="number"
                min="0"
                max="150"
                value={form.idade}
                onChange={(e) => set('idade', e.target.value)}
                placeholder="anos"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition"
              />
            </label>
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">Peso (kg)</span>
              <input
                type="number"
                min="0"
                max="500"
                step="0.1"
                value={form.peso}
                onChange={(e) => set('peso', e.target.value)}
                placeholder="kg"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition"
              />
            </label>
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">Altura (cm)</span>
              <input
                type="number"
                min="0"
                max="300"
                value={form.altura}
                onChange={(e) => set('altura', e.target.value)}
                placeholder="cm"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition"
              />
            </label>
          </div>

          {/* Gravidade + Data admissão */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">Gravidade</span>
              <select
                value={form.gravidade}
                onChange={(e) =>
                  set('gravidade', e.target.value as (typeof GRAVIDADES)[number])
                }
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text text-sm focus:border-app-accent focus:outline-none transition"
              >
                {GRAVIDADES.map((g) => (
                  <option key={g} value={g}>
                    {g.charAt(0).toUpperCase() + g.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs text-app-text-2 font-medium">Data admissão</span>
              <input
                type="date"
                value={form.data_adm}
                onChange={(e) => set('data_adm', e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text text-sm focus:border-app-accent focus:outline-none transition"
              />
            </label>
          </div>

          {/* Alergias */}
          <label className="block">
            <span className="text-xs text-app-text-2 font-medium">Alergias</span>
            <input
              type="text"
              value={form.alergias}
              onChange={(e) => set('alergias', e.target.value)}
              placeholder="NKDA ou listar"
              className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition"
            />
          </label>

          {/* HD */}
          <label className="block">
            <span className="text-xs text-app-text-2 font-medium">HD (hipótese diagnóstica)</span>
            <textarea
              value={form.hd}
              onChange={(e) => set('hd', e.target.value)}
              placeholder="Diagnóstico principal e secundários"
              rows={2}
              className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted text-sm focus:border-app-accent focus:outline-none transition resize-none"
            />
          </label>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-950 border border-red-900 rounded-lg text-sm text-red-300">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={saving}
            className="w-full py-2.5 bg-app-accent hover:bg-app-accent-hover disabled:bg-app-tertiary disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2"
          >
            {saving ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Salvando…
              </>
            ) : (
              <>
                <BedDouble className="w-4 h-4" />
                Admitir paciente
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
