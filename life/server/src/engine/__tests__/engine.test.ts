import { describe, expect, it } from "vitest";
import {
  PHASES,
  TOURNANTS_PAR_JOUR,
  appliquerImpact,
  clampStat,
  estMineur,
  phasePourAge,
  type Choix,
  type Tournant,
} from "@life/shared";
import { appliquerResetQuotidien, minuitUtc, nouvelleVie } from "../etat.js";
import {
  impactsFinaux,
  resoudreChoix,
  seedPrete,
  tirerIssue,
} from "../resolution.js";
import { moderer } from "../moderation.js";
import { banquePourPhase, carteDeSecours } from "../fallback.js";

function choixTest(overrides: Partial<Choix> = {}): Choix {
  return {
    id: "a",
    texte: "Faire un choix de test",
    impact_prevu: { richesse: 4, moralite: -2 },
    plante_seed: null,
    ...overrides,
  };
}

function tournantTest(choix: Choix[] = [choixTest()]): Tournant {
  return {
    tournant_id: "t_test",
    situation: "Une situation de test parfaitement neutre.",
    choix,
  };
}

describe("phases", () => {
  it("mappe les âges aux bonnes phases (bornes du brief §3)", () => {
    expect(phasePourAge(0)).toBe("petite_enfance");
    expect(phasePourAge(5)).toBe("petite_enfance");
    expect(phasePourAge(6)).toBe("enfance");
    expect(phasePourAge(12)).toBe("enfance");
    expect(phasePourAge(13)).toBe("adolescence");
    expect(phasePourAge(17)).toBe("adolescence");
    expect(phasePourAge(18)).toBe("jeune_adulte");
    expect(phasePourAge(25)).toBe("jeune_adulte");
    expect(phasePourAge(26)).toBe("adulte");
    expect(phasePourAge(45)).toBe("adulte");
    expect(phasePourAge(46)).toBe("milieu_de_vie");
    expect(phasePourAge(65)).toBe("milieu_de_vie");
    expect(phasePourAge(66)).toBe("senior");
    expect(phasePourAge(99)).toBe("senior");
  });

  it("estMineur suit la frontière des 18 ans", () => {
    expect(estMineur(17)).toBe(true);
    expect(estMineur(18)).toBe(false);
  });
});

describe("stats", () => {
  it("clampe entre 0 et 100", () => {
    expect(clampStat(-5)).toBe(0);
    expect(clampStat(105)).toBe(100);
    expect(clampStat(42.6)).toBe(43);
  });

  it("applique les impacts sans dépasser les bornes", () => {
    const stats = appliquerImpact(
      { sante: 5, richesse: 98, capital_social: 50, moralite: 50, tonalite: 50, chance: 50 },
      { sante: -10, richesse: 10 },
    );
    expect(stats.sante).toBe(0);
    expect(stats.richesse).toBe(100);
    expect(stats.capital_social).toBe(50);
  });
});

describe("chance et issues", () => {
  it("une chance haute élimine les mauvaises issues aux mêmes tirages", () => {
    // r = 0.2 : mauvaise avec chance 50 (seuil 0.25), neutre avec chance 100 (seuil 0)
    expect(tirerIssue(50, () => 0.2)).toBe("mauvaise");
    expect(tirerIssue(100, () => 0.2)).toBe("neutre");
  });

  it("amplifie les pertes sur mauvaise issue et les gains sur bonne", () => {
    expect(impactsFinaux({ richesse: -4 }, "mauvaise").richesse).toBe(-6);
    expect(impactsFinaux({ richesse: 4 }, "bonne").richesse).toBe(6);
    expect(impactsFinaux({ richesse: 4 }, "neutre").richesse).toBe(4);
  });
});

describe("seeds narratives", () => {
  it("plante une seed et la fait ressurgir après son délai, priorité à la plus ancienne", () => {
    const etat = nouvelleVie("p1");
    etat.age = 30;
    etat.phase = "adulte";
    const tournant = tournantTest([
      choixTest({ plante_seed: { description_interne: "a menti à son associé", delai: 2 } }),
    ]);

    resoudreChoix(etat, tournant, tournant.choix[0]!, () => 0.5);
    expect(etat.seeds_actives).toHaveLength(1);
    expect(seedPrete(etat)).toBeNull();

    // deux tournants de plus : la seed atteint son délai
    for (let i = 0; i < 2; i++) {
      const t = tournantTest();
      etat.tournant_en_cours = t;
      resoudreChoix(etat, t, t.choix[0]!, () => 0.5);
    }
    const prete = seedPrete(etat);
    expect(prete?.description_interne).toBe("a menti à son associé");
  });

  it("ne dépasse jamais 5 seeds actives", () => {
    const etat = nouvelleVie("p2");
    etat.age = 30;
    etat.phase = "adulte";
    for (let i = 0; i < 8; i++) {
      const t = tournantTest([
        choixTest({ plante_seed: { description_interne: `seed ${i}`, delai: 10 } }),
      ]);
      resoudreChoix(etat, t, t.choix[0]!, () => 0.5);
    }
    expect(etat.seeds_actives.length).toBeLessThanOrEqual(5);
  });
});

describe("reset quotidien", () => {
  it("recharge les 5 tournants au changement de jour UTC", () => {
    const etat = nouvelleVie("p3");
    etat.tournants_restants_aujourdhui = 0;
    etat.derniere_reset = minuitUtc(new Date("2026-07-21T10:00:00Z"));

    appliquerResetQuotidien(etat, new Date("2026-07-21T23:59:00Z"));
    expect(etat.tournants_restants_aujourdhui).toBe(0); // même jour : pas de reset

    appliquerResetQuotidien(etat, new Date("2026-07-22T00:01:00Z"));
    expect(etat.tournants_restants_aujourdhui).toBe(TOURNANTS_PAR_JOUR);
  });

  it("décrémente le quota à chaque résolution", () => {
    const etat = nouvelleVie("p4");
    const t = tournantTest();
    resoudreChoix(etat, t, t.choix[0]!, () => 0.5);
    expect(etat.tournants_restants_aujourdhui).toBe(TOURNANTS_PAR_JOUR - 1);
  });
});

describe("mort", () => {
  it("meurt quand la santé tombe à 0", () => {
    const etat = nouvelleVie("p5");
    etat.stats.sante = 3;
    const t = tournantTest([choixTest({ impact_prevu: { sante: -10 } })]);
    const res = resoudreChoix(etat, t, t.choix[0]!, () => 0.5);
    expect(res.mort).toBe(true);
    expect(etat.vivant).toBe(false);
    expect(etat.cause_deces).toBe("sante");
  });
});

describe("modération (brief §2)", () => {
  it("bloque toute connotation romantique/sexuelle sur un mineur", () => {
    const t = tournantTest([choixTest({ texte: "Inviter ta petite amie au cinéma" })]);
    expect(moderer(t, 15).ok).toBe(false);
    expect(moderer(t, 25).ok).toBe(true);
  });

  it("bloque les détails opérationnels à tout âge", () => {
    const t: Tournant = {
      tournant_id: "t_x",
      situation: "On t'explique la recette pour synthétiser de la méth dans un garage.",
      choix: [choixTest(), choixTest({ id: "b" })],
    };
    expect(moderer(t, 30).ok).toBe(false);
  });

  it("laisse passer les thèmes matures non graphiques chez l'adulte", () => {
    const t: Tournant = {
      tournant_id: "t_y",
      situation: "Ton associé te propose de maquiller les comptes avant l'audit.",
      choix: [choixTest(), choixTest({ id: "b" })],
    };
    expect(moderer(t, 35).ok).toBe(true);
  });
});

describe("banque de secours", () => {
  it("contient des cartes pour chaque phase, toutes conformes à la modération", () => {
    for (const phase of PHASES) {
      const cartes = banquePourPhase(phase);
      expect(cartes.length).toBeGreaterThanOrEqual(2);
      // les cartes des phases mineures doivent passer la modération mineur
      const ageTest = phase === "petite_enfance" ? 3 : phase === "enfance" ? 9 : phase === "adolescence" ? 15 : 30;
      for (const carte of cartes) {
        const t: Tournant = { tournant_id: "t", ...carte };
        expect(moderer(t, ageTest).ok, `${phase}: ${carte.situation}`).toBe(true);
      }
    }
  });

  it("évite de resservir une carte déjà vue quand c'est possible", () => {
    const vues = banquePourPhase("adulte")
      .slice(0, 2)
      .map((c) => c.situation);
    for (let i = 0; i < 20; i++) {
      const carte = carteDeSecours("adulte", vues);
      expect(vues).not.toContain(carte.situation);
    }
  });
});
