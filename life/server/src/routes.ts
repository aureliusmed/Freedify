import type { FastifyInstance } from "fastify";
import { type EtatDeVie, TOURNANTS_BONUS_PAR_ACHAT, tournantsJouables } from "@life/shared";
import { z } from "zod";

/** Feature flag de la boutique (monétisation §7). Sans ce flag, l'endpoint
 *  d'achat répond 503 et le bouton front est masqué. Le vrai paiement Stripe
 *  n'est PAS câblé (voir ADR-013) : quand le flag est actif, l'achat est simulé
 *  comme abouti — à remplacer par un flux Stripe + webhook avant la prod. */
export const boutiqueActive = process.env.LIFE_BOUTIQUE_ACTIVE === "1";
import { appliquerResetQuotidien, nouvelleVie } from "./engine/etat.js";
import {
  consommerSeed,
  enregistrerHistorique,
  resoudreChoix,
  seedPrete,
} from "./engine/resolution.js";
import { genererBilan, genererTournant, narrerResolution } from "./ia/generateur.js";
import { iaDisponible } from "./ia/client.js";
import { PoolPhase } from "./engine/pool.js";
import { validerPlayerId, type Store } from "./store.js";

// Pool partagé entre joueurs pour la petite enfance (brief §6). En mémoire :
// perdu au redémarrage, ce qui est acceptable — il se reconstitue en tâche de fond.
const POOL_SEUIL_REMPLISSAGE = 10;
const poolPetiteEnfance = new PoolPhase();

/** Réapprovisionne le pool en tâche de fond (jamais bloquant pour la réponse
 *  HTTP). Génère UNE carte IA de petite enfance, modérée comme toute carte. */
function reapprovisionnerPool(etat: EtatDeVie): void {
  if (!iaDisponible() || poolPetiteEnfance.taille() >= POOL_SEUIL_REMPLISSAGE) return;
  void (async () => {
    try {
      const carte = await genererTournant(etat, null);
      if (carte.source === "ia") poolPetiteEnfance.remplir(carte);
    } catch {
      /* échec silencieux : le pool reste tel quel, le fallback prend le relais */
    }
  })();
}

const CorpsJoueur = z.object({ player_id: z.string().min(1).max(64) });
const CorpsResolution = CorpsJoueur.extend({
  tournant_id: z.string().min(1),
  choix_id: z.string().min(1),
});

export function enregistrerRoutes(app: FastifyInstance, store: Store): void {
  // Nouvelle vie (ou réincarnation après une mort)
  app.post("/api/vie/nouvelle", async (req, reply) => {
    const corps = z.object({ player_id: z.string().min(1).max(64).optional() }).safeParse(req.body ?? {});
    if (!corps.success) return reply.code(400).send({ erreur: "corps invalide" });
    if (corps.data.player_id && !validerPlayerId(corps.data.player_id)) {
      return reply.code(400).send({ erreur: "player_id invalide" });
    }
    const etat = nouvelleVie(corps.data.player_id);
    await store.put(etat);
    return { etat };
  });

  // État courant
  app.get<{ Params: { playerId: string } }>("/api/vie/:playerId", async (req, reply) => {
    const etat = await store.get(req.params.playerId);
    if (!etat) return reply.code(404).send({ erreur: "joueur inconnu" });
    appliquerResetQuotidien(etat);
    await store.put(etat);
    return { etat };
  });

  // Génération d'un Tournant
  app.post("/api/tournant/generer", async (req, reply) => {
    const corps = CorpsJoueur.safeParse(req.body);
    if (!corps.success) return reply.code(400).send({ erreur: "corps invalide" });
    const etat = await store.get(corps.data.player_id);
    if (!etat) return reply.code(404).send({ erreur: "joueur inconnu" });

    appliquerResetQuotidien(etat);
    if (!etat.vivant) return reply.code(409).send({ erreur: "personnage décédé", code: "MORT" });
    if (tournantsJouables(etat) <= 0) {
      return reply.code(429).send({ erreur: "plus de tournants aujourd'hui", code: "QUOTA" });
    }

    // Idempotence : si une carte est déjà en attente de résolution, la renvoyer.
    if (etat.tournant_en_cours) {
      return { tournant: etat.tournant_en_cours, restants: etat.tournants_restants_aujourdhui };
    }

    const seed = seedPrete(etat);
    let tournant;

    // Petite enfance sans seed prête : tenter le pool mutualisé d'abord. Une
    // seed prête exige une carte contextualisée et ne passe JAMAIS par le pool.
    if (etat.phase === "petite_enfance" && !seed) {
      const dejaVues = etat.historique_tournants.map((h) => h.resume);
      const duPool = poolPetiteEnfance.prendre(dejaVues);
      tournant = duPool ?? (await genererTournant(etat, null));
      reapprovisionnerPool(etat); // tâche de fond, non bloquante
    } else {
      tournant = await genererTournant(etat, seed);
      if (seed && tournant.source === "ia") consommerSeed(etat, seed.id);
    }

    etat.tournant_en_cours = tournant;
    await store.put(etat);
    return { tournant, restants: etat.tournants_restants_aujourdhui };
  });

  // Résolution du choix
  app.post("/api/tournant/resoudre", async (req, reply) => {
    const corps = CorpsResolution.safeParse(req.body);
    if (!corps.success) return reply.code(400).send({ erreur: "corps invalide" });
    const etat = await store.get(corps.data.player_id);
    if (!etat) return reply.code(404).send({ erreur: "joueur inconnu" });

    const tournant = etat.tournant_en_cours;
    if (!tournant || tournant.tournant_id !== corps.data.tournant_id) {
      return reply.code(409).send({ erreur: "aucun tournant en attente pour cet id" });
    }
    const choix = tournant.choix.find((c) => c.id === corps.data.choix_id);
    if (!choix) return reply.code(400).send({ erreur: "choix inconnu" });

    const resolution = resoudreChoix(etat, tournant, choix);
    const resultat = await narrerResolution(etat, tournant, choix, resolution.issue);
    enregistrerHistorique(etat, tournant, choix, resultat, resolution.impacts);
    await store.put(etat);

    return {
      resultat,
      impacts_finaux: resolution.impacts,
      issue: resolution.issue,
      mort: resolution.mort,
      etat,
    };
  });

  // Bilan de fin de vie
  app.post("/api/vie/bilan", async (req, reply) => {
    const corps = CorpsJoueur.safeParse(req.body);
    if (!corps.success) return reply.code(400).send({ erreur: "corps invalide" });
    const etat = await store.get(corps.data.player_id);
    if (!etat) return reply.code(404).send({ erreur: "joueur inconnu" });
    if (etat.vivant) return reply.code(409).send({ erreur: "le personnage est encore en vie" });

    const bilan = await genererBilan(etat);
    return { bilan };
  });

  // Adoption d'une vie anonyme par un compte authentifié (brief §6). Le hook
  // d'auth a déjà remplacé le player_id du corps par l'id du compte ; l'id
  // anonyme à migrer est fourni séparément dans `player_id_anonyme`.
  app.post("/api/vie/adopter", async (req, reply) => {
    if (!req.authUserId) return reply.code(401).send({ erreur: "authentification requise" });
    const corps = z
      .object({ player_id_anonyme: z.string().min(1).max(64) })
      .safeParse(req.body);
    if (!corps.success || !validerPlayerId(corps.data.player_id_anonyme)) {
      return reply.code(400).send({ erreur: "player_id_anonyme invalide" });
    }

    // Ne rien écraser : si le compte a déjà une vie, on la renvoie telle quelle.
    const existante = await store.get(req.authUserId);
    if (existante) return { etat: existante, adopte: false };

    const anonyme = await store.get(corps.data.player_id_anonyme);
    if (!anonyme) return reply.code(404).send({ erreur: "vie anonyme introuvable" });

    const adoptee = { ...anonyme, player_id: req.authUserId };
    await store.put(adoptee);
    return { etat: adoptee, adopte: true };
  });

  // Boutique : débloque des Tournants supplémentaires le jour même (§7 — joue
  // sur la vitesse, jamais sur les stats). Gated par LIFE_BOUTIQUE_ACTIVE.
  // STUB : achat simulé comme abouti — le flux de paiement Stripe (+ webhook de
  // confirmation) reste à câbler avant toute mise en production (ADR-013).
  app.post("/api/boutique/tournants", async (req, reply) => {
    if (!boutiqueActive) {
      return reply.code(503).send({ erreur: "boutique non configurée" });
    }
    const corps = CorpsJoueur.safeParse(req.body);
    if (!corps.success) return reply.code(400).send({ erreur: "corps invalide" });
    const etat = await store.get(corps.data.player_id);
    if (!etat) return reply.code(404).send({ erreur: "joueur inconnu" });
    if (!etat.vivant) return reply.code(409).send({ erreur: "personnage décédé", code: "MORT" });

    etat.tournants_bonus += TOURNANTS_BONUS_PAR_ACHAT;
    await store.put(etat);
    return { etat, credites: TOURNANTS_BONUS_PAR_ACHAT };
  });
}
