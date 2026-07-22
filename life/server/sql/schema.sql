-- Schéma Supabase/Postgres pour LIFE (brief §6).
-- L'état de vie complet reste un document JSON (même modèle que le store
-- fichier) — pas de normalisation en colonnes à ce stade.

create table if not exists vies (
  player_id text primary key,
  etat jsonb not null,
  updated_at timestamptz not null default now()
);
