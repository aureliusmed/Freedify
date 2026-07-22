# LIFE — Brief de développement complet

## 1. Vision produit

Simulateur de vie par choix textuels, inspiré de Destiny Eleven (carrière foot) et Reigns (mécanique de cartes/choix). Le joueur traverse une vie entière — naissance à mort — via des décisions rapides appelées **Tournants**, générées dynamiquement par IA. Ton dark humor / feel-good dosé automatiquement selon les choix du joueur. Web-first (PWA), responsive mobile, partage natif vers réseaux sociaux.

**Rythme** : 5 Tournants par jour, reset quotidien (mécanique type Wordle) — pas de grind possible, rendez-vous quotidien obligatoire pour progresser.

---

## 2. Ton et garde-fous de contenu (CRITIQUE — à respecter strictement dans le prompt système IA)

Le jeu couvre des thèmes adultes matures et sombres, mais avec des limites non-négociables :

**Autorisé (thèmes matures, traités avec humour noir ou gravité narrative, jamais graphique)** :
- Argent sale, corruption, criminalité (vol, arnaque, trafic — évoqué, jamais un mode d'emploi)
- Addictions (alcool, jeu, drogue — consequences narratives, jamais de détails d'usage/dosage)
- Dilemmes moraux extrêmes, trahison, deuil, échec, mort
- Sexualité adulte évoquée de façon suggérée/elliptique (mariage, rupture, infidélité) — jamais explicite
- Violence évoquée narrativement (bagarre, accident, guerre) — jamais de détails gore

**Interdit absolu, quel que soit le contexte narratif** :
- Tout contenu sexuel ou romantique impliquant un personnage mineur (0-17 ans dans la timeline du jeu), même en filigrane
- Instructions ou détails opérationnels réels (fabrication de drogue, d'armes, méthodes de suicide/automutilation, etc.)
- Contenu pornographique explicite à tout âge du personnage
- Glorification gratuite de violence extrême, haine, ou contenu discriminatoire

**Règle de conception** : la phase "Enfance" (0-12) et "Adolescence" (13-17) du jeu doivent structurellement exclure toute carte à connotation sexuelle/romantique — le pool de cartes disponible est filtré par âge du personnage, pas seulement par prompt. C'est une contrainte de génération, pas juste une consigne de ton.

---

## 3. Boucle de jeu

### Phases de vie (déterminent le pool de Tournants disponibles)
1. Petite enfance (0-5)
2. Enfance (6-12)
3. Adolescence (13-17)
4. Jeune adulte (18-25)
5. Adulte (26-45)
6. Milieu de vie (46-65)
7. Sénior (66+) → fin de partie (mort, générée aussi par IA)

### Stats cachées du personnage (influencent génération + déclenchent fins alternatives)
| Stat | Rôle |
|---|---|
| Santé | mort si 0, débloque cartes maladie/accident |
| Richesse | débloque cartes opportunité/ruine |
| Capital social | amis, réseau, réputation |
| Moralité | penche les conséquences vers rédemption ou chute |
| Tonalité (dark ↔ feel-good) | oriente le pool de cartes proposées |
| Chance | modère les issues aléatoires des choix |

### Le Tournant (unité de jeu)
- Carte plein écran : texte de situation (2-4 lignes) + 2 à 4 choix.
- Choix = tap/swipe (desktop : clic).
- Résultat immédiat affiché (1-2 lignes) + impact sur stats (discret, pas de chiffres bruts affichés au joueur — feedback narratif + icônes).
- **Graines narratives** : certains choix plantent un événement en attente (ex: "tu as menti à ton associé") qui ressurgit X Tournants plus tard sous forme de nouvelle carte contextualisée.

### Fin de partie
- Mort (naturelle ou événementielle) → carte "Bilan de vie" générée par IA : résumé façon nécrologie/CV, ton dark ou feel-good selon la Tonalité finale, une statistique absurde ou marquante mise en avant.
- Écran de partage : image auto-générée du bilan, bouton natif "partager".

---

## 4. Modèle de données — État de vie (JSON)

```json
{
  "player_id": "uuid",
  "age": 34,
  "phase": "adulte",
  "stats": {
    "sante": 72,
    "richesse": 45,
    "capital_social": 60,
    "moralite": 38,
    "tonalite": 65,
    "chance": 50
  },
  "seeds_actives": [
    {
      "id": "seed_001",
      "origine_tournant_id": "t_0182",
      "description_interne": "a menti à son associé sur les comptes",
      "delai_resurgence": 8,
      "tournants_ecoules": 3
    }
  ],
  "historique_tournants": [
    { "id": "t_0182", "age": 33, "resume": "...", "choix_fait": "...", "impact": {} }
  ],
  "flags_narratifs": ["a_ete_en_prison", "divorce"],
  "tournants_restants_aujourdhui": 3,
  "derniere_reset": "2026-07-22T00:00:00Z"
}
```

- `historique_tournants` : garder seulement les 10-15 derniers en contexte complet pour l'appel IA (le reste en résumé compressé pour limiter les tokens).
- `seeds_actives` : max 5 simultanées, priorité à la plus ancienne pour resurgir.
- `flags_narratifs` : booléens permanents qui débloquent/bloquent certains pools de cartes.

---

## 5. Système de génération IA

### Architecture d'appel
- 1 appel LLM (Claude) par Tournant généré.
- Contexte envoyé : état de vie complet (JSON ci-dessus), phase de vie actuelle, 10 derniers tournants, seeds actives à faire ressurgir en priorité si `tournants_ecoules >= delai_resurgence`.
- Sortie attendue : JSON strict (carte + choix + impacts potentiels par choix), pas de texte libre autour.
- Un second appel léger (ou règles) évalue le résultat du choix fait par le joueur et met à jour les stats + décide si une nouvelle seed doit être plantée.

### Prompt système (v1 — à affiner en test)

```
Tu es le moteur narratif du jeu LIFE. Tu génères UNE carte "Tournant" à la fois,
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
- Si une seed narrative est prête à ressurgir (tournants_ecoules >= delai_resurgence),
  elle a PRIORITÉ sur la génération d'une carte neuve.
- Chaque choix proposé doit avoir une conséquence plausible et distincte —
  éviter les choix cosmétiques sans impact.
- Longueur : situation en 2 à 4 lignes max, choix en une phrase courte chacun.

FORMAT DE SORTIE (JSON STRICT, AUCUN TEXTE HORS JSON) :
{
  "tournant_id": "string",
  "situation": "string",
  "choix": [
    { "id": "a", "texte": "string", "impact_prevu": { "sante": 0, "richesse": 0,
      "capital_social": 0, "moralite": 0, "tonalite": 0, "chance": 0 },
      "plante_seed": null ou { "description_interne": "string", "delai": 5 } }
  ]
}
```

### Second appel — résolution du choix
- Envoie : le Tournant généré + le choix sélectionné par le joueur.
- Sortie : texte de résultat narratif (1-2 lignes) + impacts finaux appliqués (peuvent différer légèrement de `impact_prevu` pour intégrer un facteur "chance").

### Modération post-génération
- Filtrage automatique (mots-clés + classifieur léger) avant affichage : bloque toute sortie qui violerait les règles de contenu ci-dessus malgré le prompt.
- En cas d'échec de génération ou de blocage : fallback sur une carte pré-écrite générique de la phase de vie en cours (banque de secours à préparer, ~20 cartes par phase).

---

## 6. Architecture technique

### Frontend
- **Stack** : React (PWA), Tailwind, mobile-first responsive (desktop = simple centrage de la carte).
- **Composants clés** :
  - `CardScreen` : carte plein écran, swipe gauche/droite ou tap sur boutons de choix.
  - `StatsBar` : barre discrète d'icônes (pas de chiffres bruts) reflétant les 6 stats.
  - `TimelineRecap` : historique scrollable des Tournants passés de la run en cours.
  - `EndOfLifeScreen` : bilan de vie généré, bouton partage (export image via canvas).
  - `DailyGate` : écran de reset/compte à rebours quand les 5 Tournants du jour sont épuisés.
- **Auth** : Google/Apple sign-in, session persistante côté client + backend.
- **Notifications** : push web (Service Worker) pour signaler le reset quotidien.

### Backend
- API stateless par requête, état de vie stocké en base (Postgres/Supabase suffisant au MVP).
- Endpoint `POST /tournant/generer` → appelle le LLM avec le prompt système + contexte, retourne la carte.
- Endpoint `POST /tournant/resoudre` → applique le choix, met à jour l'état, retourne le résultat narratif.
- Endpoint `POST /vie/bilan` → génère le bilan de fin de vie.
- Cache : mémoriser les cartes génériques de petite enfance peu différenciées entre joueurs pour réduire les appels IA (peuvent être servies depuis un pool pré-généré et légèrement randomisé plutôt que recalculées à chaque fois).

### Partage
- Génération d'image (canvas ou service côté serveur) au format story (9:16) et post (1:1) pour le bilan de vie.
- Bouton de partage natif (Web Share API) + fallback copier-lien.

---

## 7. Monétisation (MVP)
- Gratuit avec reset quotidien à 5 Tournants.
- Option payante : débloquer des Tournants supplémentaires le jour même (pas de pay-to-win sur les stats, juste sur la vitesse).
- Cosmétiques : thèmes visuels de carte, filtres de bilan de vie.

---

## 8. Roadmap MVP suggérée
1. Modèle de données + moteur de stats (sans IA, cartes statiques de test).
2. Intégration appel LLM + prompt système + modération de base.
3. Frontend carte + boucle de jeu complète sur une seule phase de vie (test sur "Adulte" par ex., contenu le plus riche).
4. Système de seeds narratives.
5. Écran de bilan + partage.
6. Extension à toutes les phases de vie + filtrage d'âge strict.
7. Auth, reset quotidien, notifications.
