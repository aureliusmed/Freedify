# LIFE — simulateur de vie par choix textuels

Jeu web (PWA) où le joueur traverse une vie entière — naissance à mort — via des
décisions rapides appelées **Tournants**, générées dynamiquement par Claude.
5 Tournants par jour, reset quotidien type Wordle. Brief complet : [`docs/BRIEF.md`](docs/BRIEF.md).

> Projet auto-contenu dans `life/` — prévu pour être extrait vers son propre
> dépôt quand il sortira du prototype.

## Structure

| Paquet | Rôle |
|---|---|
| `shared/` | Modèle de données (état de vie, stats, phases, schémas zod des cartes) |
| `server/` | API Fastify : moteur de jeu (stats, seeds, reset quotidien, mort), génération IA (Claude, sorties structurées), modération, banque de secours |
| `web/` | Front React + Vite + Tailwind, mobile-first, PWA, partage du bilan en image |

## Démarrage rapide

```bash
cd life
npm install

# Terminal 1 — API (port 3001)
export ANTHROPIC_API_KEY=sk-ant-...   # optionnel : sans clé, mode banque de secours
npm run dev:server

# Terminal 2 — front (port 5173, proxy /api → 3001)
npm run dev:web
```

Sans `ANTHROPIC_API_KEY`, le jeu est entièrement jouable avec les cartes
pré-écrites de la banque de secours (utile en dev et comme filet de sécurité
en prod).

## Variables d'environnement (serveur)

| Variable | Défaut | Rôle |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Active la génération IA |
| `LIFE_MODEL` | `claude-opus-4-8` | Modèle de génération des cartes et bilans |
| `LIFE_MODEL_RESOLUTION` | = `LIFE_MODEL` | Modèle du second appel (narration du résultat) |
| `LIFE_DATA_DIR` | `server/data` | Dossier de persistance JSON (store fichier) |
| `SUPABASE_URL` | — | Active le store Supabase (avec la clé ci-dessous) et l'auth (avec l'anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | — | Service role key Supabase — **serveur uniquement**, jamais exposée au front |
| `SUPABASE_ANON_KEY` | — | Anon key — active la vérification des JWT côté serveur (auth Google) |
| `PORT` | `3001` | Port de l'API |

Côté **front** (build Vite), l'auth s'active via un fichier `.env.local` (jamais
commité) :

```
VITE_SUPABASE_URL=https://<projet>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon key>
```

Sans ces variables, le bouton « Se connecter » n'apparaît pas et le jeu reste
100 % anonyme (id localStorage). Provider Google à activer dans la console
Supabase (action manuelle, hors code).

### Stockage

Par défaut, l'état est persisté en fichiers JSON (`LIFE_DATA_DIR`). Si
`SUPABASE_URL` **et** `SUPABASE_SERVICE_ROLE_KEY` sont définis, le serveur
bascule sur Postgres via Supabase (même interface `Store`, ADR-006). Exécuter
d'abord le schéma :

```bash
psql "$DATABASE_URL" -f server/sql/schema.sql
# ou coller le contenu dans l'éditeur SQL de la console Supabase
```

## Commandes

```bash
npm run test        # tests du moteur (vitest) : phases, stats, seeds, reset, modération
npm run typecheck   # TypeScript strict sur les 3 paquets
npm run build       # typecheck + build du front
```

## API

| Endpoint | Rôle |
|---|---|
| `POST /api/vie/nouvelle` | Nouvelle vie (ou réincarnation) |
| `GET /api/vie/:playerId` | État courant (applique le reset quotidien) |
| `POST /api/tournant/generer` | Génère la prochaine carte (429 `QUOTA` si les 5 du jour sont épuisés) |
| `POST /api/tournant/resoudre` | Applique le choix : impacts (modulés par la chance), seeds, âge, mort |
| `POST /api/vie/bilan` | Bilan de fin de vie (nécrologie générée) |
| `GET /api/sante` | Healthcheck + disponibilité IA |

## Garde-fous de contenu

Trois couches, conformes au brief §2 :

1. **Prompt système** : règles de ton et de contenu non négociables.
2. **Contrainte structurelle** : l'âge du personnage est injecté dans le contexte
   et le filtre post-génération rejette toute connotation romantique/sexuelle
   tant que le personnage a moins de 18 ans (`server/src/engine/moderation.ts`).
3. **Banque de secours** : toute carte rejetée ou toute erreur IA est remplacée
   par une carte pré-écrite de la phase courante.

## État vs roadmap (brief §8)

- [x] 1. Modèle de données + moteur de stats (cartes statiques de test)
- [x] 2. Appel LLM + prompt système + modération de base
- [x] 3. Boucle de jeu complète (toutes phases)
- [x] 4. Seeds narratives (plantage, vieillissement, résurgence prioritaire)
- [x] 5. Écran de bilan + partage (canvas 9:16, Web Share API)
- [x] 6. Filtrage d'âge strict par phase
- [x] Banque de secours : ~20 cartes par phase (19-20 cartes, ≥ 6 seeds chacune)
- [x] Stockage Postgres/Supabase (via `SUPABASE_URL` + service role key ; fichier par défaut)
- [x] 7a. Auth Google (Supabase Auth, optionnelle, par-dessus l'anonyme ; Apple reporté)
- [ ] 7b. Notifications push du reset quotidien
- [ ] Monétisation (tournants bonus, cosmétiques)

Décisions d'implémentation notables : [`docs/DECISIONS.md`](docs/DECISIONS.md).
