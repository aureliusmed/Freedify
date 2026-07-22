import type { BilanDeVie, EtatDeVie, Impact, Tournant } from "@life/shared";
import { tokenAcces } from "./auth";

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string | undefined,
    message: string,
  ) {
    super(message);
  }
}

async function requete<T>(chemin: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = await tokenAcces();
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(chemin, {
    ...options,
    headers: { ...headers, ...(options?.headers as Record<string, string> | undefined) },
  });
  const corps = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    throw new ApiError(res.status, corps.code as string | undefined, (corps.erreur as string) ?? "erreur serveur");
  }
  return corps as T;
}

export function chargerVie(playerId: string): Promise<{ etat: EtatDeVie }> {
  return requete(`/api/vie/${playerId}`);
}

export function nouvelleVie(playerId?: string): Promise<{ etat: EtatDeVie }> {
  return requete("/api/vie/nouvelle", {
    method: "POST",
    body: JSON.stringify(playerId ? { player_id: playerId } : {}),
  });
}

export function genererTournant(playerId: string): Promise<{ tournant: Tournant; restants: number }> {
  return requete("/api/tournant/generer", {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}

export interface ReponseResolution {
  resultat: string;
  impacts_finaux: Impact;
  issue: "bonne" | "neutre" | "mauvaise";
  mort: boolean;
  etat: EtatDeVie;
}

export function resoudreTournant(
  playerId: string,
  tournantId: string,
  choixId: string,
): Promise<ReponseResolution> {
  return requete("/api/tournant/resoudre", {
    method: "POST",
    body: JSON.stringify({ player_id: playerId, tournant_id: tournantId, choix_id: choixId }),
  });
}

export function genererBilan(playerId: string): Promise<{ bilan: BilanDeVie }> {
  return requete("/api/vie/bilan", {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}

/** Débloque des Tournants supplémentaires le jour même (monétisation §7). */
export function acheterTournants(playerId: string): Promise<{ etat: EtatDeVie; credites: number }> {
  return requete("/api/boutique/tournants", {
    method: "POST",
    body: JSON.stringify({ player_id: playerId }),
  });
}

/** Migre une vie anonyme vers le compte authentifié (idempotent côté serveur). */
export function adopterVie(playerIdAnonyme: string): Promise<{ etat: EtatDeVie; adopte: boolean }> {
  return requete("/api/vie/adopter", {
    method: "POST",
    body: JSON.stringify({ player_id_anonyme: playerIdAnonyme }),
  });
}

const CLE_JOUEUR = "life:player_id";

/** Identité MVP : id anonyme persisté côté client (auth Google/Apple : roadmap étape 7). */
export function playerIdLocal(): string | null {
  return localStorage.getItem(CLE_JOUEUR);
}

export function memoriserPlayerId(id: string): void {
  localStorage.setItem(CLE_JOUEUR, id);
}
