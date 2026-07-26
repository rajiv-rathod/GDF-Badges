-- MUN CertView — full schema, RLS, and credential functions.
-- Apply with: supabase db push   (or paste into the Supabase SQL editor)

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null default '',
  email text not null,
  role text not null default 'member' check (role in ('member', 'organizer', 'admin')),
  public_slug text not null unique,
  avatar_url text,
  created_at timestamptz not null default now()
);

create table public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  brand_overrides jsonb,
  owner_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.org_members (
  org_id uuid not null references public.organizations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role_in_org text not null default 'staff' check (role_in_org in ('owner', 'admin', 'staff')),
  primary key (org_id, user_id)
);

create table public.badge_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations (id) on delete cascade, -- null = global GDF template
  name text not null,
  description text not null default '',
  image_url text not null,
  criteria text not null default '',
  created_at timestamptz not null default now()
);

create table public.certificate_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  background_url text not null default '',
  layout_json jsonb not null default '[]',
  page_size text not null default 'A4-landscape'
    check (page_size in ('A4-landscape', 'A4-portrait', 'letter-landscape', 'letter-portrait')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.credentials (
  id uuid primary key default gen_random_uuid(),
  type text not null check (type in ('badge', 'certificate')),
  org_id uuid not null references public.organizations (id) on delete cascade,
  template_id uuid not null,
  recipient_email text not null,
  recipient_user_id uuid references public.profiles (id),
  recipient_name text not null,
  fields_json jsonb not null default '{}',
  event_name text not null default '',
  issued_at timestamptz not null default now(),
  issued_by uuid not null references public.profiles (id),
  status text not null default 'issued' check (status in ('issued', 'claimed', 'revoked')),
  verification_code text not null unique,
  signature text not null,
  asset_url text,
  is_public boolean not null default false
);
create index credentials_recipient_email_idx on public.credentials (lower(recipient_email));
create index credentials_recipient_user_idx on public.credentials (recipient_user_id);
create index credentials_org_idx on public.credentials (org_id);

create table public.delegates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  email text not null,
  committee text not null default '',
  country_portfolio text not null default '',
  award text,
  created_at timestamptz not null default now()
);
create unique index delegates_org_email_idx on public.delegates (org_id, lower(email));

create table public.meetings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  room_name text not null,
  host_id uuid not null references public.profiles (id),
  scheduled_at timestamptz not null default now(),
  jwt_config jsonb,
  status text not null default 'scheduled' check (status in ('scheduled', 'live', 'ended')),
  created_at timestamptz not null default now()
);

create table public.credential_events (
  id uuid primary key default gen_random_uuid(),
  credential_id uuid not null references public.credentials (id) on delete cascade,
  event text not null check (event in ('created', 'claimed', 'revoked', 'viewed')),
  at timestamptz not null default now()
);
create index credential_events_credential_idx on public.credential_events (credential_id);

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_org_staff(p_org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.org_members
    where org_id = p_org and user_id = auth.uid()
  );
$$;

-- Claim-by-email: link every credential issued to this email to the user.
create or replace function public.claim_pending_credentials(p_email text, p_user uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare v_count integer;
begin
  with claimed as (
    update public.credentials
    set recipient_user_id = p_user, status = 'claimed'
    where lower(recipient_email) = lower(p_email)
      and recipient_user_id is null
      and status = 'issued'
    returning id
  )
  insert into public.credential_events (credential_id, event)
  select id, 'claimed' from claimed;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- RPC called by the apps after login.
create or replace function public.claim_my_credentials()
returns integer language plpgsql security definer set search_path = public as $$
begin
  return public.claim_pending_credentials(coalesce(auth.jwt() ->> 'email', ''), auth.uid());
end;
$$;

-- New auth user -> profile row + claim anything already issued to that email.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_slug text;
begin
  v_slug := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9]+', '-', 'g')
            || '-' || substr(encode(gen_random_bytes(3), 'hex'), 1, 6);
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
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Org creator automatically becomes an owner-member.
create or replace function public.handle_new_org()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.org_members (org_id, user_id, role_in_org)
  values (new.id, new.owner_id, 'owner')
  on conflict do nothing;
  return new;
end;
$$;
create trigger on_org_created
  after insert on public.organizations
  for each row execute function public.handle_new_org();

-- Public verify: fetch a credential by code (any status — the page shows
-- REVOKED loudly) and log a 'viewed' event. Security definer so anonymous
-- visitors can verify without opening the credentials table to enumeration.
create or replace function public.get_credential_by_code(p_code text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare v jsonb;
begin
  select jsonb_build_object(
    'id', c.id, 'type', c.type, 'org_id', c.org_id, 'template_id', c.template_id,
    'recipient_email', c.recipient_email, 'recipient_name', c.recipient_name,
    'fields_json', c.fields_json, 'event_name', c.event_name,
    'issued_at', to_char(c.issued_at at time zone 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'status', c.status, 'verification_code', c.verification_code,
    'signature', c.signature, 'asset_url', c.asset_url,
    'org_name', o.name, 'org_slug', o.slug,
    'template_name', coalesce(b.name, ct.name, c.type)
  )
  into v
  from public.credentials c
  join public.organizations o on o.id = c.org_id
  left join public.badge_templates b on b.id = c.template_id and c.type = 'badge'
  left join public.certificate_templates ct on ct.id = c.template_id and c.type = 'certificate'
  where c.verification_code = p_code;

  if v is not null then
    insert into public.credential_events (credential_id, event)
    values ((v ->> 'id')::uuid, 'viewed');
  end if;
  return v;
end;
$$;

-- Public profile: /u/{slug} — profile basics + their PUBLIC credentials only.
create or replace function public.get_public_profile(p_slug text)
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'full_name', p.full_name,
    'public_slug', p.public_slug,
    'avatar_url', p.avatar_url,
    'credentials', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', c.id, 'type', c.type, 'recipient_name', c.recipient_name,
        'event_name', c.event_name, 'issued_at', c.issued_at,
        'verification_code', c.verification_code, 'asset_url', c.asset_url,
        'org_name', o.name,
        'template_name', coalesce(b.name, ct.name, c.type),
        'template_image', b.image_url
      ) order by c.issued_at desc)
      from public.credentials c
      join public.organizations o on o.id = c.org_id
      left join public.badge_templates b on b.id = c.template_id and c.type = 'badge'
      left join public.certificate_templates ct on ct.id = c.template_id and c.type = 'certificate'
      where c.recipient_user_id = p.id and c.is_public and c.status = 'claimed'
    ), '[]'::jsonb)
  )
  from public.profiles p
  where p.public_slug = p_slug;
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.org_members enable row level security;
alter table public.badge_templates enable row level security;
alter table public.certificate_templates enable row level security;
alter table public.credentials enable row level security;
alter table public.delegates enable row level security;
alter table public.meetings enable row level security;
alter table public.credential_events enable row level security;

-- profiles: you see and edit yourself (public lookups go through the definer fn)
create policy "profiles self select" on public.profiles for select using (id = auth.uid());
create policy "profiles self update" on public.profiles for update using (id = auth.uid());

-- organizations: staff read; owner updates; any authenticated user may create
create policy "orgs staff select" on public.organizations for select using (public.is_org_staff(id));
create policy "orgs owner update" on public.organizations for update using (owner_id = auth.uid());
create policy "orgs insert own" on public.organizations for insert
  with check (auth.uid() is not null and owner_id = auth.uid());

-- org_members: visible to fellow staff; owners/admins manage
create policy "org members select" on public.org_members for select using (public.is_org_staff(org_id));
create policy "org members manage" on public.org_members for all using (
  exists (select 1 from public.org_members m
          where m.org_id = org_members.org_id and m.user_id = auth.uid()
            and m.role_in_org in ('owner', 'admin'))
);

-- badge templates: global ones visible to all signed-in users; org ones to staff
create policy "badge templates select" on public.badge_templates for select
  using (org_id is null or public.is_org_staff(org_id));
create policy "badge templates manage" on public.badge_templates for all
  using (org_id is not null and public.is_org_staff(org_id))
  with check (org_id is not null and public.is_org_staff(org_id));

-- certificate templates: org staff only
create policy "cert templates all" on public.certificate_templates for all
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));

-- credentials: recipients see their own (by user id or email); staff see org's.
-- All writes go through server routes using the service role — no client writes.
create policy "credentials recipient or staff select" on public.credentials for select using (
  recipient_user_id = auth.uid()
  or lower(recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  or public.is_org_staff(org_id)
);

-- delegates: org staff only
create policy "delegates all" on public.delegates for all
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));

-- meetings: staff manage; members with a credential from the org may view/join
create policy "meetings staff all" on public.meetings for all
  using (public.is_org_staff(org_id)) with check (public.is_org_staff(org_id));
create policy "meetings member select" on public.meetings for select using (
  exists (select 1 from public.credentials c
          where c.org_id = meetings.org_id
            and (c.recipient_user_id = auth.uid()
                 or lower(c.recipient_email) = lower(coalesce(auth.jwt() ->> 'email', ''))))
);

-- credential events: org staff read the audit log; writes via definer fns/service role
create policy "credential events staff select" on public.credential_events for select using (
  exists (select 1 from public.credentials c
          where c.id = credential_events.credential_id and public.is_org_staff(c.org_id))
);

-- ---------------------------------------------------------------------------
-- Storage buckets: assets (backgrounds, badge art — public read),
-- certs (rendered PDFs — public read, unguessable paths; service-role writes)
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public) values
  ('assets', 'assets', true),
  ('certs', 'certs', true)
on conflict (id) do nothing;

create policy "assets authenticated upload" on storage.objects for insert
  to authenticated with check (bucket_id = 'assets');
create policy "assets public read" on storage.objects for select using (bucket_id = 'assets');
create policy "certs public read" on storage.objects for select using (bucket_id = 'certs');
