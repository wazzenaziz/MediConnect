const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

// Stateless server-side client. Without these options, calling
// supabase.auth.signInWithPassword() would mutate this shared singleton's
// session, so subsequent .from() queries would run as the logged-in user
// (the `authenticated` role) instead of service_role. With RLS enabled and
// no policies, those queries get denied. Disabling session persistence keeps
// every query on the service_role key, which bypasses RLS as intended.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  }
);

module.exports = supabase;