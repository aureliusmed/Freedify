import webpush, { type PushSubscription } from "web-push";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Notifications push du reset quotidien (brief §6), optionnelles. Actives
 * uniquement si VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY et VAPID_SUBJECT sont
 * définis. Sans configuration, `pushDisponible()` renvoie false et la route
 * d'abonnement répond 503 (le bouton front est alors masqué).
 *
 * Abonnements persistés dans un fichier JSON (MVP mono-instance) : le
 * scheduler `setInterval` d'une minute suffit pour un seul process ; un vrai
 * ordonnanceur viendra avec l'infra (voir ADR-012).
 */

export interface PushConfig {
  publicKey: string;
  privateKey: string;
  subject: string;
}

export function pushConfigDepuisEnv(): PushConfig | null {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (publicKey && privateKey && subject) return { publicKey, privateKey, subject };
  return null;
}

type Carnet = Record<string, PushSubscription>;

export class GestionnairePush {
  private carnet: Carnet = {};
  private chargé = false;

  constructor(
    private config: PushConfig,
    private fichier: string,
  ) {
    webpush.setVapidDetails(config.subject, config.publicKey, config.privateKey);
  }

  get clePublique(): string {
    return this.config.publicKey;
  }

  private async charger(): Promise<void> {
    if (this.chargé) return;
    if (existsSync(this.fichier)) {
      try {
        this.carnet = JSON.parse(await readFile(this.fichier, "utf8")) as Carnet;
      } catch {
        this.carnet = {};
      }
    }
    this.chargé = true;
  }

  private async sauver(): Promise<void> {
    await mkdir(path.dirname(this.fichier), { recursive: true });
    await writeFile(this.fichier, JSON.stringify(this.carnet), "utf8");
  }

  async abonner(playerId: string, subscription: PushSubscription): Promise<void> {
    await this.charger();
    this.carnet[playerId] = subscription;
    await this.sauver();
  }

  /** Envoie la notification à tous les abonnés ; purge ceux dont l'endpoint
   *  n'existe plus (404/410). Retourne le nombre d'envois réussis. */
  async notifierTous(titre: string, corps: string): Promise<number> {
    await this.charger();
    const charge = JSON.stringify({ title: titre, body: corps });
    let succes = 0;
    const morts: string[] = [];
    await Promise.all(
      Object.entries(this.carnet).map(async ([playerId, sub]) => {
        try {
          await webpush.sendNotification(sub, charge);
          succes += 1;
        } catch (err) {
          const code = (err as { statusCode?: number }).statusCode;
          if (code === 404 || code === 410) morts.push(playerId);
        }
      }),
    );
    if (morts.length > 0) {
      for (const id of morts) delete this.carnet[id];
      await this.sauver();
    }
    return succes;
  }
}

/**
 * Planifie l'envoi de la notification au passage de minuit UTC. Vérifie chaque
 * minute ; déclenche une fois par jour. Retourne une fonction d'arrêt.
 */
export function planifierResetQuotidien(gestionnaire: GestionnairePush): () => void {
  let dernierJourNotifie = new Date().getUTCDate();
  const timer = setInterval(
    () => {
      const jour = new Date().getUTCDate();
      if (jour !== dernierJourNotifie) {
        dernierJourNotifie = jour;
        void gestionnaire.notifierTous(
          "LIFE",
          "Tes 5 Tournants du jour t'attendent.",
        );
      }
    },
    60 * 1000,
  );
  return () => clearInterval(timer);
}
