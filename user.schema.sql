-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  places ARRAY DEFAULT '{}'::smallint[],
  places_radius smallint,
  CONSTRAINT user_pkey PRIMARY KEY (id)
);