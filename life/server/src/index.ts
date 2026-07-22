import Fastify from "fastify";
import cors from "@fastify/cors";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enregistrerRoutes } from "./routes.js";
import { FichierStore } from "./store.js";
import { SupabaseStore } from "./store-supabase.js";
import type { Store } from "./store.js";
import { iaDisponible } from "./ia/client.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dossierDonnees = process.env.LIFE_DATA_DIR ?? path.join(here, "..", "data");

const app = Fastify({ logger: true });
await app.register(cors, { origin: true });

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

app.get("/api/sante", async () => ({ ok: true, ia: iaDisponible() }));

const port = Number(process.env.PORT ?? 3001);
await app.listen({ port, host: "0.0.0.0" });
app.log.info(
  iaDisponible()
    ? "Génération IA active"
    : "Aucune clé Anthropic détectée — mode banque de secours uniquement",
);
