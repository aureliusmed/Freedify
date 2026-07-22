import { useEffect, useState } from "react";

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

/** Écran de fin de journée : compte à rebours jusqu'au reset (brief §6). */
export function DailyGate({ onRafraichir }: { onRafraichir: () => void }) {
  const [restant, setRestant] = useState(() => prochainMinuitUtc().getTime() - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const ms = prochainMinuitUtc().getTime() - Date.now();
      setRestant(ms);
      if (ms <= 0) onRafraichir();
    }, 1000);
    return () => clearInterval(timer);
  }, [onRafraichir]);

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
    </div>
  );
}
