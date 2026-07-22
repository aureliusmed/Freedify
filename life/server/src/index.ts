import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enregistrerRoutes } from "./routes.js";
import { FichierStore } from "./store.js";
import { SupabaseStore } from "./store-supabase.js";
import type { Store } from "./store.js";
import { iaDisponible } from "./ia/client.js";
import { authConfigDepuisEnv, creerVerificateur } from "./auth.js";
import { GestionnairePush, planifierResetQuotidien, pushConfigDepuisEnv } from "./push.js";
import type { PushSubscription } from "web-push";
import { z } from "zod";

declare module "fastify" {
  interface FastifyRequest {
    authUserId: string | null;
  }
}

const here = path.dirname(fileURLToPath(import.meta.url));
const dossierDonnees = process.env.LIFE_DATA_DIR ?? path.join(here, "..", "data");

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

// Auth optionnelle (brief §6) : si Supabase Auth est configuré, un Bearer token
// est vérifié côté serveur et remplace le player_id du corps par l'id du compte.
// Sans configuration, le jeu reste anonyme (aucun hook enregistré).
app.decorateRequest("authUserId", null);
const authConfig = authConfigDepuisEnv();
if (authConfig) {
  const verifier = creerVerificateur(authConfig);
  app.addHook("preValidation", async (req, reply) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return; // requête anonyme
    const userId = await verifier(header.slice(7));
    if (!userId) {
      // token présent mais invalide : 401, jamais de repli silencieux
      await reply.code(401).send({ erreur: "token invalide" });
      return reply;
    }
    req.authUserId = userId;
    // Un compte authentifié joue toujours sur SA vie : on force le player_id
    // du corps (sauf player_id_anonyme, utilisé par la route d'adoption).
    if (req.body && typeof req.body === "object" && "player_id" in req.body) {
      (req.body as { player_id: string }).player_id = userId;
    }
  });
  app.log.info("Auth : Supabase (Google)");
} else {
  app.log.info("Auth : anonyme (aucune configuration Supabase Auth)");
}

// Sélection du store : Supabase si configuré, sinon fichier (défaut, ADR-006).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
let store: Store;
if (supabaseUrl && supabaseKey) {
  store = new SupabaseStore(supabaseUrl, supabaseKey);
  app.log.info("Store : Supabase");
} else {
  store = new FichierStore(dossierDonnees);
  app.log.info(`Store : fichier (${dossierDonnees})`);
}
enregistrerRoutes(app, store);

// Push optionnel (brief §6) : actif seulement si les clés VAPID sont fournies.
const pushConfig = pushConfigDepuisEnv();
let gestionnairePush: GestionnairePush | null = null;
let arreterScheduler: (() => void) | null = null;
if (pushConfig) {
  gestionnairePush = new GestionnairePush(
    pushConfig,
    path.join(dossierDonnees, "push-subscriptions.json"),
  );
  arreterScheduler = planifierResetQuotidien(gestionnairePush);
  app.log.info("Push : actif (VAPID configuré)");

  app.get("/api/push/cle", async () => ({ publicKey: gestionnairePush!.clePublique }));

  app.post("/api/push/abonner", async (req, reply) => {
    const corps = z
      .object({
        player_id: z.string().min(1).max(64),
        subscription: z.object({ endpoint: z.string().url() }).passthrough(),
      })
      .safeParse(req.body);
    if (!corps.success) return reply.code(400).send({ erreur: "corps invalide" });
    await gestionnairePush!.abonner(
      corps.data.player_id,
      corps.data.subscription as unknown as PushSubscription,
    );
    return { ok: true };
  });
} else {
  app.log.info("Push : inactif (aucune clé VAPID)");
  app.post("/api/push/abonner", async (_req, reply) =>
    reply.code(503).send({ erreur: "notifications push non configurées" }),
  );
}

app.get("/api/sante", async () => ({
  ok: true,
  ia: iaDisponible(),
  push: gestionnairePush !== null,
}));

app.addHook("onClose", async () => {
  if (arreterScheduler) arreterScheduler();
});

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(
  iaDisponible()
    ? "Génération IA active"
    : "Aucune clé Anthropic détectée — mode banque de secours uniquement",
);
