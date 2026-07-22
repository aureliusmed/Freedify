import {
  type EtatDeVie,
  type SeedActive,
  HISTORIQUE_CONTEXTE,
  infoPhase,
} from "@life/shared";

/**
 * Prompt système du moteur narratif (brief §5, v1). Gelé et sans contenu
 * dynamique pour rester cacheable (préfixe stable) ; tout le contexte
 * variable part dans le message utilisateur.
 */
export const PROMPT_SYSTEME_GENERATION = `Tu es le moteur narratif du jeu LIFE. Tu génères UNE carte "Tournant" à la fois,
sous forme de JSON strict, rien d'autre.

CONTEXTE REÇU : état de vie du joueur (âge, phase, stats, historique récent,
seeds narratives en attente).

RÈGLES DE TON :
- Tonalité stat basse (0-30) → carte plutôt dark humor / cynique / dramatique.
- Tonalité stat haute (70-100) → carte plutôt feel-good / légère / absurde-mignonne.
- Tonalité moyenne (30-70) → mélange, contraste comique bienvenu.
- Toujours viser un ton qui reste divertissant, jamais complaisant sur la souffrance
  gratuite ni moralisateur.

RÈGLES DE CONTENU (NON NÉGOCIABLES) :
- Si l'âge du personnage est inférieur à 18 ans : AUCUNE carte à connotation
  sexuelle ou romantique adulte. Thèmes autorisés pour cette tranche : école,
  amitiés, famille, premiers émois platoniques évoqués sans détail, petite
  délinquance légère, sport, loisirs, premiers choix moraux.
- Jamais de détails opérationnels réels sur drogues, armes, actes violents ou
  méthodes d'auto-agression, quel que soit l'âge du personnage.
- Jamais de contenu sexuel explicite, à tout âge.
- Les thèmes matures (crime, addiction, corruption, deuil, échec) sont autorisés
  à partir de 18 ans, traités par les CONSÉQUENCES narratives, jamais par le détail
  factuel de l'acte.

RÈGLES STRUCTURELLES :
- Si une seed narrative est fournie comme prête à ressurgir, elle a PRIORITÉ :
  la carte doit faire ressurgir cet événement passé, contextualisé.
- Chaque choix proposé doit avoir une conséquence plausible et distincte —
  éviter les choix cosmétiques sans impact.
- Longueur : situation en 2 à 4 lignes max, choix en une phrase courte chacun.
- Les impacts sont des entiers entre -25 et +25, la plupart entre -8 et +8.
- Langue : français. Tutoiement du joueur.`;

export const PROMPT_SYSTEME_RESOLUTION = `Tu es le moteur narratif du jeu LIFE. Le joueur vient de faire un choix sur une
carte "Tournant". Écris le résultat narratif de ce choix : 1 à 2 lignes maximum,
en français, tutoiement, dans le ton indiqué (issue bonne, neutre ou mauvaise).
Mêmes règles de contenu que pour la génération : rien de sexuel explicite, aucun
détail opérationnel, aucun contenu romantique/sexuel si le personnage a moins de
18 ans. Réponds uniquement avec le texte du résultat, sans guillemets.`;

export const PROMPT_SYSTEME_BILAN = `Tu es le moteur narratif du jeu LIFE. Le personnage vient de mourir. Rédige sa
carte "Bilan de vie" : un résumé façon nécrologie ou CV décalé, en français.
Ton dark humor si la tonalité finale est basse (0-40), feel-good si elle est
haute (60-100), doux-amer entre les deux. Mets en avant UNE statistique absurde
ou marquante de sa vie. Jamais de contenu sexuel explicite ni de détail
opérationnel. Sois bref : titre percutant, texte de 3 à 6 lignes.`;

function resumerSeeds(seeds: SeedActive[]): string {
  if (seeds.length === 0) return "aucune";
  return seeds
    .map(
      (s) =>
        `- [${s.id}] ${s.description_interne} (écoulés: ${s.tournants_ecoules}/${s.delai_resurgence})`,
    )
    .join("\n");
}

export function contexteGeneration(etat: EtatDeVie, seedARessurgir: SeedActive | null): string {
  const info = infoPhase(etat.phase);
  const historique = etat.historique_tournants.slice(-HISTORIQUE_CONTEXTE);
  const resumeAncien =
    etat.historique_tournants.length > HISTORIQUE_CONTEXTE
      ? `(${etat.historique_tournants.length - HISTORIQUE_CONTEXTE} tournants plus anciens résumés : vie déjà bien entamée, flags ci-dessous.)`
      : "";

  return [
    `ÉTAT DE VIE DU JOUEUR`,
    `- Âge : ${etat.age} ans (${info.label})`,
    `- Personnage mineur : ${etat.age < 18 ? "OUI — règles mineurs strictes" : "non"}`,
    `- Stats : ${JSON.stringify(etat.stats)}`,
    `- Flags narratifs : ${etat.flags_narratifs.join(", ") || "aucun"}`,
    ``,
    `SEEDS EN ATTENTE :`,
    resumerSeeds(etat.seeds_actives),
    seedARessurgir
      ? `\nSEED À FAIRE RESSURGIR MAINTENANT (PRIORITÉ) : ${seedARessurgir.description_interne}`
      : `\nAucune seed prête : génère une carte neuve adaptée à la phase de vie.`,
    ``,
    resumeAncien,
    `DERNIERS TOURNANTS :`,
    historique.length === 0
      ? "(début de vie, aucun tournant joué)"
      : historique
          .map((h) => `- (${h.age} ans) ${h.resume} → choix : ${h.choix_fait} → ${h.resultat}`)
          .join("\n"),
    ``,
    `Génère la prochaine carte Tournant.`,
  ].join("\n");
}
