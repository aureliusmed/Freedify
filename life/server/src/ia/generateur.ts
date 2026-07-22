import {
  type BilanDeVie,
  type Choix,
  type EtatDeVie,
  type SeedActive,
  type Tournant,
  TournantSchema,
} from "@life/shared";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { MODELE_GENERATION, MODELE_RESOLUTION, clientAnthropic, iaDisponible } from "./client.js";
import {
  PROMPT_SYSTEME_BILAN,
  PROMPT_SYSTEME_GENERATION,
  PROMPT_SYSTEME_RESOLUTION,
  contexteGeneration,
} from "./prompts.js";
import { moderer, modererTexte } from "../engine/moderation.js";
import { carteDeSecours } from "../engine/fallback.js";
import type { Issue } from "../engine/resolution.js";

const TournantIASchema = TournantSchema; // sortie JSON stricte attendue (brief §5)

const BilanIASchema = z
  .object({
    titre: z.string().min(3).max(120),
    texte: z.string().min(20).max(900),
    stat_marquante: z.string().min(3).max(200),
  })
  .strict();

/**
 * Génère un Tournant via Claude ; en cas d'échec (pas de clé, erreur API,
 * refus, JSON invalide, carte bloquée par la modération), bascule sur la
 * banque de secours (brief §5, « Modération post-génération »).
 */
export async function genererTournant(
  etat: EtatDeVie,
  seedARessurgir: SeedActive | null,
): Promise<Tournant> {
  const dejaVues = etat.historique_tournants.map((h) => h.resume);

  if (!iaDisponible()) {
    return carteDeSecours(etat.phase, dejaVues);
  }

  try {
    const response = await clientAnthropic().messages.parse({
      model: MODELE_GENERATION,
      max_tokens: 2048, // cartes volontairement courtes (2-4 lignes + 2-4 choix)
      system: PROMPT_SYSTEME_GENERATION,
      messages: [{ role: "user", content: contexteGeneration(etat, seedARessurgir) }],
      output_config: { format: zodOutputFormat(TournantIASchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) {
      return carteDeSecours(etat.phase, dejaVues);
    }

    const tournant: Tournant = { ...response.parsed_output, source: "ia" };
    const verdict = moderer(tournant, etat.age);
    if (!verdict.ok) {
      console.warn(`[moderation] carte IA rejetée (${verdict.raison}) — fallback`);
      return carteDeSecours(etat.phase, dejaVues);
    }
    return tournant;
  } catch (err) {
    console.error("[ia] échec génération, fallback:", err instanceof Error ? err.message : err);
    return carteDeSecours(etat.phase, dejaVues);
  }
}

function resultatDeSecours(issue: Issue): string {
  switch (issue) {
    case "bonne":
      return "Contre toute attente, ça se passe bien. Presque trop bien.";
    case "mauvaise":
      return "Ça ne se passe pas exactement comme prévu. Pas du tout, en fait.";
    default:
      return "La vie continue, ni triomphe ni naufrage. Un mardi, quoi.";
  }
}

/**
 * Second appel léger (brief §5) : le moteur a déjà calculé les impacts finaux
 * (facteur chance inclus) ; l'IA ne produit que le texte narratif du résultat.
 */
export async function narrerResolution(
  etat: EtatDeVie,
  tournant: Tournant,
  choix: Choix,
  issue: Issue,
): Promise<string> {
  if (!iaDisponible()) return resultatDeSecours(issue);

  try {
    const response = await clientAnthropic().messages.create({
      model: MODELE_RESOLUTION,
      max_tokens: 300, // 1-2 lignes attendues
      system: PROMPT_SYSTEME_RESOLUTION,
      messages: [
        {
          role: "user",
          content: [
            `Personnage : ${etat.age} ans, tonalité ${etat.stats.tonalite}/100, mineur : ${etat.age < 18 ? "oui" : "non"}.`,
            `Situation : ${tournant.situation}`,
            `Choix fait : ${choix.texte}`,
            `Issue tirée par le moteur : ${issue}.`,
            `Écris le résultat narratif (1-2 lignes).`,
          ].join("\n"),
        },
      ],
    });

    if (response.stop_reason === "refusal") return resultatDeSecours(issue);
    const texte = response.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join(" ")
      .trim();
    if (!texte || !modererTexte(texte, etat.age).ok) return resultatDeSecours(issue);
    return texte;
  } catch (err) {
    console.error("[ia] échec narration, fallback:", err instanceof Error ? err.message : err);
    return resultatDeSecours(issue);
  }
}

function bilanDeSecours(etat: EtatDeVie): BilanDeVie {
  const sombre = etat.stats.tonalite < 40;
  return {
    titre: sombre ? "Ci-gît quelqu'un qui aura essayé" : "Une vie bien remplie, tout compte fait",
    texte: sombre
      ? `Parti·e à ${etat.age} ans, après ${etat.historique_tournants.length} décisions dont au moins la moitié étaient discutables. La famille demande que les fleurs soient remplacées par des excuses.`
      : `Parti·e à ${etat.age} ans, le sourire aux lèvres et ${etat.historique_tournants.length} décisions au compteur. Le monde est un peu plus vide, mais franchement mieux rangé.`,
    stat_marquante: `${etat.historique_tournants.length} tournants traversés, ${etat.seeds_actives.length} casseroles jamais résolues.`,
    age_final: etat.age,
    tonalite_finale: etat.stats.tonalite,
  };
}

export async function genererBilan(etat: EtatDeVie): Promise<BilanDeVie> {
  if (!iaDisponible()) return bilanDeSecours(etat);

  try {
    const response = await clientAnthropic().messages.parse({
      model: MODELE_GENERATION,
      max_tokens: 1024,
      system: PROMPT_SYSTEME_BILAN,
      messages: [
        {
          role: "user",
          content: [
            `Âge final : ${etat.age} ans. Cause : ${etat.cause_deces ?? "inconnue"}.`,
            `Tonalité finale : ${etat.stats.tonalite}/100. Stats : ${JSON.stringify(etat.stats)}.`,
            `Flags : ${etat.flags_narratifs.join(", ") || "aucun"}.`,
            `Moments marquants :`,
            etat.historique_tournants
              .slice(-15)
              .map((h) => `- (${h.age} ans) ${h.resume} → ${h.choix_fait}`)
              .join("\n") || "(vie éclair)",
            `Rédige le bilan de vie.`,
          ].join("\n"),
        },
      ],
      output_config: { format: zodOutputFormat(BilanIASchema) },
    });

    if (response.stop_reason === "refusal" || !response.parsed_output) return bilanDeSecours(etat);
    const b = response.parsed_output;
    if (!modererTexte(`${b.titre}\n${b.texte}`, 99).ok) return bilanDeSecours(etat);
    return {
      ...b,
      age_final: etat.age,
      tonalite_finale: etat.stats.tonalite,
    };
  } catch (err) {
    console.error("[ia] échec bilan, fallback:", err instanceof Error ? err.message : err);
    return bilanDeSecours(etat);
  }
}
