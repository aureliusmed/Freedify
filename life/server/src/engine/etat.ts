import {
  type EtatDeVie,
  STATS_INITIALES,
  TOURNANTS_PAR_JOUR,
  phasePourAge,
} from "@life/shared";
import { randomUUID } from "node:crypto";

/** Minuit UTC du jour courant, en ISO — sert de clé de reset quotidien. */
export function minuitUtc(maintenant: Date = new Date()): string {
  const d = new Date(maintenant);
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

export function nouvelleVie(playerId?: string): EtatDeVie {
  return {
    player_id: playerId ?? randomUUID(),
    age: 0,
    phase: phasePourAge(0),
    stats: { ...STATS_INITIALES },
    seeds_actives: [],
    historique_tournants: [],
    flags_narratifs: [],
    tournants_restants_aujourdhui: TOURNANTS_PAR_JOUR,
    derniere_reset: minuitUtc(),
    vivant: true,
    cause_deces: null,
    tournant_en_cours: null,
  };
}

/**
 * Applique le reset quotidien (mécanique type Wordle) si un nouveau jour UTC
 * a commencé depuis le dernier reset. Mutations en place, retourne l'état.
 */
export function appliquerResetQuotidien(etat: EtatDeVie, maintenant: Date = new Date()): EtatDeVie {
  const aujourdhui = minuitUtc(maintenant);
  if (etat.derniere_reset !== aujourdhui) {
    etat.derniere_reset = aujourdhui;
    etat.tournants_restants_aujourdhui = TOURNANTS_PAR_JOUR;
  }
  return etat;
}
