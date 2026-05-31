-- Revert FORCE ROW LEVEL SECURITY from migration 014.
--
-- FORCE RLS broke login: auth.controller.js calls signInWithPassword and then
-- reuses the same supabase-js client to read public.users. After sign-in the
-- client carries the user's `authenticated` token, so that read no longer runs
-- as service_role — and with FORCE RLS + no policies it was denied, producing
-- "Authenticated but profile not found".
--
-- Plain ENABLE (kept) still clears the Security Advisor errors and makes the
-- public API deny-all for anon/authenticated. service_role bypasses ENABLE RLS,
-- so the backend works again.

ALTER TABLE public.users        NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.doctors      NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.schedules    NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.notes        NO FORCE ROW LEVEL SECURITY;
ALTER TABLE public.appointments NO FORCE ROW LEVEL SECURITY;
