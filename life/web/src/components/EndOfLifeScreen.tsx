import { useCallback } from "react";
import type { BilanDeVie } from "@life/shared";

interface Props {
  bilan: BilanDeVie;
  onRejouer: () => void;
}

/** Dessine le bilan au format story 9:16 dans un canvas et retourne un blob PNG. */
async function rendreImageBilan(bilan: BilanDeVie): Promise<Blob> {
  const largeur = 1080;
  const hauteur = 1920;
  const canvas = document.createElement("canvas");
  canvas.width = largeur;
  canvas.height = hauteur;
  const ctx = canvas.getContext("2d")!;

  const sombre = bilan.tonalite_finale < 40;
  const degrade = ctx.createLinearGradient(0, 0, 0, hauteur);
  degrade.addColorStop(0, sombre ? "#18181b" : "#1e293b");
  degrade.addColorStop(1, sombre ? "#09090b" : "#0f172a");
  ctx.fillStyle = degrade;
  ctx.fillRect(0, 0, largeur, hauteur);

  ctx.fillStyle = "#f4f4f5";
  ctx.textAlign = "center";
  ctx.font = "bold 88px system-ui, sans-serif";
  ctx.fillText("LIFE", largeur / 2, 220);

  ctx.font = "60px system-ui, sans-serif";
  ctx.fillText(sombre ? "🪦" : "🌅", largeur / 2, 360);

  const dessinerParagraphe = (texte: string, y: number, taille: number, gras = false): number => {
    ctx.font = `${gras ? "bold " : ""}${taille}px system-ui, sans-serif`;
    const mots = texte.split(" ");
    let ligne = "";
    let yCourant = y;
    for (const mot of mots) {
      const test = ligne ? `${ligne} ${mot}` : mot;
      if (ctx.measureText(test).width > largeur - 160) {
        ctx.fillText(ligne, largeur / 2, yCourant);
        ligne = mot;
        yCourant += taille * 1.35;
      } else {
        ligne = test;
      }
    }
    if (ligne) ctx.fillText(ligne, largeur / 2, yCourant);
    return yCourant + taille * 1.35;
  };

  let y = dessinerParagraphe(bilan.titre, 520, 64, true);
  ctx.fillStyle = "#d4d4d8";
  y = dessinerParagraphe(bilan.texte, y + 60, 44);
  ctx.fillStyle = sombre ? "#fda4af" : "#6ee7b7";
  y = dessinerParagraphe(bilan.stat_marquante, y + 80, 40, true);
  ctx.fillStyle = "#71717a";
  dessinerParagraphe(`Une vie de ${bilan.age_final} ans · joue ta vie sur LIFE`, hauteur - 140, 36);

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

/** Bilan de fin de vie + partage natif (Web Share API, fallback téléchargement). */
export function EndOfLifeScreen({ bilan, onRejouer }: Props) {
  const partager = useCallback(async () => {
    const blob = await rendreImageBilan(bilan);
    const fichier = new File([blob], "life-bilan.png", { type: "image/png" });
    if (navigator.canShare?.({ files: [fichier] })) {
      await navigator.share({ files: [fichier], title: "Mon bilan de vie — LIFE" }).catch(() => {});
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "life-bilan.png";
      a.click();
      URL.revokeObjectURL(url);
    }
  }, [bilan]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-5 p-6 text-center">
      <p className="text-5xl">{bilan.tonalite_finale < 40 ? "🪦" : "🌅"}</p>
      <h2 className="text-2xl font-bold">{bilan.titre}</h2>
      <p className="max-w-md text-sm leading-relaxed text-zinc-300">{bilan.texte}</p>
      <p className="max-w-md text-sm font-semibold text-emerald-300">{bilan.stat_marquante}</p>
      <p className="text-xs text-zinc-500">Mort·e à {bilan.age_final} ans</p>

      <div className="mt-4 flex w-full max-w-xs flex-col gap-3">
        <button
          onClick={() => void partager()}
          className="rounded-xl bg-zinc-100 py-3 font-semibold text-zinc-900 transition active:scale-95"
        >
          Partager mon bilan
        </button>
        <button
          onClick={onRejouer}
          className="rounded-xl border border-zinc-700 py-3 text-sm transition active:scale-95"
        >
          Revivre (nouvelle vie)
        </button>
      </div>
    </div>
  );
}
