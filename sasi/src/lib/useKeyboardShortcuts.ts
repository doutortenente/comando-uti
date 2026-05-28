// ============================================================================
// SASI · useKeyboardShortcuts — hook global de atalhos de teclado.
// Ignora eventos dentro de inputs/textareas pra não conflitar com digitação.
// ============================================================================
import { useEffect, useRef } from 'react';

type ShortcutMap = Record<string, () => void>;

/**
 * Registra atalhos de teclado globais.
 *
 * - Keys simples: 'j', 'k', '?', 'Escape'
 * - Sequências de 2 teclas: 'g p', 'g r', 'g e'
 *
 * O hook ignora keystrokes quando o foco está em input, textarea, select
 * ou qualquer elemento com contentEditable.
 */
export function useKeyboardShortcuts(map: ShortcutMap, enabled = true) {
  const pendingRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!enabled) return;

    function handler(e: KeyboardEvent) {
      // Ignora quando digitando em campos de formulário
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      const key = e.key;

      // Sequência de 2 teclas (ex: "g p")
      if (pendingRef.current) {
        const combo = `${pendingRef.current} ${key}`;
        pendingRef.current = null;
        if (timerRef.current) clearTimeout(timerRef.current);

        if (map[combo]) {
          e.preventDefault();
          map[combo]();
          return;
        }
      }

      // Verifica se alguma sequência começa com esta tecla
      const hasSequence = Object.keys(map).some(
        (k) => k.length > 1 && k.startsWith(`${key} `)
      );
      if (hasSequence) {
        pendingRef.current = key;
        // Timeout: se nenhuma segunda tecla em 500ms, descarta
        timerRef.current = setTimeout(() => {
          pendingRef.current = null;
        }, 500);
        return;
      }

      // Atalho simples
      if (map[key]) {
        e.preventDefault();
        map[key]();
      }
    }

    window.addEventListener('keydown', handler);
    return () => {
      window.removeEventListener('keydown', handler);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [map, enabled]);
}
