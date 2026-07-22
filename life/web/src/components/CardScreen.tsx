import { useRef, useState } from "react";
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

const SEUIL_SWIPE = 90; // px de déplacement pour valider un choix par swipe

/** Carte plein écran : situation + 2-4 choix, puis résultat immédiat (brief §3).
 *  Cartes à 2 choix : swipe gauche (choix 1) / droite (choix 2), tap toujours dispo. */
export function CardScreen({ tournant, age, phaseLabel, onChoix, resultat, onSuivant }: Props) {
  const [enCours, setEnCours] = useState<string | null>(null);
  const [dx, setDx] = useState(0);
  const [drague, setDrague] = useState(false);
  const origineX = useRef<number | null>(null);

  const swipeActif = tournant.choix.length === 2 && !resultat && !enCours;

  const choisir = async (id: string) => {
    if (enCours || resultat) return;
    setEnCours(id);
    try {
      await onChoix(id);
    } finally {
      setEnCours(null);
      setDx(0);
      setDrague(false);
      origineX.current = null;
    }
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (!swipeActif) return;
    origineX.current = e.clientX;
    setDrague(true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drague || origineX.current === null) return;
    setDx(e.clientX - origineX.current);
  };

  const finDrag = () => {
    if (!drague) return;
    if (dx <= -SEUIL_SWIPE) {
      void choisir(tournant.choix[0]!.id); // swipe gauche → premier choix
    } else if (dx >= SEUIL_SWIPE) {
      void choisir(tournant.choix[1]!.id); // swipe droite → second choix
    } else {
      setDx(0); // retour élastique
    }
    setDrague(false);
    origineX.current = null;
  };

  // Intensité (0..1) du côté vers lequel on penche, pour la surimpression.
  const intensiteGauche = dx < 0 ? Math.min(1, -dx / SEUIL_SWIPE) : 0;
  const intensiteDroite = dx > 0 ? Math.min(1, dx / SEUIL_SWIPE) : 0;

  return (
    <div
      className="relative flex h-full flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-2xl"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={finDrag}
      onPointerCancel={finDrag}
      style={{
        touchAction: "pan-y",
        transform: dx !== 0 ? `translateX(${dx}px) rotate(${dx / 30}deg)` : undefined,
        transition: drague ? "none" : "transform 0.25s ease",
      }}
    >
      {swipeActif && intensiteGauche > 0 && (
        <div
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-500 bg-zinc-800 px-3 py-2 text-sm"
          style={{ opacity: intensiteGauche }}
        >
          ← {tournant.choix[0]!.texte}
        </div>
      )}
      {swipeActif && intensiteDroite > 0 && (
        <div
          className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rounded-lg border border-zinc-500 bg-zinc-800 px-3 py-2 text-right text-sm"
          style={{ opacity: intensiteDroite }}
        >
          {tournant.choix[1]!.texte} →
        </div>
      )}

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
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => void choisir(c.id)}
              className={`rounded-xl border border-zinc-700 bg-zinc-800/60 p-4 text-left text-sm transition active:scale-95 hover:border-zinc-500 disabled:opacity-50 ${
                enCours === c.id ? "animate-pulse border-zinc-400" : ""
              }`}
            >
              {c.texte}
            </button>
          ))}
          {swipeActif && (
            <p className="text-center text-xs text-zinc-600">← ou → pour choisir</p>
          )}
        </div>
      )}
    </div>
  );
}
