
CREATE TABLE public.user (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  places ARRAY NOT NULL DEFAULT '{}'::smallint[],
  places_radius smallint NOT NULL DEFAULT '10'::smallint,
  max_daily_invites smallint NOT NULL DEFAULT '10'::smallint,
  friends_only boolean NOT NULL DEFAULT false,
  age_range ARRAY NOT NULL DEFAULT '{18,99}'::smallint[],
  party_size smallint NOT NULL DEFAULT '10'::smallint,
  availability ARRAY NOT NULL DEFAULT '{{0,24},{0,24},{0,24},{0,24},{0,24},{0,24},{0,24}}'::json[],
  CONSTRAINT user_pkey PRIMARY KEY (id)
);