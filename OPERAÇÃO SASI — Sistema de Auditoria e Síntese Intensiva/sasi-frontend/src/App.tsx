// ============================================================================
// SASI — Comando UTI Alpha · App.tsx (Supabase-native, zero Firebase)
// Wrapper com UIProvider pros 3 temas (dark/clinical/light) e 3 view modes.
// ============================================================================
import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './lib/supabaseClient';
import { UIProvider } from './lib/theme';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './components/Login';
import Dashboard from './components/Dashboard';

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [bootLoading, setBootLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setBootLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return (
    <ErrorBoundary>
      <UIProvider>
        {bootLoading ? (
          <div className="min-h-screen flex items-center justify-center bg-app text-app-text-muted">
            <div className="text-sm">Inicializando SASI…</div>
          </div>
        ) : !session ? (
          <Login />
        ) : (
          <Dashboard session={session} />
        )}
      </UIProvider>
    </ErrorBoundary>
  );
}
