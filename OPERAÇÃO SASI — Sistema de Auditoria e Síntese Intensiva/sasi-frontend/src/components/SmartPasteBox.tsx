// ============================================================================
// SASI · SmartPasteBox — Onda 3
// Importação inteligente via Edge Function `ocr-ingest`.
// Expansível dentro do LeitoCard (stopPropagation nos eventos).
// Zero Gemini key no cliente — tudo via Supabase Edge Function.
// ============================================================================
import { useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Download, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { useToasts } from '../lib/useToasts';
import type { DashboardRow } from '../lib/supabaseClient';

interface OcrResponse {
  eventos_inseridos?: number;
  warnings?: string[];
  error?: string;
}

interface Props {
  row: DashboardRow;
}

export default function SmartPasteBox({ row }: Props) {
  const [open, setOpen] = useState(false);
  const [texto, setTexto] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { addToast } = useToasts();

  function stopProp(e: React.MouseEvent | React.KeyboardEvent) {
    e.stopPropagation();
  }

  function toggle(e: React.MouseEvent) {
    e.stopPropagation();
    setOpen((v) => {
      if (!v) setTimeout(() => textareaRef.current?.focus(), 80);
      return !v;
    });
    setResult(null);
  }

  async function handleExtract(e: React.MouseEvent) {
    e.stopPropagation();
    const t = texto.trim();
    if (!t) return;

    setLoading(true);
    setResult(null);

    const session = (await supabase.auth.getSession()).data.session;
    const headers: Record<string, string> = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const { data, error } = await supabase.functions.invoke<OcrResponse>('ocr-ingest', {
      body: {
        texto: t,
        target: { uti: row.uti, leito: row.leito },
      },
      headers,
    });

    setLoading(false);

    if (error || data?.error) {
      const msg = data?.error ?? error?.message ?? 'Erro desconhecido';
      setResult({ ok: false, msg });
      return;
    }

    const n = data?.eventos_inseridos ?? 0;
    const warns = data?.warnings ?? [];
    const warnTxt = warns.length > 0 ? ` · ${warns.length} aviso(s)` : '';
    const msg = `${n} evento${n !== 1 ? 's' : ''} inserido${n !== 1 ? 's' : ''}${warnTxt}`;

    setResult({ ok: true, msg });
    addToast('success', `SmartPaste: ${msg}`);

    if (warns.length > 0) {
      warns.forEach((w) => addToast('warning', w));
    }

    setTexto('');
    // Realtime cuida da atualização do dashboard automaticamente.
  }

  return (
    <div className="mt-1.5" onClick={stopProp} onKeyDown={stopProp} role="presentation">
      {/* Toggle button */}
      <button
        type="button"
        onClick={toggle}
        className="flex items-center gap-1.5 w-full px-2 py-1 rounded text-[10px] font-semibold text-app-text-muted hover:text-app-text-2 hover:bg-app-tertiary/50 transition"
        title="Importação inteligente via IA"
      >
        <Download className="w-3 h-3" />
        Importação Inteligente
        {open ? <ChevronUp className="w-3 h-3 ml-auto" /> : <ChevronDown className="w-3 h-3 ml-auto" />}
      </button>

      {/* Collapsible body */}
      {open && (
        <div className="mt-1 space-y-1.5 border-t border-app-border/40 pt-1.5">
          <textarea
            ref={textareaRef}
            value={texto}
            onChange={(e) => { e.stopPropagation(); setTexto(e.target.value); }}
            onClick={stopProp}
            placeholder="Cole aqui o texto bruto (gasometria, evolução médica, prescrição…)"
            rows={4}
            className="w-full px-2 py-1.5 rounded bg-app-tertiary/50 border border-app-border/50 text-[11px] text-app-text-2 placeholder:text-app-text-muted/50 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-app-accent resize-none"
          />

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExtract}
              disabled={loading || !texto.trim()}
              className="inline-flex items-center gap-1.5 px-3 py-1 rounded bg-app-accent hover:bg-app-accent-hover disabled:opacity-50 text-white text-[11px] font-bold transition"
            >
              {loading
                ? <><Loader2 className="w-3 h-3 animate-spin" /> Extraindo…</>
                : <><Download className="w-3 h-3" /> Extrair</>}
            </button>
            {result && (
              <div className={`flex items-center gap-1 text-[10px] font-medium ${result.ok ? 'text-emerald-400' : 'text-red-400'}`}>
                {result.ok
                  ? <CheckCircle2 className="w-3 h-3" />
                  : <AlertCircle className="w-3 h-3" />}
                {result.msg}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
