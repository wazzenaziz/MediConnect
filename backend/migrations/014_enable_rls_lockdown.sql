-- Enable Row Level Security on all public tables.
--
-- The backend connects to Supabase with the SERVICE_ROLE key, which bypasses
-- RLS entirely. All authorization is enforced in the Express layer
-- (see src/middleware/auth.middleware.js). The frontend never talks to
-- Supabase directly — it only calls the Express API.
--
-- Enabling RLS with NO policies makes the public PostgREST API (anon /
-- authenticated roles) deny-all: even if the anon key and project URL leaked,
-- nobody could read or write these tables directly. The backend is unaffected
-- because service_role is exempt from RLS by design.
--
-- This resolves the Supabase Security Advisor "RLS Disabled in Public" and
-- "Sensitive Columns Exposed" errors.

ALTER TABLE public.users        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctors      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedules    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notes        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- NOTE: Do NOT use FORCE ROW LEVEL SECURITY here. FORCE makes even the table
-- owner subject to policies, and after signInWithPassword the backend's
-- supabase-js client queries as the `authenticated` role (not service_role),
-- so FORCE + no policies denies the login profile read. Plain ENABLE already
-- clears the advisor errors and locks the public API to deny-all.
