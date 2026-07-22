import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Auth optionnelle via Supabase Auth (brief §6). Active uniquement si
 * SUPABASE_URL et SUPABASE_ANON_KEY sont définis. Sans configuration, aucune
 * vérification n'a lieu et le jeu reste 100 % anonyme (id localStorage).
 *
 * SÉCURITÉ : un Bearer token présent mais invalide provoque un 401, jamais un
 * repli silencieux sur le player_id du corps (règle R du plan). Le token est
 * vérifié côté serveur via `auth.getUser`.
 */

export interface AuthConfig {
  url: string;
  anonKey: string;
}

export function authConfigDepuisEnv(): AuthConfig | null {
  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (url && anonKey) return { url, anonKey };
  return null;
}

export type Verificateur = (token: string) => Promise<string | null>;

/** Retourne un vérificateur de JWT Supabase : token → user.id, ou null si invalide. */
export function creerVerificateur(cfg: AuthConfig): Verificateur {
  const client: SupabaseClient = createClient(cfg.url, cfg.anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return async (token: string): Promise<string | null> => {
    try {
      const { data, error } = await client.auth.getUser(token);
      if (error || !data.user) return null;
      return data.user.id;
    } catch {
      return null;
    }
  };
}
