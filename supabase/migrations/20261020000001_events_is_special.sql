-- Flag for big/one-off events, set from "Type: Special" in the Google Calendar description.
-- Separate from event_type (circuit_qualifier/championship): a regional can be both.
alter table public.events
  add column if not exists is_special boolean not null default false;
