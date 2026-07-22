import { type Tournant, estMineur } from "@life/shared";

/**
 * Modération post-génération (brief §5) : filtrage par mots-clés avant
 * affichage, en plus des règles du prompt système. Une carte rejetée ici
 * est remplacée par une carte de la banque de secours.
 *
 * Deux niveaux :
 *  - INTERDITS_TOUJOURS : contenu banni quel que soit l'âge du personnage
 *    (sexuel explicite, détails opérationnels, gore).
 *  - INTERDITS_MINEURS : toute connotation sexuelle/romantique adulte tant
 *    que le personnage a moins de 18 ans — contrainte STRUCTURELLE, pas
 *    seulement une consigne de ton (brief §2).
 */

const INTERDITS_TOUJOURS: RegExp[] = [
  // contenu sexuel explicite
  /\b(porno(graphique)?|fellation|sodomie|orgasme|masturb\w*)\b/i,
  // détails opérationnels réels : drogues, armes, auto-agression
  /\b(recette|synth[eé]tiser|fabriquer|dosage|grammes?)\b.{0,40}\b(m[eé]th|coca[iï]ne|h[eé]ro[iï]ne|explosif|bombe)\b/i,
  /\b(comment|m[eé]thode|tutoriel)\b.{0,40}\b(se suicider|se scarifier|s'automutiler|tuer quelqu'un)\b/i,
  // gore graphique
  /\b([eé]viscér\w*|d[eé]membr\w*|d[eé]capit\w*)\b/i,
];

const INTERDITS_MINEURS: RegExp[] = [
  /\b(sexe|sexuel(le)?s?|coucher avec|nuit torride|liaison|amant(e)?s?|s[eé]duction|flirt\w*|drague\w*|baiser langoureux|d[eé]shabill\w*|caresse\w*)\b/i,
  /\b(petit[- ]ami|petite[- ]amie|rendez-vous amoureux|histoire d'amour|tomber amoureux|relation amoureuse)\b/i,
];

export interface VerdictModeration {
  ok: boolean;
  raison?: string;
}

function texteComplet(t: Tournant): string {
  return [t.situation, ...t.choix.map((c) => c.texte)].join("\n");
}

export function moderer(tournant: Tournant, agePersonnage: number): VerdictModeration {
  const texte = texteComplet(tournant);

  for (const re of INTERDITS_TOUJOURS) {
    if (re.test(texte)) return { ok: false, raison: `contenu interdit (${re.source.slice(0, 30)}…)` };
  }

  if (estMineur(agePersonnage)) {
    for (const re of INTERDITS_MINEURS) {
      if (re.test(texte)) {
        return { ok: false, raison: "connotation romantique/sexuelle sur personnage mineur" };
      }
    }
  }

  return { ok: true };
}

/** Modère un texte libre (résultat narratif, bilan). */
export function modererTexte(texte: string, agePersonnage: number): VerdictModeration {
  const faux: Tournant = {
    tournant_id: "x",
    situation: texte.padEnd(10, "."),
    choix: [
      { id: "a", texte: "n/a", impact_prevu: {}, plante_seed: null },
      { id: "b", texte: "n/a", impact_prevu: {}, plante_seed: null },
    ],
  };
  return moderer(faux, agePersonnage);
}
