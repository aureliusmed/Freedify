import {
  type Choix,
  type EtatDeVie,
  type Impact,
  type SeedActive,
  type Stats,
  type Tournant,
  HISTORIQUE_CONTEXTE,
  MAX_SEEDS_ACTIVES,
  STAT_KEYS,
  appliquerImpact,
  infoPhase,
  phasePourAge,
} from "@life/shared";
import { randomUUID } from "node:crypto";

export type Rng = () => number;

export type Issue = "mauvaise" | "neutre" | "bonne";

/**
 * Tire l'issue du choix, modulée par la stat de chance (brief §3) :
 * une chance haute réduit la probabilité d'issue mauvaise et augmente la bonne.
 */
export function tirerIssue(chance: number, rng: Rng): Issue {
  const biais = (chance - 50) / 200; // -0.25 .. +0.25
  const r = rng();
  if (r < 0.25 - biais) return "mauvaise";
  if (r > 0.75 - biais) return "bonne";
  return "neutre";
}

/**
 * Calcule les impacts finaux à partir de l'impact prévu du choix et de
 * l'issue tirée. Les impacts peuvent « différer légèrement » de l'impact
 * prévu (brief §5) : amplification des pertes sur une mauvaise issue,
 * bonus sur une bonne.
 */
export function impactsFinaux(prevu: Impact, issue: Issue): Impact {
  const finaux: Impact = {};
  for (const key of STAT_KEYS) {
    const d = prevu[key];
    if (typeof d !== "number" || d === 0) continue;
    let v = d;
    if (issue === "mauvaise") v = d < 0 ? Math.round(d * 1.5) : Math.ceil(d / 2);
    if (issue === "bonne") v = d > 0 ? Math.round(d * 1.5) : Math.ceil(d / 2);
    finaux[key] = v;
  }
  return finaux;
}

/** Fait vieillir les seeds ; retourne la seed prête à ressurgir (la plus ancienne), s'il y en a une. */
export function seedPrete(etat: EtatDeVie): SeedActive | null {
  const pretes = etat.seeds_actives.filter((s) => s.tournants_ecoules >= s.delai_resurgence);
  if (pretes.length === 0) return null;
  // priorité à la plus ancienne = celle qui a le plus attendu au-delà de son délai
  return pretes.sort(
    (a, b) => b.tournants_ecoules - b.delai_resurgence - (a.tournants_ecoules - a.delai_resurgence),
  )[0]!;
}

export function consommerSeed(etat: EtatDeVie, seedId: string): void {
  etat.seeds_actives = etat.seeds_actives.filter((s) => s.id !== seedId);
}

/** Avance l'âge selon la phase courante (pas variable, brief §3 « une vie entière »). */
export function avancerAge(etat: EtatDeVie, rng: Rng): void {
  const info = infoPhase(etat.phase);
  const [min, max] = info.pasAge;
  etat.age += min + Math.floor(rng() * (max - min + 1));
  etat.phase = phasePourAge(etat.age);
}

/** Vérifie la mort : santé à 0, ou mortalité croissante en phase sénior. */
export function verifierMort(etat: EtatDeVie, rng: Rng): string | null {
  if (etat.stats.sante <= 0) return "sante";
  if (etat.age >= 70) {
    const p = Math.min(0.9, (etat.age - 70) * 0.05);
    if (rng() < p) return "vieillesse";
  }
  return null;
}

export interface Resolution {
  issue: Issue;
  impacts: Impact;
  mort: boolean;
  causeMort: string | null;
}

/**
 * Dérive les nouveaux flags narratifs à ajouter (brief §4), à partir des
 * stats avant/après application des impacts et de l'âge courant. Fonction
 * pure : ne retourne que les flags absents de `flagsExistants`, jamais de
 * doublon. Un flag acquis ne se retire jamais.
 */
export function deriverFlags(
  avant: Stats,
  apres: Stats,
  age: number,
  flagsExistants: string[],
): string[] {
  const nouveaux: string[] = [];
  const ajouter = (flag: string, condition: boolean) => {
    if (condition && !flagsExistants.includes(flag) && !nouveaux.includes(flag)) {
      nouveaux.push(flag);
    }
  };

  ajouter("ruine", apres.richesse <= 0);
  ajouter("fortune", apres.richesse >= 100);
  ajouter("moralite_noire", apres.moralite < 10);
  ajouter("saint", apres.moralite > 90);
  ajouter("solitaire", apres.capital_social < 10);
  ajouter("pilier_social", apres.capital_social > 90);
  ajouter("a_frole_la_mort", apres.sante < 10);
  // `miracule` exige d'avoir DÉJÀ frôlé la mort lors d'un tournant précédent,
  // puis d'être remonté au-dessus de 30 — jamais dans le même tournant.
  ajouter("miracule", flagsExistants.includes("a_frole_la_mort") && apres.sante > 30);
  ajouter("survivant", age >= 86);

  void avant; // conservé dans la signature pour d'éventuels flags par transition
  return nouveaux;
}

/**
 * Résout le choix du joueur sur le tournant en cours : impacts, seeds,
 * vieillissement, quota quotidien, mort. Mute l'état ; le texte narratif du
 * résultat est produit séparément (IA ou fallback) et ajouté à l'historique
 * par l'appelant via `enregistrerHistorique`.
 */
export function resoudreChoix(
  etat: EtatDeVie,
  tournant: Tournant,
  choix: Choix,
  rng: Rng = Math.random,
): Resolution {
  const issue = tirerIssue(etat.stats.chance, rng);
  const impacts = impactsFinaux(choix.impact_prevu, issue);
  const avant = { ...etat.stats };
  etat.stats = appliquerImpact(etat.stats, impacts);

  // Seeds : celles en attente vieillissent d'un tournant.
  for (const seed of etat.seeds_actives) seed.tournants_ecoules += 1;

  // Le choix peut planter une nouvelle seed (max 5 simultanées, brief §4).
  if (choix.plante_seed && etat.seeds_actives.length < MAX_SEEDS_ACTIVES) {
    etat.seeds_actives.push({
      id: `seed_${randomUUID().slice(0, 8)}`,
      origine_tournant_id: tournant.tournant_id,
      description_interne: choix.plante_seed.description_interne,
      delai_resurgence: choix.plante_seed.delai,
      tournants_ecoules: 0,
    });
  }

  avancerAge(etat, rng);
  // Consomme le quota du jour en priorité, puis les tournants bonus (§7).
  if (etat.tournants_restants_aujourdhui > 0) {
    etat.tournants_restants_aujourdhui -= 1;
  } else if (etat.tournants_bonus > 0) {
    etat.tournants_bonus -= 1;
  }
  etat.tournant_en_cours = null;

  // Flags narratifs permanents dérivés de l'évolution des stats et de l'âge.
  const nouveauxFlags = deriverFlags(avant, etat.stats, etat.age, etat.flags_narratifs);
  if (nouveauxFlags.length > 0) etat.flags_narratifs.push(...nouveauxFlags);

  const causeMort = verifierMort(etat, rng);
  if (causeMort) {
    etat.vivant = false;
    etat.cause_deces = causeMort;
  }

  return { issue, impacts, mort: !!causeMort, causeMort };
}

export function enregistrerHistorique(
  etat: EtatDeVie,
  tournant: Tournant,
  choix: Choix,
  resultat: string,
  impacts: Impact,
): void {
  etat.historique_tournants.push({
    id: tournant.tournant_id,
    age: etat.age,
    resume: tournant.situation,
    choix_fait: choix.texte,
    resultat,
    impact: impacts,
  });
  // On garde tout côté stockage, mais le contexte IA n'utilise que les
  // HISTORIQUE_CONTEXTE dernières entrées (brief §4) — pas de troncature ici,
  // la sélection se fait au moment de construire le prompt.
  void HISTORIQUE_CONTEXTE;
}
