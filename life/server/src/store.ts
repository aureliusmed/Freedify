import type { EtatDeVie } from "@life/shared";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Stockage MVP : un fichier JSON par joueur, avec cache mémoire.
 * L'interface est volontairement minimale pour pouvoir brancher
 * Postgres/Supabase plus tard sans toucher aux routes (brief §6).
 */
export interface Store {
  get(playerId: string): Promise<EtatDeVie | null>;
  put(etat: EtatDeVie): Promise<void>;
}

const ID_VALIDE = /^[a-zA-Z0-9_-]{1,64}$/;

export function validerPlayerId(id: unknown): id is string {
  return typeof id === "string" && ID_VALIDE.test(id);
}

export class FichierStore implements Store {
  private cache = new Map<string, EtatDeVie>();

  constructor(private dossier: string) {}

  private chemin(playerId: string): string {
    return path.join(this.dossier, `${playerId}.json`);
  }

  async get(playerId: string): Promise<EtatDeVie | null> {
    if (!validerPlayerId(playerId)) return null;
    const enCache = this.cache.get(playerId);
    if (enCache) return enCache;
    const fichier = this.chemin(playerId);
    if (!existsSync(fichier)) return null;
    try {
      const etat = JSON.parse(await readFile(fichier, "utf8")) as EtatDeVie;
      this.cache.set(playerId, etat);
      return etat;
    } catch {
      return null;
    }
  }

  async put(etat: EtatDeVie): Promise<void> {
    if (!validerPlayerId(etat.player_id)) throw new Error("player_id invalide");
    this.cache.set(etat.player_id, etat);
    await mkdir(this.dossier, { recursive: true });
    await writeFile(this.chemin(etat.player_id), JSON.stringify(etat, null, 2), "utf8");
  }
}
