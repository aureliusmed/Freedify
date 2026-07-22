import { useCallback, useEffect, useState } from "react";
import type { BilanDeVie, EtatDeVie, Impact, Tournant } from "@life/shared";
import { infoPhase } from "@life/shared";
import {
  ApiError,
  adopterVie,
  chargerVie,
  genererBilan,
  genererTournant,
  memoriserPlayerId,
  nouvelleVie,
  playerIdLocal,
  resoudreTournant,
} from "./api";
import {
  authDisponible,
  connexionGoogle,
  deconnexion,
  surChangementAuth,
  utilisateurCourant,
} from "./auth";
import { CardScreen } from "./components/CardScreen";
import { StatsBar } from "./components/StatsBar";
import { TimelineRecap } from "./components/TimelineRecap";
import { DailyGate } from "./components/DailyGate";
import { EndOfLifeScreen } from "./components/EndOfLifeScreen";

type Ecran = "chargement" | "jeu" | "quota" | "bilan" | "erreur";

interface Resultat {
  texte: string;
  impacts: Impact;
  issue: string;
}

export default function App() {
  const [etat, setEtat] = useState<EtatDeVie | null>(null);
  const [tournant, setTournant] = useState<Tournant | null>(null);
  const [resultat, setResultat] = useState<Resultat | null>(null);
  const [bilan, setBilan] = useState<BilanDeVie | null>(null);
  const [ecran, setEcran] = useState<Ecran>("chargement");
  const [timelineOuverte, setTimelineOuverte] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [connecte, setConnecte] = useState(false);
  const [pushActif, setPushActif] = useState(false);
  const [boutiqueActif, setBoutiqueActif] = useState(false);

  const chargerCarte = useCallback(async (playerId: string) => {
    try {
      const { tournant } = await genererTournant(playerId);
      setTournant(tournant);
      setResultat(null);
      setEcran("jeu");
    } catch (e) {
      if (e instanceof ApiError && e.code === "QUOTA") {
        setEcran("quota");
      } else if (e instanceof ApiError && e.code === "MORT") {
        const { bilan } = await genererBilan(playerId);
        setBilan(bilan);
        setEcran("bilan");
      } else {
        setErreur(e instanceof Error ? e.message : "erreur inconnue");
        setEcran("erreur");
      }
    }
  }, []);

  // idForce : impose l'id du compte authentifié (sinon reprend l'id local anonyme).
  const demarrer = useCallback(
    async (idForce?: string) => {
      setEcran("chargement");
      try {
        const idCible = idForce ?? playerIdLocal();
        let vie: EtatDeVie;
        if (idCible) {
          try {
            vie = (await chargerVie(idCible)).etat;
          } catch {
            vie = (await nouvelleVie(idForce)).etat;
          }
        } else {
          vie = (await nouvelleVie()).etat;
        }
        memoriserPlayerId(vie.player_id);
        setEtat(vie);
        if (!vie.vivant) {
          const { bilan } = await genererBilan(vie.player_id);
          setBilan(bilan);
          setEcran("bilan");
          return;
        }
        await chargerCarte(vie.player_id);
      } catch (e) {
        setErreur(e instanceof Error ? e.message : "serveur injoignable");
        setEcran("erreur");
      }
    },
    [chargerCarte],
  );

  useEffect(() => {
    void demarrer();
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    // Disponibilité du push côté serveur (masque le bouton si non configuré).
    void fetch("/api/sante")
      .then((r) => r.json())
      .then((d: { push?: boolean; boutique?: boolean }) => {
        setPushActif(!!d.push);
        setBoutiqueActif(!!d.boutique);
      })
      .catch(() => {});
  }, [demarrer]);

  // Auth optionnelle (brief §6) : à la connexion, on adopte la vie anonyme
  // vers le compte (une seule fois) puis on redémarre sur l'id du compte.
  useEffect(() => {
    if (!authDisponible()) return;
    void utilisateurCourant().then((u) => setConnecte(!!u));
    const off = surChangementAuth(async (u) => {
      setConnecte(!!u);
      if (!u) return;
      const ancienLocal = playerIdLocal();
      if (ancienLocal && ancienLocal !== u.id) {
        await adopterVie(ancienLocal).catch(() => {});
      }
      memoriserPlayerId(u.id);
      void demarrer(u.id);
    });
    return off;
  }, [demarrer]);

  const faireChoix = useCallback(
    async (choixId: string) => {
      if (!etat || !tournant) return;
      const rep = await resoudreTournant(etat.player_id, tournant.tournant_id, choixId);
      setEtat(rep.etat);
      setResultat({ texte: rep.resultat, impacts: rep.impacts_finaux, issue: rep.issue });
    },
    [etat, tournant],
  );

  const suivant = useCallback(async () => {
    if (!etat) return;
    if (!etat.vivant) {
      const { bilan } = await genererBilan(etat.player_id);
      setBilan(bilan);
      setEcran("bilan");
      return;
    }
    if (etat.tournants_restants_aujourdhui <= 0) {
      setEcran("quota");
      return;
    }
    setEcran("chargement");
    await chargerCarte(etat.player_id);
  }, [etat, chargerCarte]);

  const rejouer = useCallback(async () => {
    if (!etat) return;
    setEcran("chargement");
    const { etat: vie } = await nouvelleVie(etat.player_id);
    setEtat(vie);
    setBilan(null);
    await chargerCarte(vie.player_id);
  }, [etat, chargerCarte]);

  return (
    <div className="mx-auto flex h-full max-w-md flex-col p-4">
      <header className="flex items-center justify-between py-2">
        <h1 className="text-lg font-black tracking-widest">LIFE</h1>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          {etat && ecran !== "bilan" && (
            <>
              <span>
                {etat.tournants_restants_aujourdhui} / 5 aujourd'hui
                {etat.tournants_bonus > 0 ? ` (+${etat.tournants_bonus} bonus)` : ""}
              </span>
              <button
                onClick={() => setTimelineOuverte(true)}
                className="rounded-lg bg-zinc-800 px-2 py-1"
              >
                📜
              </button>
            </>
          )}
          {authDisponible() &&
            (connecte ? (
              <button
                onClick={() => void deconnexion()}
                className="rounded-lg bg-zinc-800 px-2 py-1"
              >
                Déconnexion
              </button>
            ) : (
              <button
                onClick={() => void connexionGoogle()}
                className="rounded-lg bg-zinc-100 px-2 py-1 text-zinc-900"
              >
                Se connecter
              </button>
            ))}
        </div>
      </header>

      {etat && ecran !== "bilan" && <StatsBar stats={etat.stats} />}

      <main className="flex-1 py-2">
        {ecran === "chargement" && (
          <div className="flex h-full items-center justify-center">
            <p className="animate-pulse text-sm text-zinc-500">La vie suit son cours…</p>
          </div>
        )}

        {ecran === "jeu" && etat && tournant && (
          <CardScreen
            tournant={tournant}
            age={etat.age}
            phaseLabel={infoPhase(etat.phase).label}
            onChoix={faireChoix}
            resultat={resultat}
            onSuivant={() => void suivant()}
          />
        )}

        {ecran === "quota" && (
          <DailyGate
            onRafraichir={() => void demarrer()}
            playerId={etat?.player_id}
            pushActif={pushActif}
            boutiqueActif={boutiqueActif}
            onAchat={() => void demarrer(etat?.player_id)}
          />
        )}

        {ecran === "bilan" && bilan && <EndOfLifeScreen bilan={bilan} onRejouer={() => void rejouer()} />}

        {ecran === "erreur" && (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-3xl">🫠</p>
            <p className="text-sm text-zinc-400">{erreur}</p>
            <button
              onClick={() => void demarrer()}
              className="rounded-xl bg-zinc-100 px-6 py-2 font-semibold text-zinc-900"
            >
              Réessayer
            </button>
          </div>
        )}
      </main>

      {timelineOuverte && etat && (
        <TimelineRecap historique={etat.historique_tournants} onFermer={() => setTimelineOuverte(false)} />
      )}
    </div>
  );
}
