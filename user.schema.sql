create table public.user (
  id uuid not null default gen_random_uuid (),
  places smallint[] not null default '{}'::smallint[],
  places_radius smallint not null default '10'::smallint,
  max_daily_invites smallint not null default '10'::smallint,
  friends_only boolean not null default false,
  age_range smallint[] not null default '{18,99}'::smallint[],
  party_size smallint not null default '10'::smallint,
  constraint user_pkey primary key (id)
) TABLESPACE pg_default;