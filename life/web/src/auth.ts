import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

/**
 * Auth optionnelle côté client (brief §6). Activée seulement si
 * VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY sont fournis (fichier
 * `.env.local`, jamais commité). Sans configuration, `authDisponible()`
 * renvoie false et l'app reste 100 % anonyme (id localStorage).
 */

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const client: SupabaseClient | null = url && anonKey ? createClient(url, anonKey) : null;

export function authDisponible(): boolean {
  return client !== null;
}

export async function utilisateurCourant(): Promise<User | null> {
  if (!client) return null;
  const { data } = await client.auth.getUser();
  return data.user ?? null;
}

/** Token d'accès courant à joindre aux appels API (null si non connecté). */
export async function tokenAcces(): Promise<string | null> {
  if (!client) return null;
  const { data } = await client.auth.getSession();
  return data.session?.access_token ?? null;
}

export async function connexionGoogle(): Promise<void> {
  if (!client) return;
  await client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: window.location.origin },
  });
}

export async function deconnexion(): Promise<void> {
  if (!client) return;
  await client.auth.signOut();
}

/** S'abonne aux changements de session ; retourne une fonction de désabonnement. */
export function surChangementAuth(cb: (user: User | null) => void): () => void {
  if (!client) return () => {};
  const { data } = client.auth.onAuthStateChange((_event, session) => {
    cb(session?.user ?? null);
  });
  return () => data.subscription.unsubscribe();
}
