create table public.user (
  id uuid not null default gen_random_uuid (),
  places smallint[] null default '{}'::smallint[],
  places_radius smallint null default 10,
  daily_invite_limit smallint null default 10,
  friends_only boolean[] not null default array[false, false]::boolean[],
  constraint user_pkey primary key (id)
) TABLESPACE pg_default;