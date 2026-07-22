import { useState } from "react";
import type { Impact, Tournant } from "@life/shared";

interface Props {
  tournant: Tournant;
  age: number;
  phaseLabel: string;
  onChoix: (choixId: string) => Promise<void>;
  resultat: { texte: string; impacts: Impact; issue: string } | null;
  onSuivant: () => void;
}

function iconeImpact(impacts: Impact): string {
  const total = Object.values(impacts).reduce((a, b) => a + (b ?? 0), 0);
  if (total > 3) return "📈";
  if (total < -3) return "📉";
  return "➖";
}

/** Carte plein écran : situation + 2-4 choix, puis résultat immédiat (brief §3). */
export function CardScreen({ tournant, age, phaseLabel, onChoix, resultat, onSuivant }: Props) {
  const [enCours, setEnCours] = useState<string | null>(null);

  const choisir = async (id: string) => {
    if (enCours || resultat) return;
    setEnCours(id);
    try {
      await onChoix(id);
    } finally {
      setEnCours(null);
    }
  };

  return (
    <div className="flex h-full flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl">
      <div>
        <p className="text-xs uppercase tracking-widest text-zinc-500">
          {age} ans · {phaseLabel}
        </p>
        <p className="mt-4 text-lg leading-relaxed">{tournant.situation}</p>
      </div>

      {resultat ? (
        <div className="mt-6">
          <div
            className={`rounded-xl border p-4 ${
              resultat.issue === "bonne"
                ? "border-emerald-700 bg-emerald-950/40"
                : resultat.issue === "mauvaise"
                  ? "border-rose-800 bg-rose-950/40"
                  : "border-zinc-700 bg-zinc-800/40"
            }`}
          >
            <p className="text-sm leading-relaxed">{resultat.texte}</p>
            <p className="mt-2 text-xl">{iconeImpact(resultat.impacts)}</p>
          </div>
          <button
            onClick={onSuivant}
            className="mt-4 w-full rounded-xl bg-zinc-100 py-3 font-semibold text-zinc-900 transition active:scale-95"
          >
            Continuer
          </button>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-3">
          {tournant.choix.map((c) => (
            <button
              key={c.id}
              disabled={!!enCours}
              onClick={() => void choisir(c.id)}
              className={`rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 text-left text-sm transition active:scale-95 hover:border-zinc-500 disabled:opacity-50 ${
                enCours === c.id ? "animate-pulse border-zinc-400" : ""
              }`}
            >
              {c.texte}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
