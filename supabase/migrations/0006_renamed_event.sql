-- Audit trail for holder name corrections: allow the 'renamed' event (and
-- 'shared', used by the share tracking feature) in credential_events.
alter table public.credential_events drop constraint if exists credential_events_event_check;
alter table public.credential_events add constraint credential_events_event_check
  check (event in ('created','claimed','revoked','viewed','shared','renamed'));
