// ============================================================================
// SASI · Login.tsx
// Magic-link login (Supabase Auth). Sem senhas, sem Firebase, sem desculpas.
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
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-red-600 p-2 rounded-lg"><ShieldCheck className="w-6 h-6 text-white" /></div>
          <div>
            <h1 className="text-xl font-bold text-white">SASI</h1>
            <p className="text-xs text-slate-400">Comando UTI Alpha · 33 leitos</p>
          </div>
        </div>

        {sent ? (
          <div className="text-center py-6">
            <Mail className="w-12 h-12 mx-auto text-green-400 mb-3" />
            <p className="text-slate-200 font-medium">Link enviado pra <span className="text-white">{email}</span></p>
            <p className="text-sm text-slate-400 mt-2">Abra o e-mail e clique no link mágico pra entrar.</p>
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block">
              <span className="text-sm text-slate-300">E-mail institucional</span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="dr.nicolas@hospital.com"
                className="mt-1 w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:border-red-500 focus:outline-none"
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
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-medium rounded-lg transition"
            >
              {loading ? 'Enviando…' : 'Enviar link mágico'}
            </button>
          </form>
        )}

        <p className="text-xs text-slate-500 mt-6 text-center">
          Sessão criptografada · LGPD art. 46 · RLS por <code>auth.uid()</code>
        </p>
      </div>
    </div>
  );
}
