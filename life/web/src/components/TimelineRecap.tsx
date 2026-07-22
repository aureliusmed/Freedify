import type { HistoriqueTournant } from "@life/shared";

/** Historique scrollable des Tournants de la run en cours (brief §6). */
export function TimelineRecap({
  historique,
  onFermer,
}: {
  historique: HistoriqueTournant[];
  onFermer: () => void;
}) {
  return (
    <div className="fixed inset-0 z-20 flex flex-col bg-zinc-950/95 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Ta vie jusqu'ici</h2>
        <button onClick={onFermer} className="rounded-lg bg-zinc-800 px-3 py-1 text-sm">
          Fermer
        </button>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto pb-8">
        {historique.length === 0 && (
          <p className="text-sm text-zinc-500">Rien encore. Tout reste à vivre.</p>
        )}
        {[...historique].reverse().map((h, i) => (
          <div key={`${h.id}-${i}`} className="rounded-xl border border-zinc-800 bg-zinc-900 p-4">
            <p className="text-xs text-zinc-500">{h.age} ans</p>
            <p className="mt-1 text-sm">{h.resume}</p>
            <p className="mt-2 text-xs text-zinc-400">→ {h.choix_fait}</p>
            <p className="mt-1 text-xs italic text-zinc-500">{h.resultat}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
