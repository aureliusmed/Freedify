import { type Phase, type Tournant } from "@life/shared";
import { randomUUID } from "node:crypto";

/**
 * Banque de secours (brief §5) : cartes pré-écrites servies quand la
 * génération IA échoue, est bloquée par la modération, ou qu'aucune clé API
 * n'est configurée (mode dev). Cible : ~20 cartes par phase.
 *
 * Contraintes d'écriture (voir docs/PLAN.md LOT 1) :
 *  - situation courte, ton du jeu, tutoiement, français ;
 *  - 2 à 4 choix, chacun avec un impact DISTINCT (pas de choix cosmétique) ;
 *  - impacts entre -8 et +8 en général, jamais hors [-25, +25] ;
 *  - ~1 carte sur 3 plante une seed ;
 *  - phases 0-17 ans : AUCUNE connotation romantique/sexuelle (contrainte
 *    STRUCTURELLE vérifiée par le test de modération — règle R1 du plan).
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
    {
      situation:
        "Tu goûtes le sable du bac à sable. Verdict scientifique : c'est croquant, décevant, et légèrement salé.",
      choix: [
        { id: "a", texte: "Recracher dignement", impact_prevu: { sante: 3, tonalite: 1 }, plante_seed: null },
        { id: "b", texte: "En reprendre pour confirmer l'hypothèse", impact_prevu: { sante: -4, tonalite: 3, chance: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "La sieste. L'ennemie de toujours. Les autres dorment, la couverture t'appelle, la rébellion aussi.",
      choix: [
        { id: "a", texte: "Céder au sommeil, en soldat épuisé", impact_prevu: { sante: 5, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Organiser une évasion silencieuse", impact_prevu: { sante: -2, tonalite: 4, capital_social: 2 }, plante_seed: { description_interne: "réputation de fauteur de troubles à la sieste", delai: 4 } },
      ],
    },
    {
      situation:
        "Ton doudou est tombé dans la boue. Il te regarde, sale et digne, depuis la flaque.",
      choix: [
        { id: "a", texte: "Le sauver sans hésiter, quitte à te salir", impact_prevu: { moralite: 4, capital_social: 3, sante: -1 }, plante_seed: null },
        { id: "b", texte: "Réclamer un doudou neuf en hurlant", impact_prevu: { richesse: 2, moralite: -3, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Mamie te glisse un carré de chocolat « en cachette de maman ». Le pacte du silence est proposé.",
      choix: [
        { id: "a", texte: "Accepter et garder le secret", impact_prevu: { tonalite: 4, capital_social: 3, moralite: -2 }, plante_seed: { description_interne: "complicité sucrée avec mamie, maman soupçonne", delai: 5 } },
        { id: "b", texte: "Tout balancer à maman par honnêteté", impact_prevu: { moralite: 5, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu découvres les crayons de couleur. Le mur du salon, lui, découvre une fresque abstraite de ta main.",
      choix: [
        { id: "a", texte: "Signer fièrement ton œuvre", impact_prevu: { tonalite: 5, moralite: -2, capital_social: -1 }, plante_seed: null },
        { id: "b", texte: "Accuser le chat", impact_prevu: { moralite: -5, chance: 2, tonalite: 2 }, plante_seed: { description_interne: "a accusé le chat du dessin sur le mur", delai: 3 } },
      ],
    },
    {
      situation:
        "Au supermarché, la tour de boîtes de conserve te défie. Elle est haute. Tu es petit. L'histoire retiendra ce moment.",
      choix: [
        { id: "a", texte: "Admirer sans toucher, en sage", impact_prevu: { moralite: 3, chance: 3 }, plante_seed: null },
        { id: "b", texte: "Retirer la boîte du bas", impact_prevu: { sante: -3, tonalite: 4, chance: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton petit frère vient de naître. Il est rouge, il crie, et il occupe TON berceau symbolique dans le cœur de tes parents.",
      choix: [
        { id: "a", texte: "L'adopter comme allié", impact_prevu: { capital_social: 6, moralite: 3, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Négocier son échange contre un chien", impact_prevu: { tonalite: 3, moralite: -2, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "La cuillère d'avion arrive vers ta bouche. « Fais l'avion », implore le parent. Tu détiens tout le pouvoir.",
      choix: [
        { id: "a", texte: "Ouvrir grand, en bon copilote", impact_prevu: { sante: 4, capital_social: 3 }, plante_seed: null },
        { id: "b", texte: "Détourner l'avion vers le sol", impact_prevu: { sante: -2, tonalite: 3, chance: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu apprends à marcher. Deux pas, une chute, un public en délire. La gloire a un goût de moquette.",
      choix: [
        { id: "a", texte: "Se relever et retenter, tenace", impact_prevu: { sante: 4, tonalite: 3, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Retourner au quatre-pattes, valeur sûre", impact_prevu: { sante: 1, tonalite: -1, chance: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un chien énorme s'approche en remuant la queue. Il fait trois fois ta taille et bave d'amour.",
      choix: [
        { id: "a", texte: "Tendre la main, courageux", impact_prevu: { capital_social: 4, tonalite: 4, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Grimper sur le parent le plus proche", impact_prevu: { sante: 1, tonalite: -2, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "On te met au pot pour la première fois. L'humanité entière est passée par là. Aujourd'hui, c'est ton tour.",
      choix: [
        { id: "a", texte: "Relever le défi, tête haute", impact_prevu: { sante: 3, capital_social: 4, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Utiliser le pot comme chapeau", impact_prevu: { tonalite: 5, moralite: -1, sante: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "À l'anniversaire de Léa, le clown engagé pour l'occasion te fixe intensément. Tu n'aimes pas les clowns.",
      choix: [
        { id: "a", texte: "Affronter le clown en duel de grimaces", impact_prevu: { capital_social: 4, tonalite: 4 }, plante_seed: null },
        { id: "b", texte: "Te réfugier sous le buffet", impact_prevu: { tonalite: -3, chance: 2, sante: 1 }, plante_seed: { description_interne: "peur des clowns née à l'anniversaire de Léa", delai: 6 } },
      ],
    },
    {
      situation:
        "Ton grand cousin te montre comment faire un château de sable « comme un pro ». Il en profite pour tout diriger.",
      choix: [
        { id: "a", texte: "Suivre ses ordres, apprenti loyal", impact_prevu: { capital_social: 4, moralite: 2 }, plante_seed: null },
        { id: "b", texte: "Détruire le château et fonder ta propre école", impact_prevu: { tonalite: 4, capital_social: -3, chance: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu refuses de manger tes petits pois. Ils sont ronds, verts, et clairement suspects. Le bras de fer commence.",
      choix: [
        { id: "a", texte: "Les manger en te bouchant le nez", impact_prevu: { sante: 5, moralite: 2, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Les cacher un par un sous la table", impact_prevu: { moralite: -3, tonalite: 3, chance: -2 }, plante_seed: { description_interne: "cache de petits pois moisis sous la table à découvrir", delai: 4 } },
      ],
    },
    {
      situation:
        "Premier bobo au genou. Une goutte de sang, une catastrophe planétaire. Le monde s'arrête de tourner.",
      choix: [
        { id: "a", texte: "Réclamer un pansement à motif, puis repartir", impact_prevu: { sante: 3, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Milite pour trois jours de repos absolu", impact_prevu: { tonalite: 3, capital_social: -1, sante: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "La maîtresse distribue des gommettes de récompense. Tu en as deux. Ton voisin en a cinq. L'injustice est flagrante.",
      choix: [
        { id: "a", texte: "Le féliciter avec grâce", impact_prevu: { moralite: 4, capital_social: 4, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Lui subtiliser discrètement une gommette", impact_prevu: { moralite: -5, richesse: 1, chance: -2 }, plante_seed: { description_interne: "a volé une gommette au voisin de classe", delai: 3 } },
      ],
    },
    {
      situation:
        "Tu as appris un gros mot dans la cour. Il te démange la langue. Le dîner de famille approche, silencieux et propice.",
      choix: [
        { id: "a", texte: "Le garder pour toi, prudent", impact_prevu: { moralite: 3, capital_social: 2 }, plante_seed: null },
        { id: "b", texte: "Le déclamer à table, tel un poète", impact_prevu: { tonalite: 5, capital_social: -3, moralite: -2 }, plante_seed: null },
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
    {
      situation:
        "En sport, on choisit les équipes. Tu es dans les derniers non-choisis. Le capitaine soupire en te désignant.",
      choix: [
        { id: "a", texte: "Te donner à fond pour prouver ta valeur", impact_prevu: { sante: 4, capital_social: 3, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Simuler une entorse pour t'échapper", impact_prevu: { moralite: -3, sante: -1, chance: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton meilleur ami déménage à l'autre bout du pays. Le dernier jour, il te confie sa collection de billes.",
      choix: [
        { id: "a", texte: "Promettre de garder contact pour toujours", impact_prevu: { capital_social: 5, tonalite: 3, moralite: 3 }, plante_seed: { description_interne: "promesse de rester en contact avec l'ami parti loin", delai: 7 } },
        { id: "b", texte: "Empocher les billes et tourner la page", impact_prevu: { richesse: 3, moralite: -3, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le grand de CM2 rackette les petits contre leur goûter. Aujourd'hui, il te repère.",
      choix: [
        { id: "a", texte: "Tenir tête, même en tremblant", impact_prevu: { capital_social: 5, sante: -2, tonalite: 2 }, plante_seed: { description_interne: "s'est opposé au racketteur de CM2", delai: 3 } },
        { id: "b", texte: "Livrer le goûter sans discuter", impact_prevu: { sante: 2, capital_social: -3, tonalite: -2 }, plante_seed: null },
        { id: "c", texte: "Prévenir un adulte", impact_prevu: { moralite: 4, capital_social: -1, chance: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton exposé sur les volcans est prêt. Juste avant de passer, tu réalises que tu as tout appris par cœur… en anglais, par erreur.",
      choix: [
        { id: "a", texte: "Improviser en français avec aplomb", impact_prevu: { capital_social: 4, tonalite: 3, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Réciter en anglais et assumer", impact_prevu: { tonalite: 4, capital_social: 2, moralite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu casses le vase préféré de ta grand-mère en jouant au ballon dans le salon. Les débris te fixent, accusateurs.",
      choix: [
        { id: "a", texte: "Avouer immédiatement", impact_prevu: { moralite: 6, capital_social: 2, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Recoller les morceaux et prier", impact_prevu: { moralite: -3, chance: -3, tonalite: 2 }, plante_seed: { description_interne: "vase de mamie recollé en douce, la fêlure va se voir", delai: 4 } },
      ],
    },
    {
      situation:
        "La kermesse de l'école cherche des volontaires pour le stand de gâteaux. Ta mère t'a inscrit d'office.",
      choix: [
        { id: "a", texte: "Devenir le meilleur vendeur de la kermesse", impact_prevu: { capital_social: 5, richesse: 3, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Manger le stock en cachette", impact_prevu: { sante: -3, tonalite: 3, moralite: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu as eu une mauvaise note. Le bulletin est dans ton cartable. Tes parents rentrent dans une heure.",
      choix: [
        { id: "a", texte: "Le montrer et expliquer honnêtement", impact_prevu: { moralite: 5, capital_social: 2 }, plante_seed: null },
        { id: "b", texte: "Imiter la signature de papa", impact_prevu: { moralite: -6, chance: -3, tonalite: 1 }, plante_seed: { description_interne: "a imité la signature parentale sur le bulletin", delai: 4 } },
      ],
    },
    {
      situation:
        "En colonie de vacances, on propose une rando de nuit. C'est facultatif, effrayant, et clairement inoubliable.",
      choix: [
        { id: "a", texte: "Y aller, lampe torche au poing", impact_prevu: { sante: 3, capital_social: 4, tonalite: 4 }, plante_seed: null },
        { id: "b", texte: "Rester au chalet à jouer aux cartes", impact_prevu: { capital_social: 2, tonalite: 2, chance: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu apprends à faire du vélo sans les petites roues. Ton père court derrière en lâchant la selle sans le dire.",
      choix: [
        { id: "a", texte: "Pédaler de toutes tes forces", impact_prevu: { sante: 5, tonalite: 4, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Freiner de panique et poser un pied", impact_prevu: { sante: 1, tonalite: -1, capital_social: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "La bande de copains veut construire une cabane dans le bois derrière l'école. Il faut « emprunter » des planches au chantier voisin.",
      choix: [
        { id: "a", texte: "Refuser de voler, proposer du carton", impact_prevu: { moralite: 5, capital_social: 1, tonalite: 1 }, plante_seed: null },
        { id: "b", texte: "Participer au grand emprunt de planches", impact_prevu: { capital_social: 4, moralite: -4, chance: -2 }, plante_seed: { description_interne: "planches empruntées au chantier pour la cabane", delai: 5 } },
      ],
    },
    {
      situation:
        "Tu découvres les jeux vidéo chez un copain. Rentrer chez toi devient soudain une idée très abstraite.",
      choix: [
        { id: "a", texte: "Rentrer à l'heure, en enfant fiable", impact_prevu: { moralite: 3, capital_social: 2, sante: 1 }, plante_seed: null },
        { id: "b", texte: "Rester « juste une partie de plus »", impact_prevu: { tonalite: 4, moralite: -2, capital_social: -1 }, plante_seed: { description_interne: "est rentré très en retard, les parents ont paniqué", delai: 3 } },
      ],
    },
    {
      situation:
        "On te confie la responsabilité d'arroser les plantes de la classe pendant les vacances. Un pouvoir immense.",
      choix: [
        { id: "a", texte: "Les arroser avec un dévouement militaire", impact_prevu: { moralite: 5, capital_social: 3 }, plante_seed: null },
        { id: "b", texte: "Oublier complètement pendant deux semaines", impact_prevu: { moralite: -3, capital_social: -2, chance: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu gagnes au tournoi de billes de l'école. Un adversaire beau joueur ; l'autre, mauvais perdant, réclame un match revanche truqué.",
      choix: [
        { id: "a", texte: "Accepter la revanche loyale", impact_prevu: { capital_social: 4, moralite: 3, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Garder tes billes et fanfaronner", impact_prevu: { richesse: 2, tonalite: 3, capital_social: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ta tante t'offre un pull tricoté main, hideux mais fait avec amour. Elle attend ta réaction, les yeux brillants.",
      choix: [
        { id: "a", texte: "Le porter fièrement pour lui faire plaisir", impact_prevu: { moralite: 4, capital_social: 3, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Grimacer sans pouvoir te retenir", impact_prevu: { tonalite: 2, moralite: -2, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le nouveau de la classe ne parle pas encore bien français et mange seul à la cantine. Ta table est complète, mais bon.",
      choix: [
        { id: "a", texte: "Lui faire une place et l'aider", impact_prevu: { moralite: 6, capital_social: 4, tonalite: 3 }, plante_seed: { description_interne: "amitié naissante avec le nouveau qu'on a aidé", delai: 6 } },
        { id: "b", texte: "Faire comme si tu ne l'avais pas vu", impact_prevu: { moralite: -4, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu reçois ton premier argent de poche. Il brûle dans ta poche. La boutique de bonbons est à 40 mètres.",
      choix: [
        { id: "a", texte: "En mettre la moitié de côté", impact_prevu: { richesse: 4, moralite: 3 }, plante_seed: null },
        { id: "b", texte: "Tout dépenser en confiseries immédiatement", impact_prevu: { tonalite: 4, sante: -3, richesse: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un documentaire animalier te bouleverse. Tu décides sur-le-champ de devenir végétarien, ce soir, au dîner de côtelettes.",
      choix: [
        { id: "a", texte: "Tenir ta conviction courageusement", impact_prevu: { moralite: 5, sante: 2, capital_social: -1 }, plante_seed: { description_interne: "engagement végétarien d'enfance à tenir ou abandonner", delai: 6 } },
        { id: "b", texte: "Craquer devant l'odeur de la viande", impact_prevu: { sante: 1, moralite: -2, tonalite: 2 }, plante_seed: null },
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
    {
      situation:
        "Tu te découvres une passion pour la guitare. Ton groupe de garage cherche un nom. Les débats sont plus longs que les répétitions.",
      choix: [
        { id: "a", texte: "T'investir à fond dans le groupe", impact_prevu: { tonalite: 5, capital_social: 4, richesse: -2 }, plante_seed: { description_interne: "rêve de percer avec le groupe de garage", delai: 7 } },
        { id: "b", texte: "Rester un musicien du dimanche", impact_prevu: { tonalite: 2, sante: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "En cours de philo, le prof lance un débat sur la justice. Tu as une opinion tranchée qui va à contre-courant de toute la classe.",
      choix: [
        { id: "a", texte: "Défendre ton point de vue seul contre tous", impact_prevu: { moralite: 4, capital_social: -2, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Te ranger à l'avis majoritaire", impact_prevu: { capital_social: 2, moralite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu rates ton permis de conduire pour une histoire de rétroviseur. La honte est proportionnelle à l'attente devant l'auto-école.",
      choix: [
        { id: "a", texte: "Retenter avec sérieux et rigueur", impact_prevu: { moralite: 3, richesse: -2, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Décréter que le vélo, c'est l'avenir", impact_prevu: { sante: 4, tonalite: 2, richesse: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un groupe populaire du lycée te propose de te joindre à eux, à condition de « laisser tomber » tes amis d'enfance jugés ringards.",
      choix: [
        { id: "a", texte: "Rester fidèle à tes vrais amis", impact_prevu: { moralite: 6, capital_social: 2, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Rejoindre les populaires et renier le passé", impact_prevu: { capital_social: 5, moralite: -5, tonalite: -2 }, plante_seed: { description_interne: "a lâché ses amis d'enfance pour la popularité", delai: 5 } },
      ],
    },
    {
      situation:
        "Ton grand frère te propose de « goûter » une bière en douce pendant le repas de famille. Tout le monde a le dos tourné.",
      choix: [
        { id: "a", texte: "Refuser, ce n'est pas le moment", impact_prevu: { sante: 3, moralite: 3, capital_social: -1 }, plante_seed: null },
        { id: "b", texte: "Accepter la gorgée interdite", impact_prevu: { tonalite: 2, moralite: -2, sante: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le conseil de classe décide de ton orientation. Le prof principal pousse pour une voie « raisonnable » qui t'ennuie déjà.",
      choix: [
        { id: "a", texte: "Te battre pour la filière qui te passionne", impact_prevu: { tonalite: 4, moralite: 3, capital_social: 1 }, plante_seed: { description_interne: "a imposé son choix d'orientation contre l'avis des profs", delai: 6 } },
        { id: "b", texte: "Suivre la voie raisonnable sans faire de vagues", impact_prevu: { richesse: 2, tonalite: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu montes un compte pour poster tes vidéos d'humour. La première fait un flop total, la deuxième commence à tourner.",
      choix: [
        { id: "a", texte: "Persévérer et poster régulièrement", impact_prevu: { capital_social: 5, tonalite: 4, richesse: 1 }, plante_seed: { description_interne: "chaîne vidéo qui commence à décoller", delai: 5 } },
        { id: "b", texte: "Tout supprimer, trop stressant", impact_prevu: { tonalite: -2, sante: 2, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un pote te demande de garder « juste un sac » dans ton casier pour la journée. Il insiste beaucoup et détourne le regard.",
      choix: [
        { id: "a", texte: "Refuser sans savoir ce qu'il contient", impact_prevu: { moralite: 5, capital_social: -2, chance: 3 }, plante_seed: null },
        { id: "b", texte: "Accepter par amitié aveugle", impact_prevu: { capital_social: 2, moralite: -3, chance: -4 }, plante_seed: { description_interne: "a gardé un sac suspect dans son casier", delai: 3 } },
      ],
    },
    {
      situation:
        "Tu bosses ton bac blanc. Un site vend « les vrais sujets fuités » pour 20 €. C'est probablement une arnaque. Probablement.",
      choix: [
        { id: "a", texte: "Réviser honnêtement, à l'ancienne", impact_prevu: { moralite: 5, sante: -1, capital_social: 1 }, plante_seed: null },
        { id: "b", texte: "Payer pour les faux sujets", impact_prevu: { richesse: -3, moralite: -4, chance: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu te fais tatouer un dessin au stylo par un copain « artiste ». Ça part au lavage, mais l'idée d'un vrai tatouage germe.",
      choix: [
        { id: "a", texte: "Attendre la majorité, sagement", impact_prevu: { moralite: 3, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Chercher un tatoueur peu regardant", impact_prevu: { tonalite: 3, moralite: -2, sante: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Manifestation lycéenne contre une réforme. Certains bloquent l'entrée, d'autres veulent aller en cours. On te demande ton camp.",
      choix: [
        { id: "a", texte: "Rejoindre le blocus par conviction", impact_prevu: { capital_social: 4, moralite: 3, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Aller en cours, la réforme t'indiffère", impact_prevu: { moralite: -1, capital_social: -2, richesse: 1 }, plante_seed: null },
        { id: "c", texte: "Filmer le chaos pour tes réseaux", impact_prevu: { tonalite: 3, capital_social: 2, moralite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu décroches un stage d'observation dans une boîte prestigieuse grâce à un contact de tes parents. Un autre élève, plus méritant, l'a raté.",
      choix: [
        { id: "a", texte: "Accepter et donner le meilleur de toi", impact_prevu: { richesse: 3, capital_social: 3, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Le refuser par principe d'équité", impact_prevu: { moralite: 6, richesse: -1, tonalite: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton corps change, ta voix déraille en plein exposé, la classe ricane. L'adolescence, ce grand théâtre de l'humiliation.",
      choix: [
        { id: "a", texte: "En rire le premier, désarmant tout le monde", impact_prevu: { capital_social: 5, tonalite: 4 }, plante_seed: null },
        { id: "b", texte: "Rougir et vouloir disparaître", impact_prevu: { tonalite: -3, capital_social: -1, sante: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu as économisé pour un scooter d'occasion. Le vendeur est pressé, refuse la facture, et le prix est étrangement bas.",
      choix: [
        { id: "a", texte: "Renoncer, ça sent l'engin volé", impact_prevu: { moralite: 5, richesse: -1, chance: 3 }, plante_seed: null },
        { id: "b", texte: "Acheter sans poser de questions", impact_prevu: { richesse: -4, tonalite: 3, chance: -4 }, plante_seed: { description_interne: "scooter acheté sans facture, peut-être volé", delai: 4 } },
      ],
    },
    {
      situation:
        "Un prof injuste te colle une punition collective pour la faute d'un seul. La classe attend de voir si quelqu'un ose broncher.",
      choix: [
        { id: "a", texte: "Contester calmement mais fermement", impact_prevu: { capital_social: 4, moralite: 4, chance: -1 }, plante_seed: null },
        { id: "b", texte: "Subir en silence, ronger ton frein", impact_prevu: { tonalite: -3, moralite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu te lances dans le sport de compétition. L'entraîneur voit du potentiel, mais les entraînements dévorent tes soirées.",
      choix: [
        { id: "a", texte: "Tout miser sur la compétition", impact_prevu: { sante: 5, capital_social: 2, tonalite: 3 }, plante_seed: { description_interne: "espoir sportif repéré par l'entraîneur", delai: 6 } },
        { id: "b", texte: "Garder le sport en loisir tranquille", impact_prevu: { sante: 3, tonalite: 2, capital_social: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le voyage scolaire à l'étranger coûte cher. Tes parents hésitent. Tu pourrais financer une partie en bossant cet été.",
      choix: [
        { id: "a", texte: "Travailler pour payer ta part", impact_prevu: { richesse: 2, moralite: 4, capital_social: 2 }, plante_seed: null },
        { id: "b", texte: "Renoncer au voyage pour ne pas les charger", impact_prevu: { moralite: 3, tonalite: -2, capital_social: -2 }, plante_seed: null },
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
    {
      situation:
        "Ton premier appartement. Le proprio te réclame trois mois de caution en liquide, « pour aller plus vite ». Sans reçu.",
      choix: [
        { id: "a", texte: "Exiger un bail et un reçu en règle", impact_prevu: { moralite: 3, chance: 3, richesse: -1 }, plante_seed: null },
        { id: "b", texte: "Payer cash pour ne pas rater l'appart", impact_prevu: { richesse: -5, chance: -3, tonalite: 1 }, plante_seed: { description_interne: "caution payée cash sans reçu à un proprio douteux", delai: 4 } },
      ],
    },
    {
      situation:
        "Tu rencontres quelqu'un. Ça devient sérieux. Vous parlez d'emménager ensemble, ce qui terrifie ton compte en banque autant que ton cœur.",
      choix: [
        { id: "a", texte: "Franchir le pas et emménager", impact_prevu: { capital_social: 5, tonalite: 4, richesse: -3 }, plante_seed: { description_interne: "vie de couple qui démarre, tensions financières possibles", delai: 6 } },
        { id: "b", texte: "Prendre ton temps, garder ton studio", impact_prevu: { moralite: 2, richesse: 1, tonalite: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Une soirée arrose ta première paie. Un ami insiste pour que tu conduises alors que tu as bu. Ta voiture est juste là.",
      choix: [
        { id: "a", texte: "Appeler un taxi, tant pis pour le prix", impact_prevu: { sante: 4, moralite: 5, richesse: -1 }, plante_seed: null },
        { id: "b", texte: "Prendre le volant, « ça va, c'est à côté »", impact_prevu: { sante: -6, moralite: -4, chance: -5 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu passes un entretien pour le job de tes rêves. Le recruteur te demande si tu maîtrises un logiciel dont tu n'as jamais entendu parler.",
      choix: [
        { id: "a", texte: "Avouer que tu apprendras vite", impact_prevu: { moralite: 4, capital_social: 1, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Bluffer avec assurance", impact_prevu: { richesse: 3, moralite: -3, chance: -2 }, plante_seed: { description_interne: "a menti sur une compétence en entretien", delai: 3 } },
      ],
    },
    {
      situation:
        "Ton diplôme en poche, tu hésites : partir tenter ta chance à l'étranger, ou rester près de ta famille vieillissante.",
      choix: [
        { id: "a", texte: "Tenter l'aventure à l'étranger", impact_prevu: { tonalite: 5, capital_social: -2, richesse: 2 }, plante_seed: { description_interne: "expatriation loin de la famille, culpabilité latente", delai: 7 } },
        { id: "b", texte: "Rester par devoir familial", impact_prevu: { moralite: 4, capital_social: 3, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu croules sous les crédits étudiants. Une pub promet de « tout regrouper » avec un taux qui semble trop beau pour être vrai.",
      choix: [
        { id: "a", texte: "Consulter un vrai conseiller d'abord", impact_prevu: { moralite: 3, richesse: 2, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Signer en ligne sans tout lire", impact_prevu: { richesse: -4, tonalite: -2, chance: -4 }, plante_seed: { description_interne: "crédit regroupé à un taux caché, la note va tomber", delai: 5 } },
      ],
    },
    {
      situation:
        "Ton patron te demande de rester tard, encore, un vendredi soir. Tes amis t'attendent pour un week-end prévu de longue date.",
      choix: [
        { id: "a", texte: "Poser tes limites et partir", impact_prevu: { capital_social: 4, tonalite: 3, richesse: -1 }, plante_seed: null },
        { id: "b", texte: "Sacrifier ton week-end pour bien voir", impact_prevu: { richesse: 3, capital_social: -3, sante: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un vieux copain devenu commercial te propose de « rejoindre son réseau » où « il suffit de recruter trois personnes ». Tu sens l'entourloupe.",
      choix: [
        { id: "a", texte: "Décliner poliment mais fermement", impact_prevu: { moralite: 4, chance: 3 }, plante_seed: null },
        { id: "b", texte: "Te laisser tenter par l'argent facile", impact_prevu: { richesse: -3, capital_social: -4, moralite: -3 }, plante_seed: { description_interne: "embarqué dans un système pyramidal douteux", delai: 4 } },
      ],
    },
    {
      situation:
        "Tu adoptes un chien du refuge. Il est adorable, imprévisible, et ta chambre en location interdit les animaux.",
      choix: [
        { id: "a", texte: "Assumer et négocier avec le proprio", impact_prevu: { tonalite: 4, capital_social: 2, richesse: -2 }, plante_seed: null },
        { id: "b", texte: "Le cacher en espérant que ça passe", impact_prevu: { tonalite: 3, moralite: -2, chance: -3 }, plante_seed: { description_interne: "chien caché au proprio malgré l'interdiction", delai: 3 } },
      ],
    },
    {
      situation:
        "Ta banque t'appelle : découvert autorisé dépassé. Tu peux réduire tes sorties, ou vendre ta collection de jeux vidéo d'enfance.",
      choix: [
        { id: "a", texte: "Te serrer la ceinture quelques mois", impact_prevu: { richesse: 3, tonalite: -2, moralite: 2 }, plante_seed: null },
        { id: "b", texte: "Vendre ta collection nostalgique", impact_prevu: { richesse: 5, tonalite: -3, capital_social: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un collègue s'attribue le mérite d'un projet que tu as porté seul. Le chef le félicite chaudement devant toi.",
      choix: [
        { id: "a", texte: "Rétablir la vérité calmement", impact_prevu: { capital_social: 3, moralite: 3, chance: -1 }, plante_seed: { description_interne: "conflit ouvert avec le collègue voleur de projet", delai: 4 } },
        { id: "b", texte: "Encaisser et documenter en silence", impact_prevu: { tonalite: -3, moralite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le service militaire volontaire, un an de tour du monde en sac à dos, ou continuer tes études en master. Trois chemins, une seule vie.",
      choix: [
        { id: "a", texte: "Le master, la voie tracée", impact_prevu: { richesse: 3, tonalite: -1, moralite: 1 }, plante_seed: null },
        { id: "b", texte: "Le tour du monde en sac à dos", impact_prevu: { tonalite: 6, sante: 2, richesse: -4 }, plante_seed: { description_interne: "année de voyage qui va tout recontextualiser", delai: 5 } },
        { id: "c", texte: "L'engagement volontaire, la discipline", impact_prevu: { sante: 4, capital_social: 3, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu te retrouves témoin d'un accrochage en voiture. Le responsable s'enfuit. Tu as vu la plaque. Personne d'autre.",
      choix: [
        { id: "a", texte: "Laisser un mot avec la plaque à la victime", impact_prevu: { moralite: 6, capital_social: 2, tonalite: 1 }, plante_seed: null },
        { id: "b", texte: "Passer ton chemin, pas ton problème", impact_prevu: { moralite: -4, chance: -1, tonalite: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ta grand-mère te lègue une vieille montre sans grande valeur… sauf sentimentale. Un brocanteur t'en propose une somme étonnante.",
      choix: [
        { id: "a", texte: "La garder précieusement", impact_prevu: { moralite: 3, tonalite: 3, capital_social: 1 }, plante_seed: null },
        { id: "b", texte: "La vendre au brocanteur pressé", impact_prevu: { richesse: 5, tonalite: -3, moralite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu montes ton premier vrai budget. Épargne prudente, ou tout placer sur une cryptomonnaie « recommandée par un influenceur » ?",
      choix: [
        { id: "a", texte: "Épargne prudente et diversifiée", impact_prevu: { richesse: 3, moralite: 2, chance: 1 }, plante_seed: null },
        { id: "b", texte: "Tout sur la crypto de l'influenceur", impact_prevu: { richesse: -5, tonalite: 3, chance: -4 }, plante_seed: { description_interne: "a tout misé sur une crypto conseillée par un influenceur", delai: 4 } },
      ],
    },
    {
      situation:
        "Un ami traverse une dépression et t'appelle à 3 h du matin. Tu as une présentation cruciale dans cinq heures.",
      choix: [
        { id: "a", texte: "Rester au téléphone toute la nuit", impact_prevu: { moralite: 6, capital_social: 4, sante: -3 }, plante_seed: null },
        { id: "b", texte: "Écourter et promettre de rappeler demain", impact_prevu: { richesse: 2, moralite: -2, tonalite: -2 }, plante_seed: null },
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
    {
      situation:
        "La question du bébé revient sur la table du dîner. Ton/ta partenaire est prêt·e. Toi, tu regardes ta carrière et ton compte épargne.",
      choix: [
        { id: "a", texte: "Se lancer dans la parentalité", impact_prevu: { tonalite: 5, capital_social: 3, richesse: -4 }, plante_seed: { description_interne: "arrivée d'un enfant, bouleversement total à venir", delai: 5 } },
        { id: "b", texte: "Repousser encore un peu", impact_prevu: { richesse: 2, tonalite: -3, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu peux racheter les parts d'un associé qui part. C'est risqué, coûteux, mais tu deviendrais seul maître à bord.",
      choix: [
        { id: "a", texte: "Emprunter et racheter les parts", impact_prevu: { richesse: -5, tonalite: 4, chance: 3 }, plante_seed: { description_interne: "endetté pour devenir seul patron de l'entreprise", delai: 6 } },
        { id: "b", texte: "Laisser entrer un nouvel associé", impact_prevu: { richesse: 2, capital_social: 2, tonalite: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un vieil ami te demande de lui prêter une grosse somme pour « une dernière chance de s'en sortir ». Il ne t'a jamais remboursé la dernière fois.",
      choix: [
        { id: "a", texte: "Prêter, l'amitié avant l'argent", impact_prevu: { capital_social: 3, richesse: -5, moralite: 3 }, plante_seed: { description_interne: "second prêt à l'ami qui ne rembourse jamais", delai: 5 } },
        { id: "b", texte: "Refuser mais proposer de l'aider autrement", impact_prevu: { moralite: 3, richesse: 1, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton entreprise te propose une mutation lucrative à l'autre bout du pays. Ta famille est enracinée ici, tes enfants scolarisés.",
      choix: [
        { id: "a", texte: "Refuser pour la stabilité familiale", impact_prevu: { capital_social: 4, moralite: 3, richesse: -2 }, plante_seed: null },
        { id: "b", texte: "Accepter et imposer le déménagement", impact_prevu: { richesse: 5, capital_social: -4, tonalite: -2 }, plante_seed: { description_interne: "déménagement imposé à la famille pour la carrière", delai: 5 } },
      ],
    },
    {
      situation:
        "Tu surprends un collègue en train de trafiquer les chiffres d'un rapport client. Il te voit le voir.",
      choix: [
        { id: "a", texte: "Le signaler à la direction", impact_prevu: { moralite: 6, capital_social: -3, chance: -1 }, plante_seed: { description_interne: "a dénoncé un collègue fraudeur, ambiance électrique", delai: 4 } },
        { id: "b", texte: "Fermer les yeux pour la paix", impact_prevu: { moralite: -5, capital_social: 2, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le burn-out te guette. Tu peux poser un long arrêt maladie, ou serrer les dents jusqu'à la promotion promise dans six mois.",
      choix: [
        { id: "a", texte: "Prendre soin de toi et t'arrêter", impact_prevu: { sante: 6, richesse: -3, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Tenir coûte que coûte pour la promo", impact_prevu: { richesse: 4, sante: -6, tonalite: -3 }, plante_seed: { description_interne: "épuisement ignoré pour décrocher la promotion", delai: 3 } },
      ],
    },
    {
      situation:
        "Ton couple bat de l'aile. Une thérapie de couple est proposée. C'est cher, inconfortable, et personne n'a envie de commencer.",
      choix: [
        { id: "a", texte: "Tenter la thérapie ensemble", impact_prevu: { capital_social: 4, tonalite: 2, richesse: -2 }, plante_seed: null },
        { id: "b", texte: "Laisser filer, chacun de son côté", impact_prevu: { tonalite: -4, capital_social: -3, moralite: -1 }, plante_seed: { description_interne: "couple qui s'éloigne sans rien affronter", delai: 6 } },
      ],
    },
    {
      situation:
        "Tu remportes un petit lot à la loterie. Pas de quoi arrêter de travailler, mais de quoi faire une folie ou une réserve.",
      choix: [
        { id: "a", texte: "Placer prudemment le gain", impact_prevu: { richesse: 5, moralite: 2 }, plante_seed: null },
        { id: "b", texte: "Offrir un voyage à toute la famille", impact_prevu: { capital_social: 5, tonalite: 5, richesse: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un chasseur de têtes t'offre le double de ton salaire chez un concurrent dont l'éthique est… discutable.",
      choix: [
        { id: "a", texte: "Rester fidèle à tes valeurs", impact_prevu: { moralite: 5, richesse: -1, tonalite: 1 }, plante_seed: null },
        { id: "b", texte: "Suivre l'argent, l'éthique attendra", impact_prevu: { richesse: 6, moralite: -4, capital_social: 1 }, plante_seed: { description_interne: "a rejoint une boîte à l'éthique douteuse pour l'argent", delai: 5 } },
      ],
    },
    {
      situation:
        "Tes parents vieillissent et ne peuvent plus vivre seuls. La maison de retraite est chère, les accueillir chez toi bouleverserait tout.",
      choix: [
        { id: "a", texte: "Les accueillir sous ton toit", impact_prevu: { moralite: 6, capital_social: 3, tonalite: -2 }, plante_seed: { description_interne: "parents âgés emménagés à la maison, cohabitation tendue", delai: 6 } },
        { id: "b", texte: "Financer la meilleure maison de retraite", impact_prevu: { richesse: -5, moralite: 2, capital_social: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Une seed d'il y a longtemps ressurgit : un projet que tu avais abandonné te tend les bras. Le tenter maintenant, c'est tout risquer.",
      choix: [
        { id: "a", texte: "Reprendre le vieux rêve", impact_prevu: { tonalite: 5, richesse: -3, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Le laisser définitivement au placard", impact_prevu: { richesse: 2, tonalite: -3, moralite: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu découvres que ton assurance a « oublié » de couvrir un sinistre chez toi. Le contrat est ambigu, un avocat coûterait cher.",
      choix: [
        { id: "a", texte: "Te battre avec un avocat", impact_prevu: { richesse: -3, moralite: 3, chance: 2 }, plante_seed: { description_interne: "procédure engagée contre l'assurance", delai: 5 } },
        { id: "b", texte: "Abandonner et payer de ta poche", impact_prevu: { richesse: -4, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton ado fait une bêtise sérieuse. Tu peux le couvrir auprès de l'école, ou le laisser assumer les conséquences.",
      choix: [
        { id: "a", texte: "Le laisser assumer, dur mais formateur", impact_prevu: { moralite: 5, capital_social: -1, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Le couvrir par instinct protecteur", impact_prevu: { capital_social: 2, moralite: -3, chance: -2 }, plante_seed: { description_interne: "a couvert la bêtise de son ado auprès de l'école", delai: 4 } },
      ],
    },
    {
      situation:
        "Un ancien camarade est devenu célèbre. Il t'invite à un dîner huppé plein de contacts précieux… et de gens qui te snobent.",
      choix: [
        { id: "a", texte: "Réseauter avec ambition", impact_prevu: { capital_social: 5, richesse: 2, moralite: -1 }, plante_seed: null },
        { id: "b", texte: "Rester toi-même, quitte à détonner", impact_prevu: { moralite: 4, tonalite: 2, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu as pris l'habitude d'un verre chaque soir « pour décompresser ». Ce soir, la bouteille est déjà bien entamée et il n'est que 19 h.",
      choix: [
        { id: "a", texte: "Reconnaître le signal et lever le pied", impact_prevu: { sante: 5, moralite: 4, tonalite: 1 }, plante_seed: null },
        { id: "b", texte: "Te resservir, « une soirée difficile »", impact_prevu: { sante: -5, tonalite: 2, moralite: -2 }, plante_seed: { description_interne: "l'habitude du verre du soir devient un problème", delai: 5 } },
      ],
    },
    {
      situation:
        "On te propose de présider l'association du quartier. C'est bénévole, chronophage, mais tu ferais une vraie différence.",
      choix: [
        { id: "a", texte: "Accepter et t'investir", impact_prevu: { capital_social: 6, moralite: 4, sante: -2 }, plante_seed: null },
        { id: "b", texte: "Décliner, ton temps est déjà compté", impact_prevu: { tonalite: 1, richesse: 1, capital_social: -2 }, plante_seed: null },
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
    {
      situation:
        "Le nid se vide : ton dernier enfant part faire ses études loin. La maison résonne d'un silence que tu n'avais pas prévu.",
      choix: [
        { id: "a", texte: "Redécouvrir la vie de couple et tes passions", impact_prevu: { tonalite: 4, capital_social: 2, sante: 2 }, plante_seed: null },
        { id: "b", texte: "Sombrer dans un vague à l'âme", impact_prevu: { tonalite: -5, sante: -2, moralite: 1 }, plante_seed: { description_interne: "syndrome du nid vide qui pèse sur le moral", delai: 4 } },
      ],
    },
    {
      situation:
        "Tu passes une visite médicale de routine. Le médecin fronce les sourcils devant un résultat et demande des examens complémentaires.",
      choix: [
        { id: "a", texte: "Faire les examens sans attendre", impact_prevu: { sante: 4, moralite: 2, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Repousser, « pas le temps, sûrement rien »", impact_prevu: { sante: -6, chance: -3, tonalite: 1 }, plante_seed: { description_interne: "examens médicaux repoussés malgré une alerte", delai: 4 } },
      ],
    },
    {
      situation:
        "Tes parents décèdent et te laissent la vieille maison de famille, pleine de souvenirs et de travaux. La vendre serait plus simple.",
      choix: [
        { id: "a", texte: "La garder et la restaurer", impact_prevu: { tonalite: 4, richesse: -5, moralite: 3 }, plante_seed: { description_interne: "maison de famille en rénovation qui engloutit le budget", delai: 6 } },
        { id: "b", texte: "La vendre pour tourner la page", impact_prevu: { richesse: 6, tonalite: -3, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "On t'offre un poste de direction prestigieux, mais il faudrait licencier une partie de ton équipe historique pour « rationaliser ».",
      choix: [
        { id: "a", texte: "Refuser le poste au prix fort", impact_prevu: { moralite: 6, richesse: -3, capital_social: 3 }, plante_seed: null },
        { id: "b", texte: "Accepter et procéder aux licenciements", impact_prevu: { richesse: 6, moralite: -5, capital_social: -3 }, plante_seed: { description_interne: "a licencié d'anciens collègues pour grimper", delai: 5 } },
      ],
    },
    {
      situation:
        "Un vieux rêve refait surface : reprendre des études, changer complètement de métier. C'est absurde à ton âge. Ou pas.",
      choix: [
        { id: "a", texte: "Se réinscrire et tout recommencer", impact_prevu: { tonalite: 5, richesse: -4, sante: 1 }, plante_seed: { description_interne: "reconversion tardive et incertaine engagée", delai: 6 } },
        { id: "b", texte: "Garder ton rêve bien rangé", impact_prevu: { richesse: 2, tonalite: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton ado majeur revient vivre chez toi après un échec. Ce devait être « juste quelques semaines ». Six mois plus tard, il est toujours là.",
      choix: [
        { id: "a", texte: "Fixer un cap clair pour son autonomie", impact_prevu: { moralite: 4, capital_social: 2, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Le materner sans rien exiger", impact_prevu: { capital_social: 2, moralite: -2, richesse: -3 }, plante_seed: { description_interne: "enfant adulte installé sans perspective de départ", delai: 5 } },
      ],
    },
    {
      situation:
        "Tu retrouves un amour de jeunesse sur les réseaux. Vous êtes tous les deux en couple. Les messages nostalgiques se multiplient.",
      choix: [
        { id: "a", texte: "Couper court par respect pour ton couple", impact_prevu: { moralite: 6, capital_social: 1, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Entretenir l'échange en secret", impact_prevu: { tonalite: 3, moralite: -5, chance: -3 }, plante_seed: { description_interne: "correspondance cachée avec un ancien amour", delai: 4 } },
      ],
    },
    {
      situation:
        "Ta boîte propose un départ anticipé avec une belle prime. Tu pourrais souffler, mais l'inactivité t'effraie autant qu'elle t'attire.",
      choix: [
        { id: "a", texte: "Prendre le départ et te réinventer", impact_prevu: { tonalite: 4, richesse: 3, sante: 2 }, plante_seed: null },
        { id: "b", texte: "Rester, le travail te structure", impact_prevu: { richesse: 4, capital_social: 2, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu constates que tu ne bouges plus. L'escalier t'essouffle. Un club de rando cherche des membres, ou ton canapé t'attend fidèlement.",
      choix: [
        { id: "a", texte: "Rejoindre le club de rando", impact_prevu: { sante: 6, capital_social: 4, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Rester fidèle au canapé", impact_prevu: { sante: -4, tonalite: 1, chance: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un jeune collègue talentueux menace ta place. Tu peux le mentorer généreusement, ou lui mettre discrètement des bâtons dans les roues.",
      choix: [
        { id: "a", texte: "Le mentorer et transmettre", impact_prevu: { moralite: 5, capital_social: 4, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Le saboter en douce", impact_prevu: { moralite: -6, richesse: 1, chance: -2 }, plante_seed: { description_interne: "a saboté un jeune collègue par peur du déclassement", delai: 4 } },
      ],
    },
    {
      situation:
        "Tu reçois un héritage inattendu d'un oncle lointain. Tes frères et sœurs estiment qu'il devrait être « partagé équitablement », bien qu'il te soit destiné.",
      choix: [
        { id: "a", texte: "Partager de bon cœur", impact_prevu: { capital_social: 5, moralite: 4, richesse: -3 }, plante_seed: null },
        { id: "b", texte: "Garder ce qui te revient légalement", impact_prevu: { richesse: 5, capital_social: -4, moralite: -1 }, plante_seed: { description_interne: "conflit familial autour de l'héritage de l'oncle", delai: 5 } },
      ],
    },
    {
      situation:
        "Une cause te touche profondément : bénévolat régulier, don généreux, ou t'engager en politique locale pour peser vraiment.",
      choix: [
        { id: "a", texte: "Donner de ton temps en bénévolat", impact_prevu: { moralite: 5, capital_social: 3, sante: 1 }, plante_seed: null },
        { id: "b", texte: "Te présenter aux élections locales", impact_prevu: { capital_social: 5, tonalite: 3, sante: -2 }, plante_seed: { description_interne: "engagement en politique locale aux résultats incertains", delai: 6 } },
        { id: "c", texte: "Faire un gros don et passer à autre chose", impact_prevu: { moralite: 3, richesse: -4, tonalite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu deviens grand-parent. Le bébé est confié à ta garde pour un week-end. Tes réflexes de jeune parent sont… rouillés.",
      choix: [
        { id: "a", texte: "Te lancer avec joie et improvisation", impact_prevu: { tonalite: 5, capital_social: 4, sante: -1 }, plante_seed: null },
        { id: "b", texte: "Paniquer et appeler à l'aide toutes les heures", impact_prevu: { tonalite: -1, capital_social: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton médecin te met en garde contre le tabac, une fois de plus. Tu fumes depuis trente ans. La cigarette te regarde depuis le paquet.",
      choix: [
        { id: "a", texte: "Décider d'arrêter pour de bon", impact_prevu: { sante: 6, tonalite: -2, moralite: 3 }, plante_seed: { description_interne: "sevrage tabagique difficile entamé", delai: 4 } },
        { id: "b", texte: "Remettre l'arrêt à « après les fêtes »", impact_prevu: { sante: -4, tonalite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un différend de voisinage s'envenime : une haie mal taillée, un ton qui monte. Ça peut virer au procès ou à la réconciliation autour d'un café.",
      choix: [
        { id: "a", texte: "Tendre la main et discuter", impact_prevu: { capital_social: 4, moralite: 3, tonalite: 2 }, plante_seed: null },
        { id: "b", texte: "Camper sur tes positions jusqu'au procès", impact_prevu: { richesse: -3, capital_social: -3, chance: -2 }, plante_seed: { description_interne: "guerre de voisinage judiciarisée pour une haie", delai: 5 } },
      ],
    },
    {
      situation:
        "Tu réalises que tu n'as pas pris de vraies vacances depuis des années. Un long voyage t'appelle, mais le travail « ne peut pas se passer de toi ».",
      choix: [
        { id: "a", texte: "Partir loin, longtemps, sans culpabilité", impact_prevu: { sante: 5, tonalite: 5, richesse: -4 }, plante_seed: null },
        { id: "b", texte: "Rester indispensable au bureau", impact_prevu: { richesse: 3, sante: -3, tonalite: -3 }, plante_seed: null },
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
    {
      situation:
        "Un démarcheur au téléphone insiste pour que tu « sécurises tes économies » sur un compte qu'il t'indiquera. Il connaît ton prénom, c'est troublant.",
      choix: [
        { id: "a", texte: "Raccrocher et signaler l'arnaque", impact_prevu: { moralite: 4, richesse: 1, chance: 3 }, plante_seed: null },
        { id: "b", texte: "Te laisser convaincre par sa voix rassurante", impact_prevu: { richesse: -7, tonalite: -3, chance: -4 }, plante_seed: { description_interne: "victime d'une arnaque téléphonique, économies en danger", delai: 3 } },
      ],
    },
    {
      situation:
        "Tes genoux te lâchent. Le médecin propose une opération lourde mais efficace, ou une vie plus douce, plus limitée, sans bistouri.",
      choix: [
        { id: "a", texte: "Tenter l'opération pour retrouver ta mobilité", impact_prevu: { sante: 4, tonalite: 3, chance: -2 }, plante_seed: { description_interne: "opération lourde des genoux avec convalescence incertaine", delai: 4 } },
        { id: "b", texte: "Accepter de ralentir sans opération", impact_prevu: { sante: 1, tonalite: -1, moralite: 2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu écris tes mémoires. Un chapitre concerne un secret de famille qui ferait grand mal s'il était révélé. Ta plume hésite.",
      choix: [
        { id: "a", texte: "Écrire la vérité, quoi qu'il en coûte", impact_prevu: { moralite: 3, capital_social: -3, tonalite: 2 }, plante_seed: { description_interne: "secret de famille couché sur le papier, bombe à retardement", delai: 4 } },
        { id: "b", texte: "Enterrer le secret avec toi", impact_prevu: { moralite: 2, capital_social: 2, tonalite: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ta famille suggère, avec délicatesse, qu'une résidence senior serait « plus sûre ». Tu tiens à ton indépendance comme à la prunelle de tes yeux.",
      choix: [
        { id: "a", texte: "Accepter la résidence pour les rassurer", impact_prevu: { sante: 3, capital_social: 3, tonalite: -3 }, plante_seed: null },
        { id: "b", texte: "Rester chez toi coûte que coûte", impact_prevu: { tonalite: 4, sante: -2, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu retrouves une vieille boîte de photos. Un ami perdu de vue depuis quarante ans y apparaît, souriant. Il vit peut-être encore.",
      choix: [
        { id: "a", texte: "Tout faire pour le retrouver", impact_prevu: { capital_social: 5, tonalite: 4, sante: -1 }, plante_seed: { description_interne: "recherche d'un ami perdu de vue depuis quarante ans", delai: 4 } },
        { id: "b", texte: "Laisser le passé dormir en paix", impact_prevu: { tonalite: -1, moralite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le jardin est devenu trop grand pour toi. Un jeune voisin propose de le cultiver en échange d'une partie des légumes. Ou tu bétonnes tout.",
      choix: [
        { id: "a", texte: "Partager le jardin avec le voisin", impact_prevu: { capital_social: 5, sante: 2, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Tout bétonner pour ne plus t'en soucier", impact_prevu: { tonalite: -2, sante: -1, richesse: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "On te demande de témoigner de ton histoire dans une école du quartier. Tu détestes parler en public, mais ta mémoire vaut de l'or.",
      choix: [
        { id: "a", texte: "Surmonter ta timidité et transmettre", impact_prevu: { capital_social: 5, moralite: 4, tonalite: 3 }, plante_seed: null },
        { id: "b", texte: "Décliner, garder tes histoires pour toi", impact_prevu: { tonalite: -1, capital_social: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu envisages de tout dépenser plutôt que de laisser un héritage : croisière de luxe, dons, folies. « Autant en profiter », dit une petite voix.",
      choix: [
        { id: "a", texte: "Profiter et dépenser sans compter", impact_prevu: { tonalite: 5, sante: 2, richesse: -6 }, plante_seed: null },
        { id: "b", texte: "Préserver un pécule pour les tiens", impact_prevu: { moralite: 4, capital_social: 3, tonalite: -2 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un rhume traîne et se transforme en toux inquiétante. À ton âge, ce n'est jamais anodin. Le médecin ou le sirop du placard ?",
      choix: [
        { id: "a", texte: "Consulter sans tarder", impact_prevu: { sante: 5, moralite: 2, chance: 2 }, plante_seed: null },
        { id: "b", texte: "Attendre que ça passe tout seul", impact_prevu: { sante: -6, tonalite: -1, chance: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Ton petit-fils te demande de financer son projet un peu fou : ouvrir un food-truck. Tes économies pourraient tout changer pour lui.",
      choix: [
        { id: "a", texte: "Croire en lui et investir", impact_prevu: { capital_social: 5, tonalite: 4, richesse: -5 }, plante_seed: { description_interne: "a financé le food-truck du petit-fils, pari familial", delai: 4 } },
        { id: "b", texte: "Refuser, l'argent, ça se mérite", impact_prevu: { richesse: 2, capital_social: -3, moralite: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Le maire t'offre une médaille d'honneur pour ta vie au service du quartier. La cérémonie est publique, tes rivaux d'antan seront là.",
      choix: [
        { id: "a", texte: "Accepter avec humilité et grâce", impact_prevu: { capital_social: 5, tonalite: 4, moralite: 3 }, plante_seed: null },
        { id: "b", texte: "Décliner, la reconnaissance te gêne", impact_prevu: { moralite: 3, tonalite: -1, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu tombes chez toi et personne ne le sait pendant des heures. Une fois relevé, la question du téléphone d'urgence au poignet se pose sérieusement.",
      choix: [
        { id: "a", texte: "Accepter le dispositif d'alerte", impact_prevu: { sante: 4, capital_social: 2, tonalite: -1 }, plante_seed: null },
        { id: "b", texte: "Refuser, par fierté mal placée", impact_prevu: { tonalite: 2, sante: -3, chance: -3 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Un ami de toujours s'éteint. À son enterrement, tu mesures le temps qui reste. Tu peux te replier ou embrasser chaque jour restant.",
      choix: [
        { id: "a", texte: "Décider de croquer la vie à pleines dents", impact_prevu: { tonalite: 5, sante: 2, capital_social: 3 }, plante_seed: null },
        { id: "b", texte: "Te replier dans le deuil et la solitude", impact_prevu: { tonalite: -5, sante: -3, capital_social: -3 }, plante_seed: { description_interne: "deuil d'un ami qui plonge dans l'isolement", delai: 3 } },
      ],
    },
    {
      situation:
        "Tes petits-enfants veulent enregistrer tes recettes de cuisine « avant qu'il ne soit trop tard ». La formule te fait sourire, ou grincer.",
      choix: [
        { id: "a", texte: "Transmettre tous tes secrets avec joie", impact_prevu: { capital_social: 5, tonalite: 4, moralite: 2 }, plante_seed: null },
        { id: "b", texte: "Garder LA recette secrète pour toi", impact_prevu: { tonalite: 3, capital_social: -1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "On te propose de partir en croisière du troisième âge. Fantastique programme, ou trois semaines coincé avec des inconnus grincheux ?",
      choix: [
        { id: "a", texte: "Embarquer pour l'aventure", impact_prevu: { tonalite: 5, capital_social: 4, richesse: -4 }, plante_seed: null },
        { id: "b", texte: "Rester au port, tranquille", impact_prevu: { richesse: 2, tonalite: -1, sante: 1 }, plante_seed: null },
      ],
    },
    {
      situation:
        "Tu ressens que la fin approche doucement. Tu peux mettre de l'ordre dans tes affaires et tes relations, ou vivre au jour le jour sans y penser.",
      choix: [
        { id: "a", texte: "Faire la paix avec tout le monde", impact_prevu: { moralite: 6, capital_social: 5, tonalite: 4 }, plante_seed: null },
        { id: "b", texte: "Vivre l'instant sans regarder derrière", impact_prevu: { tonalite: 3, sante: 1, moralite: -1 }, plante_seed: null },
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
