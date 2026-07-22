import { describe, expect, it } from "vitest";
import type { Tournant } from "@life/shared";
import { PoolPhase } from "../pool.js";

function carte(situation: string): Tournant {
  return {
    tournant_id: "t_src",
    situation,
    choix: [
      { id: "a", texte: "x", impact_prevu: { tonalite: 1 }, plante_seed: null },
      { id: "b", texte: "y", impact_prevu: { tonalite: -1 }, plante_seed: null },
    ],
    source: "ia",
  };
}

describe("PoolPhase", () => {
  it("prend une carte non vue et la retire du pool avec un id neuf", () => {
    const pool = new PoolPhase();
    pool.remplir(carte("Situation A"));
    pool.remplir(carte("Situation B"));
    expect(pool.taille()).toBe(2);

    const prise = pool.prendre([]);
    expect(prise).not.toBeNull();
    expect(prise!.tournant_id).toMatch(/^t_pool_/);
    expect(pool.taille()).toBe(1);
  });

  it("évite les cartes déjà vues", () => {
    const pool = new PoolPhase();
    pool.remplir(carte("Vue"));
    pool.remplir(carte("Neuve"));
    const prise = pool.prendre(["Vue"]);
    expect(prise!.situation).toBe("Neuve");
  });

  it("retourne null si toutes les cartes ont été vues", () => {
    const pool = new PoolPhase();
    pool.remplir(carte("Vue"));
    expect(pool.prendre(["Vue"])).toBeNull();
    expect(pool.taille()).toBe(1); // rien retiré
  });

  it("respecte le plafond de 30 et ignore les doublons de situation", () => {
    const pool = new PoolPhase();
    for (let i = 0; i < 40; i++) pool.remplir(carte(`Carte ${i}`));
    expect(pool.taille()).toBe(30);

    const avant = pool.taille();
    pool.remplir(carte("Carte 0")); // doublon
    expect(pool.taille()).toBe(avant);
  });
});
