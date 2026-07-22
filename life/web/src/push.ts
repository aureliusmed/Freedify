/**
 * Abonnement aux notifications push côté client (brief §6). Le serveur expose
 * sa clé publique VAPID sur /api/push/cle ; si le push n'est pas configuré
 * (503/erreur), tout est inerte et le bouton d'activation reste masqué.
 */

function base64UrlVersUint8(base64: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(b64);
  const buffer = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) buffer[i] = raw.charCodeAt(i);
  return buffer;
}

export function pushSupporte(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

async function clePublique(): Promise<string | null> {
  try {
    const res = await fetch("/api/push/cle");
    if (!res.ok) return null;
    const data = (await res.json()) as { publicKey?: string };
    return data.publicKey ?? null;
  } catch {
    return null;
  }
}

/** Demande la permission, s'abonne et enregistre l'abonnement côté serveur.
 *  Retourne true si l'abonnement a réussi. */
export async function activerNotifications(playerId: string): Promise<boolean> {
  if (!pushSupporte()) return false;
  const cle = await clePublique();
  if (!cle) return false;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") return false;

  const registration = await navigator.serviceWorker.ready;
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlVersUint8(cle),
  });

  const res = await fetch("/api/push/abonner", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ player_id: playerId, subscription }),
  });
  return res.ok;
}
