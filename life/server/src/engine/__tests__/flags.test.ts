import { describe, expect, it } from "vitest";
import { STATS_INITIALES, type Choix, type Stats, type Tournant } from "@life/shared";
import { deriverFlags, resoudreChoix } from "../resolution.js";
import { nouvelleVie } from "../etat.js";

function stats(overrides: Partial<Stats>): Stats {
  return { ...STATS_INITIALES, ...overrides };
}

function tournant(choix: Choix): Tournant {
  return {
    tournant_id: "t_flag",
    situation: "Situation de test pour les flags narratifs.",
    choix: [choix, { id: "z", texte: "autre", impact_prevu: {}, plante_seed: null }],
  };
}

describe("deriverFlags (fonction pure)", () => {
  it("pose `ruine` quand la richesse atteint 0", () => {
    const flags = deriverFlags(stats({ richesse: 5 }), stats({ richesse: 0 }), 30, []);
    expect(flags).toContain("ruine");
  });

  it("pose `fortune`, `saint`, `pilier_social` aux plafonds", () => {
    const flags = deriverFlags(
      stats({}),
      stats({ richesse: 100, moralite: 95, capital_social: 95 }),
      40,
      [],
    );
    expect(flags).toEqual(expect.arrayContaining(["fortune", "saint", "pilier_social"]));
  });

  it("pose `moralite_noire` et `solitaire` aux planchers", () => {
    const flags = deriverFlags(stats({}), stats({ moralite: 5, capital_social: 5 }), 40, []);
    expect(flags).toEqual(expect.arrayContaining(["moralite_noire", "solitaire"]));
  });

  it("ne crée pas de doublon si le flag est déjà présent", () => {
    const flags = deriverFlags(stats({ richesse: 5 }), stats({ richesse: 0 }), 30, ["ruine"]);
    expect(flags).not.toContain("ruine");
  });

  it("`miracule` exige d'avoir frôlé la mort auparavant, pas le même tournant", () => {
    // santé passe sous 10 : on pose a_frole_la_mort, PAS miracule
    const t1 = deriverFlags(stats({ sante: 20 }), stats({ sante: 5 }), 40, []);
    expect(t1).toContain("a_frole_la_mort");
    expect(t1).not.toContain("miracule");

    // tournant suivant, santé remonte au-dessus de 30 : miracule
    const t2 = deriverFlags(stats({ sante: 5 }), stats({ sante: 40 }), 41, ["a_frole_la_mort"]);
    expect(t2).toContain("miracule");
  });

  it("pose `survivant` à 86 ans", () => {
    expect(deriverFlags(stats({}), stats({}), 86, [])).toContain("survivant");
    expect(deriverFlags(stats({}), stats({}), 85, [])).not.toContain("survivant");
  });
});

describe("intégration dans resoudreChoix", () => {
  it("ajoute les flags à l'état résolu, sans doublon sur répétition", () => {
    const etat = nouvelleVie("pflag");
    etat.age = 30;
    etat.phase = "adulte";
    etat.stats.richesse = 4;

    resoudreChoix(etat, tournant({ id: "a", texte: "ruiner", impact_prevu: { richesse: -8 }, plante_seed: null }), tournant({ id: "a", texte: "ruiner", impact_prevu: { richesse: -8 }, plante_seed: null }).choix[0]!, () => 0.5);
    expect(etat.flags_narratifs).toContain("ruine");

    const nbAvant = etat.flags_narratifs.filter((f) => f === "ruine").length;
    etat.tournant_en_cours = null;
    const t2 = tournant({ id: "a", texte: "rester ruiné", impact_prevu: { richesse: -8 }, plante_seed: null });
    resoudreChoix(etat, t2, t2.choix[0]!, () => 0.5);
    const nbApres = etat.flags_narratifs.filter((f) => f === "ruine").length;
    expect(nbApres).toBe(nbAvant); // toujours une seule occurrence
  });
});
