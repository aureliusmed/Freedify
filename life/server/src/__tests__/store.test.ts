import { afterAll, describe, expect, it } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { FichierStore } from "../store.js";
import { nouvelleVie } from "../engine/etat.js";

/**
 * Contrat de l'interface `Store` (ADR-006), vérifié sur FichierStore. La même
 * suite s'appliquerait à SupabaseStore, mais celui-ci n'est pas testé en réseau
 * ici (il partage l'interface et la validation de player_id).
 */
describe("Store (contrat, sur FichierStore)", () => {
  let dossier: string;

  const store = async () => {
    dossier = await mkdtemp(path.join(tmpdir(), "life-store-"));
    return new FichierStore(dossier);
  };

  afterAll(async () => {
    if (dossier) await rm(dossier, { recursive: true, force: true });
  });

  it("retourne null pour un joueur inexistant", async () => {
    const s = await store();
    expect(await s.get("inexistant")).toBeNull();
  });

  it("persiste puis relit un état identique", async () => {
    const s = await store();
    const etat = nouvelleVie("joueur-test");
    etat.age = 42;
    etat.flags_narratifs.push("ruine");
    await s.put(etat);
    const relu = await s.get("joueur-test");
    expect(relu).toEqual(etat);
  });

  it("rejette un player_id invalide au put", async () => {
    const s = await store();
    const etat = nouvelleVie("ok");
    etat.player_id = "id/invalide!";
    await expect(s.put(etat)).rejects.toThrow();
  });

  it("relit depuis le disque via une nouvelle instance (pas seulement le cache)", async () => {
    const s = await store();
    const etat = nouvelleVie("persistant");
    await s.put(etat);
    const s2 = new FichierStore(dossier);
    expect(await s2.get("persistant")).toEqual(etat);
  });
});
