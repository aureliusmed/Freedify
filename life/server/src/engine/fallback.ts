import { type Phase, type Tournant } from "@life/shared";
import { randomUUID } from "node:crypto";

/**
 * Banque de secours (brief §5) : cartes pré-écrites servies quand la
 * génération IA échoue, est bloquée par la modération, ou qu'aucune clé API
 * n'est configurée (mode dev). Cible finale : ~20 cartes par phase ; cette
 * banque d'amorçage en contient 3 par phase, à étoffer.
 */

type CarteBanque = Omit<Tournant, "tournant_id" | "source">;

const BANQUE: Record<Phase, CarteBanque[]> = {
  petite_enfance: [
    {
      situation:
        "À la crèche, un autre bambin convoite ton camion rouge. Il tend la main. Le monde entier retient son souffle.",
      choix: [
        { id: "a", texte: "Prêter le camion, la mort dans l'âme", impact_prevu: { capital_social: 5, moralite: 3, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Hurler jusqu'à ce que l'adulte cède", impact_prevu: { capital_social: -3, tonalite: -2, chance: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tes parents te déguisent en citrouille pour la photo de famille. Tout le monde rit. Toi, tu n'oublieras jamais.",
      choix: [
        { id: "a", texte: "Sourire bravement pour la postérité", impact_prevu: { capital_social: 4, tonalite: 4 }, plante_seed: null },
        { id: "b", texte: "Arracher le costume avec fureur", impact_prevu: { tonalite: -3, capital_social: -2, sante: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Premier jour d'école maternelle. Ta mère pleure plus fort que toi devant la grille.",
      choix: [
        { id: "a", texte: "Entrer sans se retourner, en héros", impact_prevu: { capital_social: 4, chance: 2, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "S'accrocher à sa jambe comme une moule", impact_prevu: { tonalite: -2, capital_social: -2 }, plante_seed: null },
      ],
    },
  ],
  enfance: [
    {
      situation:
        "Tu trouves un billet de 10 € dans la cour de récré. Kevin jure que c'est le sien. Kevin ment souvent.",
      choix: [
        { id: "a", texte: "Le rendre à la maîtresse", impact_prevu: { moralite: 6, richesse: -1, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Le garder discrètement", impact_prevu: { richesse: 4, moralite: -5 }, plante_seed: { description_interne: "a gardé le billet trouvé, Kevin s'en souvient", delai: 4 } },
        { id: "c", texte: "Le donner à Kevin, par lassitude", impact_prevu: { capital_social: 3, moralite: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le contrôle de maths approche. Ton voisin de table propose un « partenariat stratégique » : il copie, tu profites de son goûter à vie.",
      choix: [
        { id: "a", texte: "Accepter le pacte", impact_prevu: { moralite: -4, capital_social: 4, richesse: 1 }, plante_seed: { description_interne: "pacte de triche scolaire, risque de se faire prendre", delai: 3 } },
        { id: "b", texte: "Refuser dignement", impact_prevu: { moralite: 5, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu veux un chien. Tes parents disent non. Le chien du voisin, lui, semble ouvert à la négociation.",
      choix: [
        { id: "a", texte: "Adopter secrètement le chien du voisin", impact_prevu: { tonalite: 5, moralite: -3, chance: -2 }, plante_seed: { description_interne: "le voisin cherche qui nourrit son chien en cachette", delai: 5 } },
        { id: "b", texte: "Lancer une campagne de lobbying familial", impact_prevu: { capital_social: 3, tonalite: 2 }, plante_seed: null },
      ],
    },
  ],
  adolescence: [
    {
      situation:
        "Soirée chez Théo. Ses parents sont absents, la rumeur dit que « tout le lycée » y sera. Tu as un contrôle lundi.",
      choix: [
        { id: "a", texte: "Y aller, on ne vit qu'une fois", impact_prevu: { capital_social: 6, sante: -2, tonalite: 3 }, plante_seed: { description_interne: "photos gênantes de la soirée circulent", delai: 4 } },
        { id: "b", texte: "Réviser comme un moine", impact_prevu: { capital_social: -3, richesse: 2, moralite: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton meilleur ami sèche les cours et te demande de le couvrir auprès du prof principal.",
      choix: [
        { id: "a", texte: "Mentir pour lui", impact_prevu: { capital_social: 4, moralite: -4 }, plante_seed: { description_interne: "a menti au prof principal pour couvrir un ami", delai: 3 } },
        { id: "b", texte: "Rester vague, ni oui ni non", impact_prevu: { moralite: 1, capital_social: -1 }, plante_seed: null },
        { id: "c", texte: "Le balancer, la trahison a un goût", impact_prevu: { moralite: 2, capital_social: -6, tonalite: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Petit boulot d'été : caissier au mini-golf ou monter un stand de limonade « artisanale » avec de la poudre premier prix.",
      choix: [
        { id: "a", texte: "Le mini-golf, la sécurité", impact_prevu: { richesse: 3, capital_social: 2 }, plante_seed: null },
        { id: "b", texte: "L'empire de la limonade", impact_prevu: { richesse: 5, moralite: -2, chance: 2 }, plante_seed: { description_interne: "des clients ont eu mal au ventre avec la limonade", delai: 4 } },
      ],
    },
  ],
  jeune_adulte: [
    {
      situation:
        "Ton coloc « emprunte » ta carte bleue pour commander des sushis. Encore. Le ticket traîne sur la table.",
      choix: [
        { id: "a", texte: "Exiger un remboursement immédiat", impact_prevu: { richesse: 3, capital_social: -3 }, plante_seed: null },
        { id: "b", texte: "Laisser couler et manger ses restes", impact_prevu: { richesse: -3, capital_social: 2, tonalite: 2 }, plante_seed: null },
        { id: "c", texte: "Commander un canapé avec SA carte", impact_prevu: { moralite: -5, tonalite: 4, richesse: 2 }, plante_seed: { description_interne: "guerre froide de colocation engagée", delai: 3 } },
      ],
    },
    {
      situation:
        "Un CDI ennuyeux mais stable, ou rejoindre la start-up de ton pote qui « va révolutionner la sieste en entreprise ».",
      choix: [
        { id: "a", texte: "Le CDI, l'aventure attendra", impact_prevu: { richesse: 5, tonalite: -2 }, plante_seed: null },
        { id: "b", texte: "La start-up de la sieste", impact_prevu: { richesse: -4, tonalite: 5, chance: 3 }, plante_seed: { description_interne: "la start-up brûle son cash à grande vitesse", delai: 5 } },
      ],
    },
    {
      situation:
        "Au mariage d'un cousin, on te place à la table des anciens. L'un d'eux te propose un « investissement en or » dans son élevage d'escargots.",
      choix: [
        { id: "a", texte: "Investir 500 € par politesse", impact_prevu: { richesse: -5, capital_social: 3, chance: 2 }, plante_seed: { description_interne: "a investi dans l'élevage d'escargots du tonton", delai: 6 } },
        { id: "b", texte: "Décliner en resservant du champagne", impact_prevu: { richesse: 1, capital_social: -1, tonalite: 2 }, plante_seed: null },
      ],
    },
  ],
  adulte: [
    {
      situation:
        "Ton patron s'attribue ton idée en réunion, devant toute la boîte. Il te fait un clin d'œil.",
      choix: [
        { id: "a", texte: "Le corriger publiquement, avec le sourire", impact_prevu: { capital_social: 4, richesse: -2, moralite: 3 }, plante_seed: { description_interne: "le patron humilié prépare sa revanche", delai: 4 } },
        { id: "b", texte: "Encaisser et noter dans un carnet", impact_prevu: { tonalite: -4, moralite: 1 }, plante_seed: { description_interne: "un carnet de griefs contre le patron se remplit", delai: 7 } },
        { id: "c", texte: "Demander une augmentation en privé", impact_prevu: { richesse: 4, capital_social: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un contrôle fiscal te réclame des justificatifs pour des frais « professionnels » qui incluent un jacuzzi.",
      choix: [
        { id: "a", texte: "Tout avouer et payer", impact_prevu: { richesse: -6, moralite: 5, tonalite: -2 }, plante_seed: null },
        { id: "b", texte: "Inventer un séminaire bien-être", impact_prevu: { moralite: -6, richesse: 2, chance: -2 }, plante_seed: { description_interne: "a menti au fisc sur le jacuzzi", delai: 6 } },
      ],
    },
    {
      situation:
        "Ton médecin te regarde par-dessus ses lunettes : « Le sport, ce n'est pas une option, c'est une ordonnance. »",
      choix: [
        { id: "a", texte: "S'inscrire au marathon, carrément", impact_prevu: { sante: 6, tonalite: 3, richesse: -2 }, plante_seed: null },
        { id: "b", texte: "Acheter des baskets et les regarder", impact_prevu: { sante: -3, richesse: -1, tonalite: 1 }, plante_seed: null },
      ],
    },
  ],
  milieu_de_vie: [
    {
      situation:
        "Ton ado te demande de l'aide pour son exposé. Tu réalises que tu ne sais plus rien de la photosynthèse, ni de ta jeunesse.",
      choix: [
        { id: "a", texte: "Passer la nuit à réapprendre avec lui", impact_prevu: { capital_social: 5, sante: -2, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Sous-traiter à une IA sans le dire", impact_prevu: { moralite: -3, capital_social: 1 }, plante_seed: { description_interne: "l'exposé fait par l'IA sera exposé au grand jour", delai: 3 } },
      ],
    },
    {
      situation:
        "Crise de la cinquantaine, édition standard : moto, potager, ou reconversion en apiculteur. Le garage ne peut en accueillir qu'une.",
      choix: [
        { id: "a", texte: "La moto, évidemment", impact_prevu: { tonalite: 5, sante: -3, richesse: -4 }, plante_seed: null },
        { id: "b", texte: "Les abeilles, la vraie richesse", impact_prevu: { tonalite: 4, richesse: -2, chance: 2 }, plante_seed: null },
        { id: "c", texte: "Rien. Épargner. Comme toujours.", impact_prevu: { richesse: 4, tonalite: -4 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un ancien collègue te propose de racheter ensemble le bar-PMU du quartier, « une affaire en or, fais-moi confiance ».",
      choix: [
        { id: "a", texte: "Signer sur un coin de comptoir", impact_prevu: { richesse: -6, tonalite: 4, chance: 3 }, plante_seed: { description_interne: "copropriétaire d'un bar-PMU à la comptabilité floue", delai: 5 } },
        { id: "b", texte: "Offrir une tournée et s'éclipser", impact_prevu: { richesse: -1, capital_social: 2 }, plante_seed: null },
      ],
    },
  ],
  senior: [
    {
      situation:
        "Le club de bridge te propose la présidence. L'actuelle présidente, 92 ans, n'a pas dit son dernier mot.",
      choix: [
        { id: "a", texte: "Briguer le pouvoir sans pitié", impact_prevu: { capital_social: 5, tonalite: 3, moralite: -2 }, plante_seed: { description_interne: "guerre de succession au club de bridge", delai: 3 } },
        { id: "b", texte: "Rester dans l'ombre, en faiseur de rois", impact_prevu: { capital_social: 3, moralite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tes petits-enfants t'installent « la fibre ». Tu découvres les visioconférences, les arnaques par SMS et les vidéos de chats.",
      choix: [
        { id: "a", texte: "Devenir influenceur tricot", impact_prevu: { capital_social: 6, tonalite: 5, richesse: 2 }, plante_seed: null },
        { id: "b", texte: "Débrancher tout ça et lire un livre", impact_prevu: { tonalite: 2, sante: 1, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le notaire te presse de rédiger ton testament. Ta nièce préférée et ton neveu insupportable attendent chacun leur part.",
      choix: [
        { id: "a", texte: "Tout léguer à la nièce", impact_prevu: { moralite: 2, capital_social: -3, tonalite: 2 }, plante_seed: { description_interne: "le neveu déshérité prépare une contestation", delai: 3 } },
        { id: "b", texte: "Tout léguer au refuge pour ânes", impact_prevu: { moralite: 4, tonalite: 4, capital_social: -4 }, plante_seed: null },
        { id: "c", texte: "Repousser, l'éternité peut attendre", impact_prevu: { tonalite: -2 }, plante_seed: null },
      ],
    },
  ],
};

/** Tire une carte de secours pour la phase donnée, en évitant si possible les cartes déjà vues. */
export function carteDeSecours(phase: Phase, dejaVues: string[] = []): Tournant {
  const cartes = BANQUE[phase];
  const candidates = cartes.filter((c) => !dejaVues.some((vu) => vu === c.situation));
  const pool = candidates.length > 0 ? candidates : cartes;
  const carte = pool[Math.floor(Math.random() * pool.length)]!;
  return {
    tournant_id: `t_fb_${randomUUID().slice(0, 8)}`,
    situation: carte.situation,
    choix: carte.choix,
    source: "fallback",
  };
}

export function banquePourPhase(phase: Phase): CarteBanque[] {
  return BANQUE[phase];
}
