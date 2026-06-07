// ============================================================
// MediConnect — services/email.service.js
//
// Thin wrapper around Resend (HTTP email API). Resend is used instead of
// SMTP because Render can block outbound SMTP ports, while a plain HTTPS
// call always works.
//
// Templates live in the `email_templates` table so admins can edit them
// from the panel. This module ALWAYS carries a hardcoded fallback per
// template key, so a missing/corrupt DB row can never stop an email going
// out — it just uses the built-in copy instead.
//
// Required env:
//   RESEND_API_KEY   — from resend.com
//   EMAIL_FROM       — verified sender, e.g. "MediConnect <noreply@yourdomain>"
//                      (falls back to Resend's onboarding@resend.dev sandbox)
//   FRONTEND_URL     — used to build the {{login_url}} link
// ============================================================
const { Resend } = require("resend");
const supabase = require("../config/supabase");

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

const FROM = process.env.EMAIL_FROM || "MediConnect <onboarding@resend.dev>";

// Hardcoded fallbacks — the source of truth if the DB has no usable row.
// Keep the doctor_welcome copy in sync with migration 016's seed.
const FALLBACK_TEMPLATES = {
  doctor_welcome: {
    subject: "Your MediConnect doctor account is ready",
    body_html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#0f172a">
<div style="background:#4f46e5;padding:24px 28px;border-radius:12px 12px 0 0">
<h1 style="margin:0;color:#fff;font-size:20px">MediConnect</h1></div>
<div style="border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;padding:28px">
<p style="font-size:15px">Hello Dr. {{full_name}},</p>
<p style="font-size:15px;line-height:1.6">An administrator has created your MediConnect doctor account. Use the credentials below to sign in. For your security, you will be asked to set a new password on first login.</p>
<table style="margin:20px 0;border-collapse:collapse;font-size:15px">
<tr><td style="padding:6px 16px 6px 0;color:#64748b">Email</td><td style="font-weight:bold">{{email}}</td></tr>
<tr><td style="padding:6px 16px 6px 0;color:#64748b">Temporary password</td><td style="font-weight:bold">{{password}}</td></tr>
</table>
<a href="{{login_url}}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 22px;border-radius:8px;font-size:15px;font-weight:bold">Log in to MediConnect</a>
<p style="font-size:12px;color:#94a3b8;margin-top:28px">If you did not expect this email, please ignore it.</p>
</div></div>`,
  },
};

// Replace every {{token}} with the matching value. Unknown tokens are left
// blank rather than printed literally, so a stray placeholder never leaks
// "{{password}}" into a real email.
function renderTemplate(html, vars) {
  if (typeof html !== "string") return "";
  return html.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
    const v = vars[key];
    return v === undefined || v === null ? "" : String(v);
  });
}

// Fetch a template by key, falling back to the hardcoded copy if the DB
// row is missing or unusable. Never throws.
async function loadTemplate(key) {
  try {
    const { data, error } = await supabase
      .from("email_templates")
      .select("subject, body_html")
      .eq("key", key)
      .single();
    if (!error && data?.subject && data?.body_html) return data;
  } catch {
    /* fall through to fallback */
  }
  return FALLBACK_TEMPLATES[key] || null;
}

// Render a stored template with sample/real vars WITHOUT sending — used by
// the admin preview endpoint.
async function previewTemplate(key, vars = {}) {
  const tpl = await loadTemplate(key);
  if (!tpl) return null;
  return {
    subject: renderTemplate(tpl.subject, vars),
    html: renderTemplate(tpl.body_html, vars),
  };
}

// Send an email rendered from a stored template. Returns
// { sent: boolean, error?: string } and NEVER throws — callers decide
// whether a failure matters. (Doctor onboarding treats it as non-fatal.)
async function sendTemplatedEmail({ to, key, vars }) {
  if (!resend) {
    return { sent: false, error: "RESEND_API_KEY not configured" };
  }
  const tpl = await loadTemplate(key);
  if (!tpl) return { sent: false, error: `No template for key "${key}"` };

  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to,
      subject: renderTemplate(tpl.subject, vars),
      html: renderTemplate(tpl.body_html, vars),
    });
    if (error) return { sent: false, error: error.message || String(error) };
    return { sent: true };
  } catch (err) {
    return { sent: false, error: err.message };
  }
}

module.exports = {
  renderTemplate,
  loadTemplate,
  previewTemplate,
  sendTemplatedEmail,
  FALLBACK_TEMPLATES,
};
