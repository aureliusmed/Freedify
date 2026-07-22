import { useCallback, useState } from "react";
import type { BilanDeVie } from "@life/shared";

interface Props {
  bilan: BilanDeVie;
  onRejouer: () => void;
}

type FormatPartage = "story" | "post";

/** Dessine le bilan dans un canvas au format demandé et retourne un blob PNG.
 *  story = 1080×1920 (9:16), post = 1080×1080 (1:1) avec polices réduites. */
async function rendreImageBilan(bilan: BilanDeVie, format: FormatPartage): Promise<Blob> {
  const largeur = 1080;
  const hauteur = format === "story" ? 1920 : 1080;
  const echelle = format === "story" ? 1 : 0.8; // post : ~20 % plus petit
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

  ctx.textAlign = "center";
  const marge = 80 * echelle;

  // Écrit un paragraphe centré avec retour à la ligne ; tronque au-delà de
  // maxLignes (« … »). Retourne le y après le dernier bloc écrit.
  const dessinerParagraphe = (
    texte: string,
    y: number,
    taille: number,
    couleur: string,
    gras = false,
    maxLignes = Infinity,
  ): number => {
    ctx.fillStyle = couleur;
    ctx.font = `${gras ? "bold " : ""}${taille}px system-ui, sans-serif`;
    const mots = texte.split(" ");
    const lignes: string[] = [];
    let ligne = "";
    for (const mot of mots) {
      const test = ligne ? `${ligne} ${mot}` : mot;
      if (ctx.measureText(test).width > largeur - 2 * marge && ligne) {
        lignes.push(ligne);
        ligne = mot;
      } else {
        ligne = test;
      }
    }
    if (ligne) lignes.push(ligne);

    const visibles = lignes.slice(0, maxLignes);
    if (lignes.length > maxLignes && visibles.length > 0) {
      visibles[visibles.length - 1] = visibles[visibles.length - 1]!.replace(/\.*$/, "") + "…";
    }
    let yCourant = y;
    for (const l of visibles) {
      ctx.fillText(l, largeur / 2, yCourant);
      yCourant += taille * 1.35;
    }
    return yCourant;
  };

  const yTitre = format === "story" ? 220 : 150;
  dessinerParagraphe("LIFE", yTitre, 88 * echelle, "#f4f4f5", true);
  dessinerParagraphe(sombre ? "🪦" : "🌅", yTitre + 160 * echelle, 60 * echelle, "#f4f4f5");

  let y = format === "story" ? 520 : 380;
  // Le format post est plus court : on borne le nombre de lignes pour éviter
  // tout débordement sur un bilan long.
  y = dessinerParagraphe(bilan.titre, y, 64 * echelle, "#f4f4f5", true, format === "post" ? 3 : 4);
  y = dessinerParagraphe(
    bilan.texte,
    y + 60 * echelle,
    44 * echelle,
    "#d4d4d8",
    false,
    format === "post" ? 6 : 12,
  );
  dessinerParagraphe(
    bilan.stat_marquante,
    y + 60 * echelle,
    40 * echelle,
    sombre ? "#fda4af" : "#6ee7b7",
    true,
    format === "post" ? 3 : 5,
  );
  dessinerParagraphe(
    `Une vie de ${bilan.age_final} ans · joue ta vie sur LIFE`,
    hauteur - marge - 20,
    36 * echelle,
    "#71717a",
  );

  return new Promise((resolve) => canvas.toBlob((b) => resolve(b!), "image/png"));
}

function texteBilan(bilan: BilanDeVie): string {
  return `« ${bilan.titre} » — ${bilan.texte} (${bilan.stat_marquante}) · joue ta vie sur LIFE`;
}

/** Bilan de fin de vie + partage natif (Web Share API, fallback téléchargement). */
export function EndOfLifeScreen({ bilan, onRejouer }: Props) {
  const [copie, setCopie] = useState(false);

  const partager = useCallback(
    async (format: FormatPartage) => {
      const blob = await rendreImageBilan(bilan, format);
      const fichier = new File([blob], `life-bilan-${format}.png`, { type: "image/png" });
      if (navigator.canShare?.({ files: [fichier] })) {
        await navigator.share({ files: [fichier], title: "Mon bilan de vie — LIFE" }).catch(() => {});
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fichier.name;
        a.click();
        URL.revokeObjectURL(url);
      }
    },
    [bilan],
  );

  const copierTexte = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(texteBilan(bilan));
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      /* presse-papier indisponible : on ignore silencieusement */
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
          onClick={() => void partager("story")}
          className="rounded-xl bg-zinc-100 py-3 font-semibold text-zinc-900 transition active:scale-95"
        >
          Partager (story 9:16)
        </button>
        <button
          onClick={() => void partager("post")}
          className="rounded-xl border border-zinc-400 py-3 font-semibold transition active:scale-95"
        >
          Partager (post 1:1)
        </button>
        <button
          onClick={() => void copierTexte()}
          className="rounded-xl border border-zinc-700 py-3 text-sm transition active:scale-95"
        >
          {copie ? "Copié !" : "Copier le texte"}
        </button>
        <button
          onClick={onRejouer}
          className="mt-2 rounded-xl border border-zinc-800 py-3 text-sm text-zinc-400 transition active:scale-95"
        >
          Revivre (nouvelle vie)
        </button>
      </div>
    </div>
  );
}
