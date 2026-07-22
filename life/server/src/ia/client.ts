import Anthropic from "@anthropic-ai/sdk";

/**
 * Client Anthropic partagé. Si aucune clé n'est disponible dans
 * l'environnement (ANTHROPIC_API_KEY / ANTHROPIC_AUTH_TOKEN / profil `ant`),
 * le serveur bascule en mode banque de secours — voir `iaDisponible`.
 */

export const MODELE_GENERATION = process.env.LIFE_MODEL ?? "claude-opus-4-8";
export const MODELE_RESOLUTION = process.env.LIFE_MODEL_RESOLUTION ?? MODELE_GENERATION;

let client: Anthropic | null = null;

export function iaDisponible(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

export function clientAnthropic(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}
