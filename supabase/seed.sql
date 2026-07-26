-- Global GDF badge templates (org_id null = available to every conference).
-- Image paths resolve against the web app's /public directory.
insert into public.badge_templates (id, org_id, name, description, image_url, criteria) values
  ('b0000000-0000-4000-8000-000000000001', null, 'Participation',
   'Participated as a delegate in a Model UN conference.', '/badges/participation.svg',
   'Attended and participated in all committee sessions.'),
  ('b0000000-0000-4000-8000-000000000002', null, 'Best Delegate',
   'Awarded to the top delegate of a committee.', '/badges/best-delegate.svg',
   'Outstanding diplomacy, research, and leadership in committee.'),
  ('b0000000-0000-4000-8000-000000000003', null, 'Outstanding Delegate',
   'Awarded for exceptional performance in committee.', '/badges/outstanding-delegate.svg',
   'Exceptional contribution to debate and resolution drafting.'),
  ('b0000000-0000-4000-8000-000000000004', null, 'Honourable Mention',
   'Recognized for notable contribution to committee.', '/badges/honourable-mention.svg',
   'Notable engagement and constructive participation.'),
  ('b0000000-0000-4000-8000-000000000005', null, 'Chair',
   'Served as a committee chair.', '/badges/chair.svg',
   'Chaired a committee, guiding debate and procedure.')
on conflict (id) do nothing;
