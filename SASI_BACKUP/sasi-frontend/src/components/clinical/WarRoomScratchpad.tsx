// ============================================================================
// SASI · WarRoomScratchpad — Quadrante 4 (Bagunçograma)
// Textarea livre + upload de foto (preview base64) + botão Gemini Vision.
// Onda 1: persistência em localStorage por pacienteId.
// Onda 3: integração com Edge Function ocr-ingest/vision-ingest.
// ============================================================================
import { useCallback, useEffect, useState } from 'react';
import { Camera, Upload, Wand2, FileText, Trash2 } from 'lucide-react';

interface Props {
  pacienteId: string;
}

const LS_PREFIX = 'uti_scratchpad_';

interface Photo {
  name: string;
  dataUrl: string;
  size: number;
}

export default function WarRoomScratchpad({ pacienteId }: Props) {
  const storageKey = `${LS_PREFIX}${pacienteId}`;
  const [text, setText] = useState('');
  const [photo, setPhoto] = useState<Photo | null>(null);
  const [saved, setSaved] = useState<'idle' | 'saving' | 'saved'>('idle');

  // Load on mount / patient change
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as { text?: unknown; photo?: unknown };
        setText(typeof parsed.text === 'string' ? parsed.text : '');
        if (parsed.photo && typeof parsed.photo === 'object') {
          const p = parsed.photo as Partial<Photo>;
          if (typeof p.dataUrl === 'string' && typeof p.name === 'string') {
            setPhoto({ name: p.name, dataUrl: p.dataUrl, size: typeof p.size === 'number' ? p.size : 0 });
          } else {
            setPhoto(null);
          }
        } else {
          setPhoto(null);
        }
      } else {
        setText('');
        setPhoto(null);
      }
    } catch {
      setText('');
      setPhoto(null);
    }
  }, [storageKey]);

  // Debounced save
  useEffect(() => {
    setSaved('saving');
    const t = setTimeout(() => {
      try {
        if (!text && !photo) {
          localStorage.removeItem(storageKey);
        } else {
          localStorage.setItem(storageKey, JSON.stringify({ text, photo }));
        }
        setSaved('saved');
      } catch {
        setSaved('idle');
      }
    }, 400);
    return () => clearTimeout(t);
  }, [text, photo, storageKey]);

  const handleFile = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') return;
      setPhoto({ name: file.name, dataUrl: result, size: file.size });
    };
    reader.readAsDataURL(file);
  }, []);

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-app-text-muted">
          <FileText className="w-3.5 h-3.5" />
          Bagunçograma
        </div>
        <span
          className={`text-[9px] font-mono uppercase ${
            saved === 'saving' ? 'text-amber-400' : saved === 'saved' ? 'text-emerald-400' : 'text-app-text-muted/60'
          }`}
        >
          {saved === 'saving' ? 'salvando…' : saved === 'saved' ? 'salvo' : ''}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Anotações livres, cálculos rabiscados, lembretes pra mim mesmo… (autosave local)"
        rows={6}
        className="w-full px-2.5 py-2 rounded-lg bg-app-tertiary/40 border border-app-border/50 text-xs text-app-text-2 placeholder:text-app-text-muted/50 font-mono leading-relaxed focus:outline-none focus:ring-1 focus:ring-app-accent resize-y"
      />

      {/* Photo zone */}
      <div className="rounded-lg border border-dashed border-app-border/70 bg-app-tertiary/20 p-2 space-y-2">
        {photo ? (
          <div className="space-y-1.5">
            <img
              src={photo.dataUrl}
              alt={photo.name}
              className="w-full max-h-48 object-contain rounded border border-app-border/40 bg-black/30"
            />
            <div className="flex items-center justify-between text-[10px] text-app-text-muted">
              <span className="truncate flex-1" title={photo.name}>{photo.name}</span>
              <button
                type="button"
                onClick={() => setPhoto(null)}
                className="inline-flex items-center gap-1 text-red-400 hover:text-red-300 transition"
                title="Remover foto"
              >
                <Trash2 className="w-3 h-3" /> Remover
              </button>
            </div>
          </div>
        ) : (
          <label className="flex items-center justify-center gap-2 text-xs text-app-text-muted hover:text-app-text-2 cursor-pointer py-3 transition">
            <Upload className="w-4 h-4" />
            <span>Anexar foto (gasometria, RX, prescrição…)</span>
            <input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
                e.target.value = '';
              }}
              className="hidden"
            />
          </label>
        )}

        <button
          type="button"
          disabled
          title="Disponível na Onda 3 — Edge Function ocr-ingest"
          className="w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 rounded bg-app-tertiary/60 text-app-text-muted/70 text-[11px] font-semibold cursor-not-allowed border border-app-border/40"
        >
          <Wand2 className="w-3.5 h-3.5" />
          Extrair com Gemini Vision
          <span className="text-[9px] font-normal opacity-70">(Onda 3)</span>
        </button>
      </div>

      <p className="text-[9px] text-app-text-muted/60 leading-tight flex items-start gap-1">
        <Camera className="w-3 h-3 shrink-0 mt-px" />
        Persistência local por paciente. Nada sai do navegador até a Onda 3 cabear a Edge Function.
      </p>
    </div>
  );
}
