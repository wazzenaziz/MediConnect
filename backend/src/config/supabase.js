const { createClient } = require("@supabase/supabase-js");
require("dotenv").config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_KEY; // service_role key

// Primary client for ALL database access (.from(...)) and admin auth calls
// (auth.admin.*). It must ALWAYS act as service_role so RLS is bypassed.
//
// CRITICAL: never call signInWithPassword / signUp on THIS client. Those calls
// set a user session in memory, and the very next .from() query would then run
// as the `authenticated` role instead of service_role — which RLS (enabled,
// no policies) denies ("new row violates row-level security policy" / profile
// not found). persistSession:false is not enough on its own; the only safe
// guarantee is to keep user sign-in off this client entirely.
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

// Dedicated client used ONLY for user-facing auth (signInWithPassword, signUp).
// Letting it hold a user session is harmless because it never runs .from()
// data queries — those all go through `supabase` above as service_role.
const supabaseAuth = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

module.exports = supabase;
module.exports.supabase = supabase;
module.exports.supabaseAuth = supabaseAuth;
