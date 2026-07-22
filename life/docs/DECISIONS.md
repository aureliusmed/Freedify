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

## ADR-012 — Push du reset : scheduler in-process, abonnements en fichier

**Contexte.** Brief §6 : notifications push web pour signaler le reset
quotidien. **Décision.** Web Push (VAPID), **optionnel** : sans les trois
variables VAPID, `/api/sante` renvoie `push:false`, la route d'abonnement
répond 503 et le bouton front est masqué. Le serveur expose sa clé publique sur
`/api/push/cle` ; les abonnements sont persistés dans un fichier JSON
(`server/data/push-subscriptions.json`, git-ignoré) ; un `setInterval` d'une
minute déclenche l'envoi au passage de minuit UTC et purge les abonnements
morts (404/410). **Conséquences.** Suffisant pour un MVP mono-instance ; un
ordonnanceur dédié et un stockage partagé des abonnements seront nécessaires en
multi-instance (à faire avec l'infra). Validé sur les deux chemins (avec/sans
clés VAPID) ; l'envoi réel n'a pas été testé faute d'un endpoint push réel.

## ADR-011 — Auth optionnelle par-dessus l'anonyme, Apple reporté

**Contexte.** Brief §6 : auth Google/Apple, session persistante. **Décision.**
Auth Google via Supabase Auth, **optionnelle** : sans config (`SUPABASE_URL`/
`SUPABASE_ANON_KEY` côté serveur, `VITE_SUPABASE_*` côté web), le jeu reste
100 % anonyme (id localStorage). Un hook Fastify `preValidation` vérifie le
Bearer token via `auth.getUser` et force le `player_id` du corps à l'id du
compte ; un token invalide donne un 401 (jamais de repli silencieux). Une route
`POST /api/vie/adopter` migre la vie anonyme vers le compte, une seule fois (ne
écrase jamais une vie de compte existante). **Apple reporté** (exige un compte
développeur Apple). **Conséquences.** Un compte joue toujours sur sa propre vie
(anti-usurpation) ; le code auth est inerte sans config et n'a pu être validé
que sur le chemin « sans config » — les chemins authentifiés sont à vérifier
avec un vrai projet Supabase.

## ADR-010 — Pool mutualisé de cartes de petite enfance

**Contexte.** Brief §6 : les cartes de petite enfance sont peu différenciées
entre joueurs ; les mutualiser réduit les appels IA. **Décision.** Un
`PoolPhase` en mémoire, partagé entre joueurs, sert des cartes de petite
enfance quand aucune seed n'est prête ; chaque carte servie reçoit un
`tournant_id` neuf et est retirée du pool (unicité par joueur). Le pool se
réapprovisionne en tâche de fond (une génération IA par service, non
bloquante) tant qu'il contient moins de 10 cartes. **Conséquences.** Zéro appel
IA quand le pool répond ; comportement strictement inchangé sans clé API (pool
vide → fallback). Une seed prête ne passe jamais par le pool (elle exige une
carte contextualisée). Le pool étant en mémoire, il est perdu au redémarrage et
se reconstitue — acceptable pour le MVP mono-instance.

## ADR-009 — Flags narratifs dérivés par seuils, permanents

**Contexte.** `flags_narratifs` (brief §4) existait dans le modèle mais n'était
jamais alimenté. **Décision.** Une fonction pure `deriverFlags(avant, apres,
age, flagsExistants)` pose des flags permanents à partir de seuils de stats
(`ruine`, `fortune`, `moralite_noire`, `saint`, `solitaire`, `pilier_social`)
et de l'âge (`survivant` à 86 ans). `miracule` passe par un flag intermédiaire
`a_frole_la_mort` (santé < 10) et n'est posé qu'au tournant suivant si la santé
remonte au-dessus de 30. Les flags sont injectés dans le contexte IA
(`prompts.ts`) pour colorer la génération. **Conséquences.** Un flag acquis ne
se retire jamais (pas de doublon) ; la fonction est testable indépendamment de
`resoudreChoix`. Les flags dépendent de stats calculées par le moteur — pas de
LLM dans la boucle (cohérent avec ADR-001).

## ADR-008 — Consommation de seed seulement si la carte IA l'exploite

**Décision.** Une seed prête à ressurgir n'est retirée de l'état que si la
carte a été générée par l'IA (qui a reçu l'instruction de la faire ressurgir).
Une carte de fallback ne consomme pas la seed. **Conséquences.** Les graines
narratives ne sont jamais « brûlées » par une carte générique.
