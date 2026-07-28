-- Organizer identity gate: conferences must be listed on MyMUN (mymun.com).
-- We store the validated MyMUN conference URL as proof of identity. There is
-- no manual approval step — a valid link lets the organizer proceed.
alter table public.organizations
  add column if not exists mymun_url text;

comment on column public.organizations.mymun_url is
  'Validated public MyMUN (mymun.com) conference link proving the org is a real conference.';

-- Super-admin panel is locked to a single account (also enforced in code).
insert into public.app_config (key, value)
values ('admin_emails', 'rajiv@gdf.social')
on conflict (key) do update set value = excluded.value;
