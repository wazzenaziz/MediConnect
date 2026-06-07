-- Email templates (admin-managed) + force-password-change support.
--
-- WHY
--   1. Admins onboard doctors and we email the new doctor their credentials.
--      The HTML for that email lives in `email_templates` so admins can edit
--      it from the panel without a redeploy. The backend always ships a
--      hardcoded fallback (see src/services/email.service.js), so a missing
--      or corrupt row never blocks an email.
--   2. We email a TEMPORARY password, so the doctor must set their own at
--      first login. `users.must_change_password` gates that.
--
-- RLS: like every table here, the backend uses the SERVICE_ROLE key and
-- bypasses RLS; we enable RLS with no policies so the public API is deny-all.
-- (Matches migration 014.)

-- 1. Templates ---------------------------------------------------------------

CREATE TABLE email_templates (
  -- Stable string key the backend looks up by (not a UUID) so code can ask
  -- for a template by name without storing an id.
  key         TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  subject     TEXT NOT NULL,
  -- Raw HTML with {{placeholder}} tokens, populated at send time.
  body_html   TEXT NOT NULL,
  -- Documents which {{tokens}} this template understands, for the editor UI.
  variables   TEXT[] NOT NULL DEFAULT '{}',
  updated_at  TIMESTAMP DEFAULT NOW(),
  created_at  TIMESTAMP DEFAULT NOW()
);

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- Seed the doctor-welcome template. Tokens: {{full_name}}, {{email}},
-- {{password}}, {{login_url}}. Keep this in sync with the hardcoded fallback
-- in src/services/email.service.js.
INSERT INTO email_templates (key, name, subject, body_html, variables)
VALUES (
  'doctor_welcome',
  'Doctor account created',
  'Your MediConnect doctor account is ready',
  '<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">'
  || '<div style="background:#4f46e5;padding:24px 28px;border-radius:12px 12px 0 0">'
  || '<h1 style="margin:0;color:#fff;font-size:20px">MediConnect</h1></div>'
  || '<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px">'
  || '<p style="font-size:15px">Hello Dr. {{full_name}},</p>'
  || '<p style="font-size:15px;line-height:1.6">An administrator has created your MediConnect doctor account. '
  || 'Use the credentials below to sign in. For your security, you will be asked to set a new password on first login.</p>'
  || '<table style="margin:20px 0;border-collapse:collapse;font-size:15px">'
  || '<tr><td style="padding:6px 16px 6px 0;color:#64748b">Email</td><td style="font-weight:bold">{{email}}</td></tr>'
  || '<tr><td style="padding:6px 16px 6px 0;color:#64748b">Temporary password</td><td style="font-weight:bold">{{password}}</td></tr>'
  || '</table>'
  || '<a href="{{login_url}}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;'
  || 'padding:12px 22px;border-radius:8px;font-size:15px;font-weight:bold">Log in to MediConnect</a>'
  || '<p style="font-size:12px;color:#94a3b8;margin-top:28px">If you did not expect this email, please ignore it.</p>'
  || '</div></div>',
  ARRAY['full_name', 'email', 'password', 'login_url']
);

-- 2. Force password change ---------------------------------------------------

ALTER TABLE users
  ADD COLUMN must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
