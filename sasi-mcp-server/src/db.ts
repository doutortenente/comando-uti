import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getDB(): SupabaseClient {
  if (!_client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.\n" +
        "Encontre em: https://supabase.com/dashboard/project/_/settings/api"
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

export function handleDBError(error: unknown): string {
  if (error && typeof error === "object") {
    const e = error as Record<string, unknown>;
    const msg = (e["message"] as string) ?? "Erro desconhecido";
    const code = e["code"] as string | undefined;
    const hint = e["hint"] as string | undefined;
    if (code === "23505") return `Erro: registro duplicado — ${msg}`;
    if (code === "23503") return `Erro: FK inválida — ${msg}`;
    if (code === "42501") return `Erro: permissão negada — ${msg}`;
    if (hint) return `Erro ${code ?? ""}: ${msg} (hint: ${hint})`;
    return `Erro ${code ?? ""}: ${msg}`;
  }
  return `Erro: ${String(error)}`;
}

/** Formata timestamp BR */
export function fmtTs(ts: string | null | undefined): string {
  if (!ts) return "—";
  return new Date(ts).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

/** Semáforo → emoji */
export function semaforo(g: string): string {
  return g === "critico" || g === "grave" ? "🔴"
    : g === "moderado" ? "🟡"
    : g === "obito" ? "⚫"
    : "🟢";
}
