import nodemailer, { type Transporter } from 'nodemailer';
import { getAppConfig } from './appconfig';

/**
 * Email via SMTP (mailcow). Credentials come from app_config (or env), so
 * sending works in production without extra Vercel setup. Best-effort: a
 * failed send never fails an issuance.
 *
 * Deliverability: every message carries a plain-text alternative (HTML-only
 * mail scores as spam), a List-Unsubscribe header, and a stable From. The
 * rest — SPF/DKIM/DMARC on gdf.social — lives in DNS, not code.
 *
 * app_config keys (or env): smtp_host/SMTP_HOST, smtp_port/SMTP_PORT,
 * smtp_user/SMTP_USER, smtp_pass/SMTP_PASS, email_from/EMAIL_FROM.
 */
let transporter: Transporter | null = null;
let fromCache = 'MUN CertView <info@gdf.social>';

async function getTransport(): Promise<Transporter | null> {
  if (transporter) return transporter;
  const host = await getAppConfig('smtp_host', 'SMTP_HOST');
  const user = await getAppConfig('smtp_user', 'SMTP_USER');
  const pass = await getAppConfig('smtp_pass', 'SMTP_PASS');
  if (!host || !user || !pass) return null;
  const port = Number((await getAppConfig('smtp_port', 'SMTP_PORT')) ?? 587);
  fromCache = (await getAppConfig('email_from', 'EMAIL_FROM')) ?? `MUN CertView <${user}>`;
  transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  });
  return transporter;
}

export async function emailEnabled(): Promise<boolean> {
  return (await getTransport()) !== null;
}

/** Rough plain-text rendering of HTML for the multipart alternative. */
function htmlToText(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|h[1-6]|li|tr)>/gi, '\n')
    .replace(/<a[^>]*href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export interface MailInput {
  to: string | string[];
  subject: string;
  /** HTML body. Omit for a text-only message (best deliverability). */
  html?: string;
  /** Plain-text body / alternative. Derived from html when omitted. */
  text?: string;
  headers?: Record<string, string>;
}

/** Generic send used by every mail path (credentials, auth codes, broadcast). */
export async function sendMail(input: MailInput): Promise<boolean> {
  try {
    const t = await getTransport();
    if (!t) return false;
    await t.sendMail({
      from: fromCache,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text ?? (input.html ? htmlToText(input.html) : ''),
      headers: {
        'List-Unsubscribe': '<mailto:rajiv@gdf.social?subject=unsubscribe>',
        ...input.headers,
      },
    });
    return true;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export function emailShell(inner: string): string {
  return `
<div style="background:#fdfafd;padding:40px 16px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:540px;margin:0 auto;background:#ffffff;border:1px solid #ecdff0;border-radius:16px;padding:34px">
    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#d73cbe">MUN CERTVIEW · POWERED BY GDF</p>
    ${inner}
    <p style="margin:28px 0 0;border-top:1px solid #ecdff0;padding-top:16px;color:#6f6690;font-size:12px">
      Global Diplomacy Forum — free credentialing for the Model UN community.
      <br/>Questions? <a href="mailto:rajiv@gdf.social" style="color:#a52b93">rajiv@gdf.social</a>
    </p>
  </div>
</div>`;
}

export interface CredentialEmail {
  to: string;
  recipientName: string;
  templateName: string;
  eventName: string;
  orgName: string;
  certificateId: string;
  verifyUrl: string;
  claimUrl: string;
  assetUrl?: string | null;
  alreadyClaimed: boolean;
}

export async function sendCredentialEmail(input: CredentialEmail): Promise<boolean> {
  const inner = `
    <h1 style="margin:14px 0 4px;font-size:24px;color:#1b1440">${esc(input.templateName)}</h1>
    <p style="margin:0;color:#6f6690">${esc(input.eventName)} · issued by ${esc(input.orgName)}</p>
    <p style="margin:22px 0 0;color:#1b1440">Dear ${esc(input.recipientName)},</p>
    <p style="margin:8px 0 0;color:#6f6690;line-height:1.6">
      You've been awarded a verifiable credential. Certificate ID
      <strong style="color:#1b1440">${esc(input.certificateId)}</strong>. Anyone can confirm its
      authenticity at the public link below.
    </p>
    <a href="${input.verifyUrl}"
       style="display:inline-block;margin:24px 0 0;background:linear-gradient(135deg,#d73cbe,#ff45e1);color:#ffffff;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:8px">
      View &amp; verify your credential
    </a>
    ${input.assetUrl ? `<p style="margin:16px 0 0;font-size:13px"><a href="${input.assetUrl}" style="color:#a52b93">Download your certificate PDF</a></p>` : ''}
    ${
      input.alreadyClaimed
        ? ''
        : `<p style="margin:22px 0 0;color:#6f6690;font-size:13px;line-height:1.6">
             Add it to your wallet: create a free account with this email at
             <a href="${input.claimUrl}" style="color:#a52b93">${esc(input.claimUrl)}</a> —
             it's claimed automatically.</p>`
    }`;
  return sendMail({
    to: input.to,
    subject: `You've been awarded: ${input.templateName} — ${input.eventName}`,
    html: emailShell(inner),
  });
}

/** One-time sign-in / recovery code, sent through our own SMTP. */
export async function sendAuthCode(to: string, code: string, purpose: 'sign in' | 'reset your password'): Promise<boolean> {
  const inner = `
    <h1 style="margin:14px 0 4px;font-size:22px;color:#1b1440">Your one-time code</h1>
    <p style="margin:8px 0 0;color:#6f6690;line-height:1.6">Use this code to ${purpose}. It expires in 10 minutes.</p>
    <p style="margin:20px 0 0;font-size:34px;letter-spacing:8px;font-weight:700;color:#a52b93">${esc(code)}</p>
    <p style="margin:20px 0 0;color:#6f6690;font-size:13px">If you didn't request this, you can safely ignore this email.</p>`;
  return sendMail({
    to,
    subject: `${code} is your MUN CertView code`,
    html: emailShell(inner),
    headers: { 'X-Auto-Response-Suppress': 'All' },
  });
}

/**
 * Admin broadcast. mode 'html': the body is embedded in the brand shell with a
 * text alternative. mode 'text': a text-only message (no HTML part at all).
 */
export async function sendBroadcast(
  recipients: string[],
  subject: string,
  body: string,
  mode: 'html' | 'text' = 'html',
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const to of recipients) {
    const ok =
      mode === 'text'
        ? await sendMail({ to, subject, text: body })
        : await sendMail({ to, subject, html: emailShell(`<div style="margin:16px 0 0;color:#1b1440;line-height:1.6">${body}</div>`) });
    ok ? (sent += 1) : (failed += 1);
  }
  return { sent, failed };
}

/** Render the exact broadcast HTML for the admin preview pane. */
export function broadcastPreviewHtml(body: string): string {
  return emailShell(`<div style="margin:16px 0 0;color:#1b1440;line-height:1.6">${body}</div>`);
}
