import { z } from "zod";

// ---------------------------------------------------------------------------
// Phases de vie
// ---------------------------------------------------------------------------

export const PHASES = [
  "petite_enfance",
  "enfance",
  "adolescence",
  "jeune_adulte",
  "adulte",
  "milieu_de_vie",
  "senior",
] as const;

export type Phase = (typeof PHASES)[number];

export interface PhaseInfo {
  phase: Phase;
  label: string;
  ageMin: number;
  ageMax: number | null; // null = jusqu'à la mort
  /** pas de vieillissement moyen (années) par Tournant joué */
  pasAge: [min: number, max: number];
}

export const PHASE_INFOS: PhaseInfo[] = [
  { phase: "petite_enfance", label: "Petite enfance", ageMin: 0, ageMax: 5, pasAge: [1, 2] },
  { phase: "enfance", label: "Enfance", ageMin: 6, ageMax: 12, pasAge: [1, 2] },
  { phase: "adolescence", label: "Adolescence", ageMin: 13, ageMax: 17, pasAge: [1, 2] },
  { phase: "jeune_adulte", label: "Jeune adulte", ageMin: 18, ageMax: 25, pasAge: [1, 3] },
  { phase: "adulte", label: "Adulte", ageMin: 26, ageMax: 45, pasAge: [2, 4] },
  { phase: "milieu_de_vie", label: "Milieu de vie", ageMin: 46, ageMax: 65, pasAge: [2, 4] },
  { phase: "senior", label: "Sénior", ageMin: 66, ageMax: null, pasAge: [2, 4] },
];

export function phasePourAge(age: number): Phase {
  for (const info of PHASE_INFOS) {
    if (age >= info.ageMin && (info.ageMax === null || age <= info.ageMax)) {
      return info.phase;
    }
  }
  return "senior";
}

export function infoPhase(phase: Phase): PhaseInfo {
  const info = PHASE_INFOS.find((p) => p.phase === phase);
  if (!info) throw new Error(`Phase inconnue: ${phase}`);
  return info;
}

/** Contrainte structurelle : aucun contenu sexuel/romantique adulte avant 18 ans. */
export function estMineur(age: number): boolean {
  return age < 18;
}

// ---------------------------------------------------------------------------
// Flags narratifs
// ---------------------------------------------------------------------------

/**
 * Flags permanents dérivés d'événements de vie (brief §4 : « booléens
 * permanents qui débloquent/bloquent certains pools de cartes »). Une fois
 * acquis, un flag ne se retire jamais. `a_frole_la_mort` est un flag
 * intermédiaire technique (permet de dériver `miracule`).
 */
export const FLAGS_DERIVES = [
  "ruine", // richesse tombée à 0
  "fortune", // richesse montée à 100
  "moralite_noire", // moralité tombée sous 10
  "saint", // moralité montée au-dessus de 90
  "solitaire", // capital social tombé sous 10
  "pilier_social", // capital social monté au-dessus de 90
  "a_frole_la_mort", // santé passée sous 10 (intermédiaire)
  "miracule", // santé remontée au-dessus de 30 après avoir frôlé la mort
  "survivant", // a dépassé 85 ans
] as const;

export type FlagDerive = (typeof FLAGS_DERIVES)[number];

// ---------------------------------------------------------------------------
// Stats
// ---------------------------------------------------------------------------

export const STAT_KEYS = [
  "sante",
  "richesse",
  "capital_social",
  "moralite",
  "tonalite",
  "chance",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

export type Stats = Record<StatKey, number>;

/** Deltas appliqués aux stats (peuvent être négatifs). */
export type Impact = Partial<Record<StatKey, number>>;

export const STATS_INITIALES: Stats = {
  sante: 80,
  richesse: 50,
  capital_social: 50,
  moralite: 50,
  tonalite: 50,
  chance: 50,
};

export function clampStat(v: number): number {
  return Math.max(0, Math.min(100, Math.round(v)));
}

export function appliquerImpact(stats: Stats, impact: Impact): Stats {
  const suivantes = { ...stats };
  for (const key of STAT_KEYS) {
    const delta = impact[key];
    if (typeof delta === "number" && delta !== 0) {
      suivantes[key] = clampStat(suivantes[key] + delta);
    }
  }
  return suivantes;
}

// ---------------------------------------------------------------------------
// Tournants (cartes de jeu)
// ---------------------------------------------------------------------------

export const ImpactSchema = z
  .object({
    sante: z.number().int().min(-25).max(25).optional(),
    richesse: z.number().int().min(-25).max(25).optional(),
    capital_social: z.number().int().min(-25).max(25).optional(),
    moralite: z.number().int().min(-25).max(25).optional(),
    tonalite: z.number().int().min(-25).max(25).optional(),
    chance: z.number().int().min(-25).max(25).optional(),
  })
  .strict();

export const SeedPlanteeSchema = z
  .object({
    description_interne: z.string().min(3).max(300),
    delai: z.number().int().min(2).max(15),
  })
  .strict();

export const ChoixSchema = z
  .object({
    id: z.string().min(1).max(8),
    texte: z.string().min(3).max(200),
    impact_prevu: ImpactSchema,
    plante_seed: SeedPlanteeSchema.nullable(),
  })
  .strict();

export const TournantSchema = z
  .object({
    tournant_id: z.string().min(1).max(64),
    situation: z.string().min(10).max(600),
    choix: z.array(ChoixSchema).min(2).max(4),
  })
  .strict();

export type SeedPlantee = z.infer<typeof SeedPlanteeSchema>;
export type Choix = z.infer<typeof ChoixSchema>;
export type Tournant = z.infer<typeof TournantSchema> & {
  /** provenance de la carte, pour la télémétrie et le debug */
  source?: "ia" | "fallback";
};

// ---------------------------------------------------------------------------
// État de vie (modèle de données du brief, §4)
// ---------------------------------------------------------------------------

export interface SeedActive {
  id: string;
  origine_tournant_id: string;
  description_interne: string;
  delai_resurgence: number;
  tournants_ecoules: number;
}

export interface HistoriqueTournant {
  id: string;
  age: number;
  resume: string;
  choix_fait: string;
  resultat: string;
  impact: Impact;
}

export interface EtatDeVie {
  player_id: string;
  age: number;
  phase: Phase;
  stats: Stats;
  seeds_actives: SeedActive[];
  historique_tournants: HistoriqueTournant[];
  flags_narratifs: string[];
  tournants_restants_aujourdhui: number;
  /** Tournants supplémentaires débloqués (monétisation §7) : consommés APRÈS
   *  le quota quotidien, non réinitialisés au reset. Jouent sur la vitesse
   *  uniquement, jamais sur les stats (pas de pay-to-win). */
  tournants_bonus: number;
  derniere_reset: string; // ISO, minuit UTC du jour courant
  vivant: boolean;
  cause_deces: string | null;
  /** carte générée en attente de résolution (anti-triche : le serveur fait foi) */
  tournant_en_cours: Tournant | null;
}

export const TOURNANTS_PAR_JOUR = 5;
export const MAX_SEEDS_ACTIVES = 5;
/** Tournants bonus accordés par achat (monétisation §7). */
export const TOURNANTS_BONUS_PAR_ACHAT = 5;

/** Tournants jouables maintenant : quota du jour + bonus débloqués. */
export function tournantsJouables(etat: {
  tournants_restants_aujourdhui: number;
  tournants_bonus: number;
}): number {
  return etat.tournants_restants_aujourdhui + etat.tournants_bonus;
}
/** nb d'entrées d'historique envoyées en contexte complet à l'IA */
export const HISTORIQUE_CONTEXTE = 12;

// ---------------------------------------------------------------------------
// Résultats d'API
// ---------------------------------------------------------------------------

export interface ResultatResolution {
  resultat: string;
  impacts_finaux: Impact;
  etat: EtatDeVie;
  mort: boolean;
}

export interface BilanDeVie {
  titre: string;
  texte: string;
  stat_marquante: string;
  age_final: number;
  tonalite_finale: number;
}
