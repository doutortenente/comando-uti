// ============================================================================
// SASI — Comando UTI Alpha · App.tsx (Supabase-native, zero Firebase)
// Wrapper com UIProvider pros 3 temas (dark/clinical/light) e 3 view modes.
// ============================================================================
// AUTH DESABILITADA TEMPORARIAMENTE — ver "Plano de ação login e autenticação SASI"
// no Google Drive para instruções de reativação.
// Para reativar: reverter este arquivo pro fluxo condicional com session.
// ============================================================================
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { UIProvider } from './lib/theme';
import { ToastProvider } from './lib/useToasts';
import ErrorBoundary from './components/ErrorBoundary';
import Dashboard from './components/Dashboard';

// ── AUTH BYPASS ──────────────────────────────────────────────────────────────
// Mock session pra uso sem login. Dashboard espera session.user.{id, email}.
// Quando reativar auth, remover este mock e descomentar o fluxo original.
const MOCK_SESSION = {
  user: {
    id: '00000000-0000-0000-0000-000000000000',
    email: 'dev@sasi-uti.local',
    aud: 'authenticated',
    role: 'authenticated',
  },
  access_token: '',
  refresh_token: '',
  expires_in: 0,
  expires_at: 0,
  token_type: 'bearer',
} as unknown as Session;

export default function App() {
  // Tenta pegar session real (se user já logou antes); senão usa mock
  const [session, setSession] = useState<Session | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // Usa session real se existir, senão cai pro mock
      setSession(data.session ?? MOCK_SESSION);
      setBootLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s ?? MOCK_SESSION);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      <UIProvider>
        <ToastProvider>
          {bootLoading ? (
            <div className="min-h-screen flex items-center justify-center bg-app text-app-text-muted">
              <div className="text-sm">Inicializando SASI…</div>
            </div>
          ) : (
            <Dashboard session={session ?? MOCK_SESSION} />
          )}
        </ToastProvider>
      </UIProvider>
    </ErrorBoundary>
  );
}
