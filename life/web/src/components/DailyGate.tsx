import { useEffect, useState } from "react";
import { activerNotifications, pushSupporte } from "../push";
import { acheterTournants } from "../api";

function prochainMinuitUtc(): Date {
  const d = new Date();
  d.setUTCHours(24, 0, 0, 0);
  return d;
}

function formatCompteARebours(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

interface Props {
  onRafraichir: () => void;
  playerId?: string;
  pushActif?: boolean;
  boutiqueActif?: boolean;
  /** Appelé après un achat réussi pour recharger l'état et relancer le jeu. */
  onAchat?: () => void;
}

/** Écran de fin de journée : compte à rebours jusqu'au reset (brief §6). */
export function DailyGate({ onRafraichir, playerId, pushActif, boutiqueActif, onAchat }: Props) {
  const [restant, setRestant] = useState(() => prochainMinuitUtc().getTime() - Date.now());
  const [etatPush, setEtatPush] = useState<"idle" | "en_cours" | "ok" | "echec">("idle");
  const [achatEnCours, setAchatEnCours] = useState(false);

  const acheter = async () => {
    if (!playerId || achatEnCours) return;
    setAchatEnCours(true);
    try {
      await acheterTournants(playerId);
      onAchat?.();
    } catch {
      setAchatEnCours(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = prochainMinuitUtc().getTime() - Date.now();
      setRestant(ms);
      if (ms <= 0) onRafraichir();
    }, 1000);
    return () => clearInterval(timer);
  }, [onRafraichir]);

  const activer = async () => {
    if (!playerId) return;
    setEtatPush("en_cours");
    const ok = await activerNotifications(playerId);
    setEtatPush(ok ? "ok" : "echec");
  };

  const montrerBouton = pushActif && pushSupporte() && playerId;

  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
      <p className="text-4xl">🌙</p>
      <h2 className="text-xl font-bold">Tes 5 Tournants du jour sont épuisés</h2>
      <p className="text-sm text-zinc-400">
        La vie reprend son cours demain. Reviens dans :
      </p>
      <p className="font-mono text-3xl tabular-nums">{formatCompteARebours(restant)}</p>
      <p className="max-w-xs text-xs text-zinc-600">
        Pas de grind possible : une vie se déguste par petites gorgées quotidiennes.
      </p>

      {boutiqueActif && playerId && (
        <button
          onClick={() => void acheter()}
          disabled={achatEnCours}
          className="mt-2 rounded-xl bg-amber-500 px-5 py-3 font-semibold text-zinc-900 transition active:scale-95 disabled:opacity-50"
        >
          {achatEnCours ? "…" : "Débloquer 5 Tournants de plus"}
        </button>
      )}

      {montrerBouton && etatPush !== "ok" && (
        <button
          onClick={() => void activer()}
          disabled={etatPush === "en_cours"}
          className="mt-2 rounded-xl border border-zinc-600 px-4 py-2 text-sm transition active:scale-95 disabled:opacity-50"
        >
          {etatPush === "en_cours" ? "Activation…" : "Me prévenir au reset 🌅"}
        </button>
      )}
      {etatPush === "ok" && <p className="text-xs text-emerald-400">Notifications activées ✓</p>}
      {etatPush === "echec" && (
        <p className="text-xs text-zinc-500">Notifications indisponibles sur cet appareil.</p>
      )}
    </div>
  );
}
