import { SignJWT } from 'jose';

export const jitsiConfigured = Boolean(
  process.env.JITSI_DOMAIN && process.env.JITSI_APP_ID && process.env.JITSI_JWT_SECRET,
);

export function jitsiDomain(): string {
  return process.env.JITSI_DOMAIN ?? '';
}

/** Mints a JWT for the self-hosted Jitsi (jitsi-meet prosody token auth). */
export async function mintJitsiJwt(options: {
  room: string;
  name: string;
  email: string;
  moderator: boolean;
}): Promise<string> {
  const appId = process.env.JITSI_APP_ID!;
  const secret = new TextEncoder().encode(process.env.JITSI_JWT_SECRET!);
  return new SignJWT({
    aud: 'jitsi',
    iss: appId,
    sub: jitsiDomain(),
    room: options.room,
    moderator: options.moderator,
    context: { user: { name: options.name, email: options.email, moderator: options.moderator } },
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setExpirationTime('4h')
    .sign(secret);
}
