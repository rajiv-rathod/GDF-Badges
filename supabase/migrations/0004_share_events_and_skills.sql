-- Optional enhancement migration. The app works WITHOUT this (skills, evidence,
-- and expiry live inside the already-signed fields_json; share logging fails
-- silently until this runs). Apply when you have SQL access to enable
-- server-side share counting in issuer analytics.

-- 1. Allow the 'shared' credential event (issuer analytics: issued→claimed→shared→viewed)
alter table public.credential_events drop constraint if exists credential_events_event_check;
alter table public.credential_events
  add constraint credential_events_event_check
  check (event in ('created', 'claimed', 'revoked', 'viewed', 'shared'));

-- 2. Skills wallet: aggregate the skills across a member's public, claimed
--    credentials (skills are stored comma-separated in fields_json.skills).
create or replace function public.get_profile_skills(p_slug text)
returns text[] language sql stable security definer set search_path = public as $$
  select coalesce(array_agg(distinct trim(s)) filter (where trim(s) <> ''), '{}')
  from public.profiles p
  join public.credentials c on c.recipient_user_id = p.id and c.is_public and c.status = 'claimed'
  cross join lateral unnest(string_to_array(coalesce(c.fields_json ->> 'skills', ''), ',')) as s
  where p.public_slug = p_slug;
$$;
revoke execute on function public.get_profile_skills(text) from anon, authenticated;
