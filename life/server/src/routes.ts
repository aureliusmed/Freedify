import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { appliquerResetQuotidien, nouvelleVie } from "./engine/etat.js";
import {
  consommerSeed,
  enregistrerHistorique,
  resoudreChoix,
  seedPrete,
} from "./engine/resolution.js";
import { genererBilan, genererTournant, narrerResolution } from "./ia/generateur.js";
import { validerPlayerId, type Store } from "./store.js";

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
    if (etat.tournants_restants_aujourdhui <= 0) {
      return reply.code(429).send({ erreur: "plus de tournants aujourd'hui", code: "QUOTA" });
    }

    // Idempotence : si une carte est déjà en attente de résolution, la renvoyer.
    if (etat.tournant_en_cours) {
      return { tournant: etat.tournant_en_cours, restants: etat.tournants_restants_aujourdhui };
    }

    const seed = seedPrete(etat);
    const tournant = await genererTournant(etat, seed);
    if (seed && tournant.source === "ia") consommerSeed(etat, seed.id);

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
}
