// ============================================================================
// SASI · Login.tsx — Magic-link login (Supabase Auth)
// Tematizado pra responder aos 3 temas (dark/clinical/light) via tokens app-*.
// ============================================================================
import { useState, FormEvent } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Mail, ShieldCheck, AlertCircle } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: window.location.origin },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-app text-app-text px-4">
      <div className="w-full max-w-md bg-app-card border border-app-border rounded-2xl p-8 shadow-2xl sasi-fade-in">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-app-accent p-2 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-app-text">SASI</h1>
            <p className="text-xs text-app-text-muted">Comando UTI Alpha · 33 leitos</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <Mail className="w-12 h-12 mx-auto text-emerald-400 mb-3" />
            <p className="text-app-text-2 font-medium">
              Link enviado pra <span className="text-app-text">{email}</span>
            </p>
            <p className="text-sm text-app-text-muted mt-2">
              Abra o e-mail e clique no link mágico pra entrar.
            </p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-app-text-2">E-mail institucional</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.nicolas@hospital.com"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-app-tertiary border border-app-border text-app-text placeholder-app-text-muted focus:border-app-accent focus:outline-none transition"
              />
            </label>

            {error && (
              <div className="flex items-start gap-2 p-3 bg-red-950 border border-red-900 rounded-lg text-sm text-red-300">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-app-accent hover:bg-app-accent-hover disabled:bg-app-tertiary disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              {loading ? 'Enviando…' : 'Enviar link mágico'}
            </button>
          </form>
        )}

        <p className="text-xs text-app-text-muted mt-6 text-center">
          Sessão criptografada · LGPD art. 46 · RLS por <code>auth.uid()</code>
        </p>
      </div>
    </div>
  );
}
