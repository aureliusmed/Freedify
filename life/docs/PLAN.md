# PLAN D'EXÉCUTION — LIFE, suite du MVP

> Ce document est un plan d'implémentation **prescriptif**, destiné à être
> exécuté lot par lot par un agent de développement. Suis-le dans l'ordre.
> Ne saute pas les critères d'acceptation. En cas de doute sur une décision
> produit non couverte ici, choisis l'option la plus simple et note-la dans
> `docs/DECISIONS.md` (format ADR court, voir les exemples existants).

---

## 0. Prise en main (OBLIGATOIRE avant tout lot)

### 0.1 Lire dans cet ordre

1. `docs/BRIEF.md` — la vision produit et les garde-fous de contenu (§2 est critique).
2. `README.md` — architecture, commandes, état de la roadmap.
3. `docs/DECISIONS.md` — les décisions déjà prises. **Ne les remets pas en cause.**
4. `shared/src/index.ts` — le modèle de données. Tout part de là.
5. `server/src/engine/*.ts` puis `server/src/ia/*.ts` puis `server/src/routes.ts`.
6. `web/src/App.tsx` puis les composants.

### 0.2 Vérifier que tout est vert AVANT de commencer

```bash
cd life
npm install
npm run typecheck   # doit passer sur les 3 paquets
npm test            # 16 tests moteur doivent passer
npm run build       # build du front doit passer
```

Si l'un des trois échoue avant toute modification, STOP : corrige d'abord ou signale.

### 0.3 Règles invariantes (NE JAMAIS Y DÉROGER)

| # | Règle | Pourquoi |
|---|---|---|
| R1 | **Ne jamais affaiblir la modération** (`server/src/engine/moderation.ts`) : on peut AJOUTER des motifs interdits, jamais en retirer, jamais élargir ce qui est permis aux mineurs. | Brief §2, non négociable. |
| R2 | **Les impacts sur les stats sont calculés par le moteur, jamais par le LLM.** Ne déplace aucun calcul de stats vers l'IA. | ADR-001, anti-triche. |
| R3 | **Toute sortie IA passe par la modération avant d'atteindre le joueur**, et tout échec IA bascule sur un fallback pré-écrit. | ADR-003. |
| R4 | Le jeu doit **rester entièrement jouable sans `ANTHROPIC_API_KEY`** (mode banque de secours). Teste chaque lot dans ce mode. | Filet de sécurité + dev. |
| R5 | TypeScript strict, pas de `any`, pas de `@ts-ignore`. `npm run typecheck && npm test` doivent passer **avant chaque commit**. | Qualité. |
| R6 | Commits : conventional commits en anglais (`feat(life): ...`, `fix(life): ...`), un commit par lot. Branche : celle en cours, jamais `main`. | Convention du dépôt. |
| R7 | Ne touche à **rien en dehors du dossier `life/`**. | Le reste du dépôt est une autre application. |
| R8 | Interface web et contenu de jeu : **français**. Code, identifiants et commits : conventions existantes (code français côté domaine — garde la cohérence avec l'existant). | Cohérence. |
| R9 | Modèle IA par défaut : `claude-opus-4-8` via variables d'env existantes (`LIFE_MODEL`, `LIFE_MODEL_RESOLUTION`). N'introduis pas d'autre modèle en dur. | Config existante. |

### 0.4 Définition de « lot terminé »

Un lot est terminé quand : (a) tous ses critères d'acceptation sont vérifiés,
(b) `npm run typecheck && npm test && npm run build` passent, (c) le test de
fumée manuel du §0.5 passe, (d) le README et/ou `docs/DECISIONS.md` sont mis à
jour si le lot l'exige, (e) un commit dédié est créé.

### 0.5 Test de fumée manuel (à refaire après chaque lot)

```bash
# Terminal 1
cd life && npm run dev:server
# Terminal 2
curl -s localhost:3001/api/sante
PID=$(curl -s -X POST localhost:3001/api/vie/nouvelle -H 'Content-Type: application/json' -d '{}' | node -e "let d='';process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).etat.player_id))")
curl -s -X POST localhost:3001/api/tournant/generer -H 'Content-Type: application/json' -d "{\"player_id\":\"$PID\"}"
# puis résoudre avec le tournant_id retourné et choix_id "a"
```

Attendu : carte retournée, résolution avec `resultat`, `impacts_finaux`, état mis à jour.

---

## LOT 1 — Étoffer la banque de secours (~20 cartes par phase)

**Objectif.** Passer de 3 à 18–22 cartes par phase dans
`server/src/engine/fallback.ts` (brief §5 : « banque de secours à préparer,
~20 cartes par phase »).

**Fichiers.** `server/src/engine/fallback.ts` uniquement (+ test existant qui
valide automatiquement le contenu).

**Étapes.**
1. Pour chaque phase (`petite_enfance`, `enfance`, `adolescence`,
   `jeune_adulte`, `adulte`, `milieu_de_vie`, `senior`), écris 15 à 19
   nouvelles cartes dans le même format que les cartes existantes
   (`CarteBanque` : `situation` + 2 à 4 `choix`).
2. Contraintes d'écriture par carte :
   - `situation` : 1 à 3 phrases, ton du jeu (humour noir léger OU feel-good,
     varie les deux), tutoiement, français.
   - 2 à 4 choix, chacun avec un `impact_prevu` **distinct** (pas de choix
     cosmétiques — brief §5). Impacts entre -8 et +8 en général, jamais hors
     [-25, +25].
   - Environ 1 carte sur 3 doit planter une seed (`plante_seed` avec
     `description_interne` concrète et `delai` entre 2 et 8).
   - Varie les stats touchées : chaque phase doit avoir des cartes touchant
     chacune des 6 stats au moins une fois.
   - **Phases 0–17 ans : AUCUNE connotation romantique/sexuelle** (le test
     `banque de secours` le vérifie automatiquement via la modération — il
     doit rester vert). Thèmes autorisés : école, amitiés, famille, sport,
     loisirs, petite délinquance légère, premiers choix moraux.
3. Fais tourner `npm test` : le test « contient des cartes pour chaque phase,
   toutes conformes à la modération » valide chaque carte. Si une carte est
   rejetée, réécris la carte (ne modifie PAS la modération — règle R1).
4. Mets à jour le test pour exiger désormais `>= 18` cartes par phase
   (remplace `toBeGreaterThanOrEqual(2)`).
5. Mets à jour la ligne correspondante du README (section « État vs roadmap »).

**Critères d'acceptation.**
- [ ] Chaque phase a ≥ 18 cartes.
- [ ] `npm test` vert avec le seuil relevé à 18.
- [ ] Au moins 5 cartes par phase plantent une seed.
- [ ] Aucune carte ne mentionne de marque réelle ni de personne réelle.

**Commit.** `feat(life): expand fallback card bank to ~20 cards per phase`

---

## LOT 2 — Flags narratifs (mécanique actuellement inerte)

**Objectif.** `flags_narratifs` existe dans le modèle mais n'est jamais
alimenté. Le rendre vivant : des flags permanents dérivés d'événements de la
vie, injectés dans le contexte IA (déjà fait dans `prompts.ts`) pour colorer
la génération.

**Fichiers.** `server/src/engine/resolution.ts`, `shared/src/index.ts`
(constantes), test nouveau `server/src/engine/__tests__/flags.test.ts`.

**Étapes.**
1. Dans `shared/src/index.ts`, ajoute la liste des flags dérivables :
   ```ts
   export const FLAGS_DERIVES = [
     "ruine",            // richesse tombée à 0
     "fortune",          // richesse montée à 100
     "moralite_noire",   // moralité tombée sous 10
     "saint",            // moralité montée au-dessus de 90
     "solitaire",        // capital_social tombé sous 10
     "pilier_social",    // capital_social monté au-dessus de 90
     "miracule",         // santé remontée au-dessus de 30 après être passée sous 10
     "survivant",        // a dépassé 85 ans
   ] as const;
   ```
2. Dans `resolution.ts`, crée une fonction pure exportée
   `deriverFlags(avant: Stats, apres: Stats, age: number, flagsExistants: string[]): string[]`
   qui retourne les **nouveaux** flags à ajouter (jamais de doublon, un flag
   acquis ne se retire jamais).
3. Appelle-la dans `resoudreChoix` (tu as `etat.stats` avant/après
   l'application des impacts — capture `avant` avant `appliquerImpact`) et
   pousse les nouveaux flags dans `etat.flags_narratifs`.
4. Cas `miracule` : nécessite de savoir que la santé est passée sous 10 à un
   moment. Ajoute le flag intermédiaire `a_frole_la_mort` (posé quand
   `apres.sante < 10`) et pose `miracule` quand `a_frole_la_mort` est présent
   et `apres.sante > 30`.
5. Tests (`flags.test.ts`) : au minimum — `ruine` posé quand richesse atteint 0 ;
   pas de doublon si l'événement se reproduit ; `miracule` exige le passage
   préalable sous 10 ; `survivant` posé à 86 ans.

**Critères d'acceptation.**
- [ ] Les flags apparaissent dans l'état renvoyé par `/api/tournant/resoudre`.
- [ ] Nouveaux tests verts, anciens tests inchangés et verts.
- [ ] ADR court ajouté dans `docs/DECISIONS.md` (« flags dérivés par seuils, permanents »).

**Commit.** `feat(life): derive permanent narrative flags from stat thresholds`

---

## LOT 3 — UX carte : swipe + transitions

**Objectif.** Brief §3 : « Choix = tap/swipe ». Quand une carte a exactement
2 choix, permettre swipe gauche (choix 1) / droite (choix 2) sur mobile, avec
retour visuel. Tap reste toujours disponible.

**Fichiers.** `web/src/components/CardScreen.tsx` uniquement. **N'ajoute pas
de dépendance** (pas de framer-motion) : utilise les événements Pointer
(`onPointerDown/Move/Up`) et des transforms CSS.

**Étapes.**
1. Dans `CardScreen`, ajoute un état `drag` (`{dx: number} | null`). Sur
   `pointerdown` sur la zone carte (uniquement si `tournant.choix.length === 2`
   et pas de `resultat` affiché), commence le suivi ; sur `pointermove`,
   mets à jour `dx` et applique `transform: translateX(dx) rotate(dx/30deg)`
   à la carte ; sur `pointerup` : si `|dx| > 90px`, déclenche le choix
   correspondant (gauche → `choix[0]`, droite → `choix[1]`), sinon retour
   élastique (`transition`).
2. Pendant le drag, affiche en surimpression le texte du choix vers lequel on
   penche (opacité proportionnelle à `|dx|/90`, plafonnée à 1) : bandeau
   gauche pour `choix[0]`, droit pour `choix[1]`.
3. Ajoute sous la carte, pour les cartes à 2 choix, l'indication discrète
   « ← ou → pour choisir » (classe `text-xs text-zinc-600`).
4. Vérifie que le tap sur les boutons fonctionne toujours (les boutons doivent
   `stopPropagation` sur `pointerdown` pour ne pas déclencher le drag).
5. `touch-action: pan-y` sur la zone carte pour ne pas bloquer le scroll vertical.

**Critères d'acceptation.**
- [ ] Sur une carte à 2 choix : swipe > 90px déclenche le bon choix ; < 90px revient en place.
- [ ] Cartes à 3-4 choix : aucun comportement de swipe, tap uniquement.
- [ ] Aucun swipe possible quand le résultat est affiché.
- [ ] `npm run typecheck && npm run build` verts. Aucune nouvelle dépendance dans `web/package.json`.

**Commit.** `feat(life): swipe gestures on two-choice cards`

---

## LOT 4 — Pool de cartes petite enfance pré-générées (cache, brief §6)

**Objectif.** Réduire les appels IA : les cartes de petite enfance sont peu
différenciées entre joueurs. Servir un pool partagé pré-généré, complété par
l'IA en tâche de fond.

**Fichiers.** Nouveau `server/src/engine/pool.ts`, modifs légères dans
`server/src/routes.ts` (ou `generateur.ts`), test nouveau
`server/src/engine/__tests__/pool.test.ts`.

**Étapes.**
1. Crée `pool.ts` avec une classe `PoolPhase` en mémoire :
   - `prendre(dejaVues: string[]): Tournant | null` — retourne une carte non
     vue (comparaison sur `situation`), la retire du pool.
   - `remplir(t: Tournant): void` — ajoute une carte (plafond 30).
   - `taille(): number`.
2. Politique dans la route `generer` (uniquement quand
   `etat.phase === "petite_enfance"` **et** qu'aucune seed n'est prête) :
   a. si le pool a une carte non vue → la servir (source `"ia"` conservée si
      c'en était une) ;
   b. sinon → comportement actuel (génération IA ou fallback).
3. Réapprovisionnement : après avoir servi depuis le pool, si
   `taille() < 10` et que l'IA est disponible, lance en arrière-plan
   (`void (async () => ...)().catch(...)`) UNE génération IA pour remplir le
   pool (avec modération, comme toute carte — règle R3). Ne bloque jamais la
   réponse HTTP.
4. Les cartes servies depuis le pool doivent recevoir un `tournant_id` neuf
   (`t_pool_<8 hex>`) au moment où elles sont servies, pour rester uniques
   par joueur.
5. Tests : `prendre` évite les cartes vues ; plafond à 30 respecté ; une carte
   servie est retirée du pool.

**Critères d'acceptation.**
- [ ] En mode sans clé API : comportement inchangé (fallback direct, pool jamais bloquant).
- [ ] Une seed prête à ressurgir ne passe JAMAIS par le pool (elle exige une carte contextualisée).
- [ ] Tests verts.
- [ ] ADR court dans `docs/DECISIONS.md`.

**Commit.** `feat(life): shared pre-generated card pool for early childhood`

---

## LOT 5 — Partage : format 1:1 + fallback copier-lien

**Objectif.** Brief §6 : image story (9:16, déjà fait) **et** post (1:1),
plus fallback copier-lien quand le partage natif n'est pas disponible.

**Fichiers.** `web/src/components/EndOfLifeScreen.tsx`.

**Étapes.**
1. Factorise `rendreImageBilan(bilan, format: "story" | "post")` :
   story = 1080×1920 (existant), post = 1080×1080 (mêmes blocs, tailles de
   police réduites d'environ 20 %, marges adaptées).
2. UI : deux boutons de partage — « Partager (story 9:16) » et
   « Partager (post 1:1) » — même logique `navigator.share` / téléchargement.
3. Ajoute un troisième bouton « Copier le texte » : copie dans le presse-papier
   (`navigator.clipboard.writeText`) le bilan au format texte :
   `"{titre}" — {texte} ({stat_marquante}) · joue ta vie sur LIFE`.
   Affiche « Copié ! » pendant 2 s après succès.
4. Vérifie le rendu des deux formats en local (téléchargement du PNG) : le
   texte ne doit jamais déborder du canvas (la fonction `dessinerParagraphe`
   gère le retour à la ligne ; en 1:1, si le texte du bilan dépasse ~8 lignes,
   tronque avec « … »).

**Critères d'acceptation.**
- [ ] Les deux PNG se génèrent sans texte coupé sur un bilan long (teste avec un `texte` de 500 caractères).
- [ ] Copier-lien fonctionne et affiche la confirmation.
- [ ] `typecheck` + `build` verts.

**Commit.** `feat(life): 1:1 share format and copy-to-clipboard fallback`

---

## LOT 6 — Stockage Supabase/Postgres derrière l'interface `Store`

**Objectif.** Remplacer (en option de config) le stockage fichier par
Postgres via Supabase, sans toucher aux routes (ADR-006 : seule
l'implémentation de `Store` change).

**Fichiers.** Nouveau `server/src/store-supabase.ts`, modifs dans
`server/src/index.ts` (sélection du store), `README.md`,
nouveau `server/sql/schema.sql`.

**Étapes.**
1. Ajoute la dépendance `@supabase/supabase-js` (dépendance standard, OK).
2. `server/sql/schema.sql` :
   ```sql
   create table if not exists vies (
     player_id text primary key,
     etat jsonb not null,
     updated_at timestamptz not null default now()
   );
   ```
   (L'état complet reste un document JSON — même modèle que le fichier. Pas de
   normalisation en colonnes à ce stade.)
3. `store-supabase.ts` : classe `SupabaseStore implements Store` —
   `get` = `select etat from vies where player_id = ...` ;
   `put` = `upsert { player_id, etat, updated_at: new Date().toISOString() }`.
   Utilise la **service role key** côté serveur uniquement (jamais côté web).
4. Sélection dans `index.ts` : si `SUPABASE_URL` **et**
   `SUPABASE_SERVICE_ROLE_KEY` sont définis → `SupabaseStore`, sinon
   `FichierStore` (comportement actuel inchangé). Log au démarrage du store choisi.
5. **Aucun secret en dur nulle part** : uniquement variables d'environnement.
6. Documente dans le README (tableau des variables d'env + le SQL à exécuter).
7. Tests : ne teste pas Supabase en réseau. Ajoute un test d'interface qui
   fait tourner la même suite (get inexistant → null ; put puis get → égalité)
   sur `FichierStore` avec un dossier temporaire (`fs.mkdtemp`).

**Critères d'acceptation.**
- [ ] Sans variables Supabase : rien ne change, tout vert.
- [ ] Avec variables factices : le serveur démarre et logge `SupabaseStore` (les erreurs réseau remontent proprement en 500, pas de crash process).
- [ ] Test d'interface `Store` vert.

**Commit.** `feat(life): optional Supabase-backed store behind Store interface`

---

## LOT 7 — Auth Google (Supabase Auth) + rattachement de la vie au compte

**Objectif.** Brief §6 : « Auth : Google/Apple sign-in, session persistante
côté client + backend ». MVP : Google uniquement (Apple exige un compte
développeur Apple — reporter). L'id anonyme localStorage reste le mode par
défaut ; l'auth est **optionnelle** et vient par-dessus.

**Pré-requis.** LOT 6 livré. Un projet Supabase avec Google provider activé
(configuration console faite par un humain — demander les valeurs
`SUPABASE_URL` / `SUPABASE_ANON_KEY` si absentes, ne pas les inventer).

**Fichiers.** `web/src/auth.ts` (nouveau), `web/src/App.tsx` (bouton connexion),
`server/src/auth.ts` (nouveau, vérification JWT), `server/src/routes.ts`
(middleware optionnel), README.

**Étapes.**
1. Côté web : `@supabase/supabase-js` avec `SUPABASE_URL`/`SUPABASE_ANON_KEY`
   exposés via `import.meta.env.VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`
   (fichier `.env.local`, jamais commité). `signInWithOAuth({ provider: "google" })`.
2. Quand l'utilisateur est connecté, envoie le JWT dans l'en-tête
   `Authorization: Bearer <token>` de chaque appel API (modifie `requete()`
   dans `web/src/api.ts`).
3. Côté serveur : middleware qui, si un Bearer token est présent, le vérifie
   (endpoint JWKS de Supabase ou `supabase.auth.getUser(token)`) et remplace
   le `player_id` du corps par `user.id`. Sans token : comportement anonyme
   actuel inchangé.
4. Route de migration `POST /api/vie/adopter` : authentifié + `player_id`
   anonyme dans le corps → copie la vie anonyme vers l'id du compte si le
   compte n'a pas encore de vie. Le front la déclenche une fois après la
   première connexion, puis remplace l'id local.
5. Si `SUPABASE_*` absents côté web : le bouton « Se connecter » n'apparaît
   pas (le jeu reste 100 % anonyme).

**Critères d'acceptation.**
- [ ] Sans configuration Supabase : aucun changement de comportement, tout vert.
- [ ] Avec configuration : connexion Google fonctionne, la vie anonyme est adoptée une seule fois, les appels API authentifiés jouent bien sur la vie du compte.
- [ ] Un token invalide → 401, jamais de fallback silencieux vers l'id du corps.
- [ ] ADR dans `docs/DECISIONS.md` (auth optionnelle par-dessus l'anonyme, Apple reporté).

**Commit.** `feat(life): optional Google sign-in via Supabase Auth with life adoption`

---

## LOT 8 — Notifications push du reset quotidien

**Objectif.** Brief §6 : push web via Service Worker pour signaler le reset.

**Pré-requis.** LOT 6 (stockage des abonnements). Génère des clés VAPID
(`npx web-push generate-vapid-keys`) et mets-les en variables d'env
(`VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT=mailto:...`).

**Fichiers.** `server/src/push.ts` (nouveau), route
`POST /api/push/abonner`, tâche planifiée dans `server/src/index.ts`,
`web/public/sw.js` (handler `push`), `web/src/push.ts` (nouveau),
bouton d'activation dans `App.tsx` (dans l'écran `DailyGate` — c'est là que la
demande a du sens), README.

**Étapes.**
1. Dépendance serveur : `web-push` (standard).
2. Table (ou fichier si store fichier) `push_subscriptions`
   `{ player_id, subscription jsonb, created_at }`.
3. Front : dans `DailyGate`, bouton « Me prévenir au reset 🌅 » →
   `Notification.requestPermission()` puis
   `registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey })`
   → POST vers `/api/push/abonner`.
4. `sw.js` : handler `push` → `showNotification("LIFE", { body: "Tes 5 Tournants du jour t'attendent." })`
   + handler `notificationclick` → focus/ouvre `/`.
5. Serveur : au démarrage, `setInterval` d'une minute qui, au passage de
   minuit UTC, envoie la notification à tous les abonnés
   (itère, `webpush.sendNotification`, supprime les abonnements qui renvoient
   410/404). C'est suffisant pour un MVP mono-instance ; note l'ADR
   (un vrai scheduler viendra avec l'infra).
6. Si les clés VAPID sont absentes : la route répond 503 et le bouton front
   est masqué (feature flag via `GET /api/sante` → champ `push: boolean`).

**Critères d'acceptation.**
- [ ] Sans clés VAPID : rien ne change, `api/sante` renvoie `push: false`.
- [ ] Avec clés : abonnement stocké ; notification reçue au reset (testable en abaissant temporairement l'intervalle en local — ne pas commiter ce réglage).
- [ ] Abonnements morts purgés sur 410.

**Commit.** `feat(life): web push notification at daily reset`

---

## LOT 9 (OPTIONNEL — ne pas commencer sans validation humaine) — Monétisation

Le brief §7 la décrit (tournants supplémentaires payants, cosmétiques), mais
elle implique Stripe, des webhooks et des choix de pricing : **demander
validation avant d'implémenter**. Préparer seulement, si demandé :
- champ `tournants_bonus` dans l'état (consommés après le quota du jour) ;
- endpoint `POST /api/boutique/tournants` derrière un feature flag.

---

## Ordre, dépendances et estimation

| Lot | Dépend de | Taille | Risque |
|---|---|---|---|
| 1. Banque de cartes | — | M (contenu) | Faible |
| 2. Flags narratifs | — | S | Faible |
| 3. Swipe | — | S | Faible |
| 4. Pool petite enfance | — | M | Moyen (concurrence) |
| 5. Partage 1:1 | — | S | Faible |
| 6. Supabase Store | — | M | Moyen (config externe) |
| 7. Auth Google | 6 | L | Élevé (config externe, sécurité) |
| 8. Push | 6 | M | Moyen |
| 9. Monétisation | 6, 7 | L | Élevé — validation humaine requise |

Les lots 1 à 5 sont indépendants entre eux et sans configuration externe :
**les faire d'abord, dans l'ordre 1 → 2 → 3 → 5 → 4** (le 4 en dernier car
c'est le plus délicat). Les lots 6 → 7 → 8 ensuite, en s'arrêtant pour
demander les identifiants Supabase/VAPID quand nécessaire (ne jamais inventer
de clés ni les commiter).

---

## Checklist de fin de session (à chaque fois)

1. `npm run typecheck && npm test && npm run build` — tout vert.
2. Test de fumée §0.5 en mode sans clé API.
3. README à jour (roadmap cochée), ADR ajoutés si décision prise.
4. Un commit par lot, poussé sur la branche de travail (`git push -u origin <branche>`).
5. Ne pas ouvrir de pull request sans demande explicite.
