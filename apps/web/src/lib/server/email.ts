import nodemailer, { type Transporter } from 'nodemailer';
import { getAppConfig } from './appconfig';

/**
 * Email via SMTP (mailcow). Credentials come from app_config (or env), so
 * sending works in production without extra Vercel setup. Best-effort: a
 * failed send never fails an issuance.
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

async function send(to: string | string[], subject: string, html: string): Promise<boolean> {
  try {
    const t = await getTransport();
    if (!t) return false;
    await t.sendMail({ from: fromCache, to, subject, html });
    return true;
  } catch {
    return false;
  }
}

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function shell(inner: string): string {
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
  return send(input.to, `You've been awarded: ${input.templateName} — ${input.eventName}`, shell(inner));
}

/** Admin broadcast to members. Returns per-recipient success count. */
export async function sendBroadcast(
  recipients: string[],
  subject: string,
  bodyHtml: string,
): Promise<{ sent: number; failed: number }> {
  const inner = `<div style="margin:16px 0 0;color:#1b1440;line-height:1.6">${bodyHtml}</div>`;
  let sent = 0;
  let failed = 0;
  // Sequential, small delay-free loop; mailcow handles the volume for MUN scale.
  for (const to of recipients) {
    (await send(to, subject, shell(inner))) ? (sent += 1) : (failed += 1);
  }
  return { sent, failed };
}
