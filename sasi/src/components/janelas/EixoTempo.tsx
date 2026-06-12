// ============================================================================
// SASI · Janela 2 — Eixo Tempo (Patient Summary tabular + tabelão + programação)
// ============================================================================
import { FlaskConical, Stethoscope, Calendar } from 'lucide-react';
import type { Evolucao, PatientSummary, Pendencia } from '../../lib/supabaseClient';
import { extractTabelaoLabs } from '../../lib/clinicalExtract';
import TabelaoLabs from '../clinical/TabelaoLabs';
import PatientSummaryTable from '../PatientSummaryTable';
import { useSupabasePatients } from '../../hooks/useSupabasePatients';

interface Props {
  pacienteId: string | null;
  summary: PatientSummary | null;
  evolucoes: Evolucao[];
  pendencias: Pendencia[];
  loading: boolean;
}

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-app-card border border-app-border rounded-xl p-4">
      <h3 className="flex items-center gap-2 text-sm font-bold text-app-text mb-3">
        {icon} {title}
      </h3>
      {children}
    </section>
  );
}

export default function EixoTempo({ pacienteId, summary, evolucoes, pendencias, loading }: Props) {
  const { savePatientSummary } = useSupabasePatients();
  const tabelao = extractTabelaoLabs(evolucoes);
  const pendAbertas = pendencias.filter(p => !p.concluida);

  if (loading) {
    return <div className="text-center text-app-text-muted py-12 animate-pulse">Carregando eixo tempo…</div>;
  }

  if (!pacienteId) {
    return (
      <div className="bg-app-card border border-app-border rounded-xl p-8 text-center text-app-text-muted text-sm">
        Selecione um paciente para ver o Eixo Tempo.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PatientSummaryTable
        summary={summary}
        pacienteId={pacienteId}
        loading={loading}
        onSave={async (updated) => { await savePatientSummary(pacienteId, updated); }}
      />

      <Section title="Tabelão — Exames Laboratoriais" icon={<FlaskConical className="w-4 h-4" />}>
        <TabelaoLabs rows={tabelao} />
      </Section>

      <Section title="Interconsultas" icon={<Stethoscope className="w-4 h-4" />}>
        {(summary?.interconsultas ?? []).length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-app-border text-app-text-muted">
                <th className="text-left py-1">Especialidade</th>
                <th className="text-left py-1">Status</th>
                <th className="text-left py-1">Notas</th>
              </tr>
            </thead>
            <tbody>
              {summary!.interconsultas!.map((ic, i) => (
                <tr key={i} className="border-b border-app-border/40">
                  <td className="py-1.5 font-semibold">{ic.especialidade}</td>
                  <td className="py-1.5 text-app-text-muted">{ic.status ?? 'pendente'}</td>
                  <td className="py-1.5 text-app-text-2">{ic.notas ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-app-text-muted">Nenhuma interconsulta registrada.</p>
        )}
      </Section>

      <Section title="Programação e Pendências" icon={<Calendar className="w-4 h-4" />}>
        {(summary?.programacao ?? []).length > 0 && (
          <table className="w-full text-xs mb-3">
            <thead>
              <tr className="border-b border-app-border text-app-text-muted">
                <th className="text-left py-1">Tipo</th>
                <th className="text-left py-1">Descrição</th>
                <th className="text-left py-1">Data</th>
              </tr>
            </thead>
            <tbody>
              {summary!.programacao!.map((p, i) => (
                <tr key={i} className="border-b border-app-border/40">
                  <td className="py-1.5 text-app-text-muted">{p.tipo ?? '—'}</td>
                  <td className="py-1.5 text-app-text-2">{p.descricao}</td>
                  <td className="py-1.5 text-app-text-muted">{p.data ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {pendAbertas.length > 0 ? (
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-app-border text-app-text-muted">
                <th className="text-left py-1 w-10">P</th>
                <th className="text-left py-1">Pendência</th>
              </tr>
            </thead>
            <tbody>
              {pendAbertas.map(p => (
                <tr key={p.id} className="border-b border-app-border/40">
                  <td className="py-1.5">
                    <span className={`text-[10px] font-bold px-1 rounded ${
                      p.prioridade === 1 ? 'bg-red-900 text-red-200' : 'bg-amber-900 text-amber-200'
                    }`}>P{p.prioridade}</span>
                  </td>
                  <td className="py-1.5 text-app-text-2">{p.tarefa}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-app-text-muted">Sem pendências abertas.</p>
        )}
      </Section>
    </div>
  );
}