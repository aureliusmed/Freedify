import type { Stats, StatKey } from "@life/shared";

const ICONES: Record<StatKey, { icone: string; label: string }> = {
  sante: { icone: "❤️", label: "Santé" },
  richesse: { icone: "💰", label: "Richesse" },
  capital_social: { icone: "👥", label: "Capital social" },
  moralite: { icone: "⚖️", label: "Moralité" },
  tonalite: { icone: "🎭", label: "Tonalité" },
  chance: { icone: "🍀", label: "Chance" },
};

/** Barre discrète : icônes + jauge à 5 crans, jamais de chiffres bruts (brief §3). */
export function StatsBar({ stats }: { stats: Stats }) {
  return (
    <div className="flex justify-center gap-3 py-2 select-none">
      {(Object.keys(ICONES) as StatKey[]).map((key) => {
        const crans = Math.round(stats[key] / 20); // 0..5
        return (
          <div key={key} className="flex flex-col items-center" title={ICONES[key].label}>
            <span className="text-sm">{ICONES[key].icone}</span>
            <div className="mt-0.5 flex gap-[2px]">
              {[1, 2, 3, 4, 5].map((n) => (
                <span
                  key={n}
                  className={`h-1 w-1 rounded-full ${n <= crans ? "bg-emerald-400" : "bg-zinc-700"}`}
                />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
