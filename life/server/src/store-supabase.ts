import type { EtatDeVie } from "@life/shared";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { validerPlayerId, type Store } from "./store.js";

/**
 * Stockage Postgres via Supabase (brief §6), derrière la même interface `Store`
 * que le store fichier (ADR-006) : seule l'implémentation change, pas les
 * routes. L'état complet est stocké comme document JSON dans la table `vies`
 * (voir sql/schema.sql).
 *
 * SÉCURITÉ : utilise la service role key, exclusivement côté serveur. Ne jamais
 * l'exposer au front. Aucun secret en dur — tout vient de l'environnement.
 */
export class SupabaseStore implements Store {
  private client: SupabaseClient;

  constructor(url: string, serviceRoleKey: string) {
    this.client = createClient(url, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }

  async get(playerId: string): Promise<EtatDeVie | null> {
    if (!validerPlayerId(playerId)) return null;
    const { data, error } = await this.client
      .from("vies")
      .select("etat")
      .eq("player_id", playerId)
      .maybeSingle();
    if (error) throw new Error(`Supabase get: ${error.message}`);
    return (data?.etat as EtatDeVie | undefined) ?? null;
  }

  async put(etat: EtatDeVie): Promise<void> {
    if (!validerPlayerId(etat.player_id)) throw new Error("player_id invalide");
    const { error } = await this.client
      .from("vies")
      .upsert({ player_id: etat.player_id, etat, updated_at: new Date().toISOString() });
    if (error) throw new Error(`Supabase put: ${error.message}`);
  }
}
