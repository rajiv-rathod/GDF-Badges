-- Patch for projects that already ran the original 0001_init.sql.
-- Run this ONCE in the Supabase SQL editor. It:
--   1. FIXES SIGNUP — the original handle_new_user() called gen_random_bytes(),
--      which lives in Supabase's "extensions" schema and is invisible to the
--      function's search_path, so every signup failed with a database error.
--   2. Removes the meetings table (video now runs in the external GDF meeting
--      app at meet.apextech.llc).

drop table if exists public.meetings cascade;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  -- built-ins only: extension functions (pgcrypto) live in Supabase's
  -- "extensions" schema, which this function's search_path does not include
  v_slug := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g')
            || '-' || substr(md5(random()::text || clock_timestamp()::text), 1, 6);
  insert into public.profiles (id, full_name, email, role, public_slug)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email,
    case when new.raw_user_meta_data ->> 'role' = 'organizer' then 'organizer' else 'member' end,
    v_slug
  );
  perform public.claim_pending_credentials(new.email, new.id);
  return new;
end;
$$;
