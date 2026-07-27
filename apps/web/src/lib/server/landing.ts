import { getAppConfig } from './appconfig';

export interface LandingContent {
  headline: string;
  subhead: string;
  about_title: string;
  about_body: string;
  banner: string;
}

const DEFAULTS: LandingContent = {
  headline: 'MUN CertView',
  subhead:
    'Verifiable credentials for the Model UN community. Organizers issue verifiable badges and certificates; delegates claim, collect, and share them.',
  about_title: 'What is MUN CertView?',
  about_body:
    'MUN CertView is a free, Credly-style credentialing platform built by the Global Diplomacy Forum. Conferences issue tamper-evident, cryptographically signed badges and certificates; delegates collect them in one wallet, prove them with a public link, and share them anywhere. Free forever for the Model UN community.',
  banner: '',
};

export async function getLandingContent(): Promise<LandingContent> {
  const raw = await getAppConfig('landing_content');
  if (!raw) return DEFAULTS;
  try {
    const parsed = JSON.parse(raw) as Partial<LandingContent>;
    return { ...DEFAULTS, ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v)) };
  } catch {
    return DEFAULTS;
  }
}
