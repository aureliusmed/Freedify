import { type Tournant } from "@life/shared";
import { randomUUID } from "node:crypto";

const PLAFOND = 30;

/**
 * Pool de cartes pré-générées pour une phase (brief §6 : les cartes de petite
 * enfance sont peu différenciées entre joueurs — on les mutualise pour réduire
 * les appels IA). En mémoire, partagé entre joueurs. Une carte servie reçoit
 * un `tournant_id` neuf pour rester unique par joueur, et est retirée du pool.
 */
export class PoolPhase {
  private cartes: Tournant[] = [];

  /** Retourne une carte non vue par ce joueur (comparaison sur `situation`),
   *  la retire du pool et lui donne un id neuf. `null` si le pool est vide ou
   *  ne contient que des cartes déjà vues. */
  prendre(dejaVues: string[] = []): Tournant | null {
    const idx = this.cartes.findIndex((c) => !dejaVues.includes(c.situation));
    if (idx === -1) return null;
    const [carte] = this.cartes.splice(idx, 1);
    return { ...carte!, tournant_id: `t_pool_${randomUUID().slice(0, 8)}` };
  }

  /** Ajoute une carte au pool (ignorée si le plafond est atteint ou si une
   *  carte de même `situation` est déjà présente). */
  remplir(t: Tournant): void {
    if (this.cartes.length >= PLAFOND) return;
    if (this.cartes.some((c) => c.situation === t.situation)) return;
    this.cartes.push(t);
  }

  taille(): number {
    return this.cartes.length;
  }
}
