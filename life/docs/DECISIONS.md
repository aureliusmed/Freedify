# DECISIONS — LIFE (format ADR court)

## ADR-001 — Impacts calculés par le moteur, narration par l'IA

**Contexte.** Le brief (§5) prévoit un second appel qui « évalue le résultat du
choix et met à jour les stats ». **Décision.** Le moteur serveur calcule les
impacts finaux de façon déterministe (impact prévu × issue tirée selon la stat
de chance) ; le second appel IA ne produit que le texte narratif (1-2 lignes).
**Conséquences.** Anti-triche (les stats ne dépendent jamais d'une sortie LLM),
coût réduit (appel court), et la mention du brief « peuvent différer légèrement
de impact_prevu pour intégrer un facteur chance » est respectée par le moteur.

## ADR-002 — Sorties structurées plutôt que parsing de JSON libre

**Décision.** La génération de cartes et de bilans utilise les sorties
structurées de l'API Claude (`output_config.format` + schéma zod) au lieu de
demander « du JSON strict » en prose. **Conséquences.** Zéro parsing fragile,
validation automatique, retry SDK sur non-conformité ; le schéma zod de
`@life/shared` est l'unique source de vérité du format de carte.

## ADR-003 — Trois couches de garde-fous de contenu

**Décision.** (1) prompt système avec règles non négociables ; (2) filtre
regex post-génération avec liste renforcée pour personnage < 18 ans —
contrainte structurelle, pas seulement de ton ; (3) fallback sur banque de
cartes pré-écrites en cas de rejet, d'erreur API ou de refus modèle.
**Conséquences.** Aucune sortie IA n'atteint le joueur sans passer le filtre ;
le jeu reste jouable même sans IA.

## ADR-004 — Vieillissement à pas variable par phase

**Contexte.** Le brief ne spécifie pas la vitesse d'écoulement du temps.
**Décision.** Chaque Tournant fait avancer l'âge d'un pas aléatoire dépendant
de la phase (1-2 ans enfant, 2-4 ans adulte), soit une vie complète en
~35-45 Tournants ≈ 7-9 jours de jeu à 5/jour. **Conséquences.** Rythme de
rendez-vous quotidien satisfaisant ; ajustable dans `PHASE_INFOS.pasAge`.

## ADR-005 — Reset quotidien sur minuit UTC

**Décision.** Le quota de 5 Tournants se recharge à minuit UTC, calculé côté
serveur (`derniere_reset`). **Conséquences.** Simple, anti-triche (pas de
manipulation d'horloge client) ; un reset par fuseau local du joueur pourra
remplacer UTC quand l'auth portera un profil.

## ADR-006 — Stockage fichier JSON derrière une interface `Store`

**Décision.** MVP : un fichier JSON par joueur + cache mémoire, derrière une
interface `Store` à deux méthodes. **Conséquences.** Zéro infra pour prototyper ;
la bascule Postgres/Supabase (prévue au brief §6) ne touche que `store.ts`.

## ADR-007 — Carte en attente stockée serveur (`tournant_en_cours`)

**Décision.** La carte générée est persistée dans l'état jusqu'à résolution ;
`generer` est idempotent (renvoie la carte en attente) et `resoudre` vérifie
l'id. **Conséquences.** Pas de double génération en cas de refresh, pas de
résolution d'une carte forgée côté client.

## ADR-008 — Consommation de seed seulement si la carte IA l'exploite

**Décision.** Une seed prête à ressurgir n'est retirée de l'état que si la
carte a été générée par l'IA (qui a reçu l'instruction de la faire ressurgir).
Une carte de fallback ne consomme pas la seed. **Conséquences.** Les graines
narratives ne sont jamais « brûlées » par une carte générique.
