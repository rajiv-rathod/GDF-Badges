/**
 * Email notifications via Resend — feature-flagged like every integration:
 * no RESEND_API_KEY means no emails and nothing breaks. Sending is
 * best-effort: a failed notification never fails an issuance.
 */

export const emailEnabled = Boolean(process.env.RESEND_API_KEY);

const FROM = process.env.EMAIL_FROM ?? 'MUN CertView <onboarding@resend.dev>';

export interface CredentialEmail {
  to: string;
  recipientName: string;
  templateName: string;
  eventName: string;
  orgName: string;
  verifyUrl: string;
  claimUrl: string;
  alreadyClaimed: boolean;
}

export async function sendCredentialEmail(input: CredentialEmail): Promise<boolean> {
  if (!emailEnabled) return false;
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM,
        to: [input.to],
        subject: `You've been awarded: ${input.templateName} — ${input.eventName}`,
        html: renderHtml(input),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

function renderHtml(input: CredentialEmail): string {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `
<div style="background:#06002e;padding:40px 16px;font-family:Helvetica,Arial,sans-serif">
  <div style="max-width:520px;margin:0 auto;background:#2d2659;border-radius:14px;padding:32px;color:#fbfbf9">
    <p style="margin:0;font-size:11px;letter-spacing:3px;color:#ff45e1">MUN CERTVIEW · POWERED BY GDF</p>
    <h1 style="margin:14px 0 4px;font-size:24px;color:#fbfbf9">${esc(input.templateName)}</h1>
    <p style="margin:0;color:#a9a3c9">${esc(input.eventName)} · issued by ${esc(input.orgName)}</p>
    <p style="margin:22px 0 0;color:#fbfbf9">Dear ${esc(input.recipientName)},</p>
    <p style="margin:8px 0 0;color:#a9a3c9;line-height:1.55">
      You have been awarded a verifiable credential. Anyone can confirm its
      authenticity at the verification link below.
    </p>
    <a href="${input.verifyUrl}"
       style="display:inline-block;margin:24px 0 0;background:linear-gradient(135deg,#d73cbe,#ff45e1);color:#06002e;font-weight:700;text-decoration:none;padding:12px 26px;border-radius:8px">
      View &amp; verify your credential
    </a>
    ${
      input.alreadyClaimed
        ? ''
        : `<p style="margin:22px 0 0;color:#a9a3c9;font-size:13px;line-height:1.55">
             To add it to your credential wallet, create a free account with this
             email address at <a href="${input.claimUrl}" style="color:#ff45e1">${input.claimUrl}</a>
             — it will be claimed automatically.</p>`
    }
    <p style="margin:26px 0 0;border-top:1px solid #3d3570;padding-top:14px;color:#a9a3c9;font-size:12px">
      Global Diplomacy Forum — free credentialing for the Model UN community.
    </p>
  </div>
</div>`;
}
