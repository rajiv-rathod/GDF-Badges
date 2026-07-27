/**
 * GDF brand tokens — the single source of truth for both apps/web and apps/mobile.
 *
 * Updated against the official GDF brand assets supplied by the team
 * (dotted-halftone circle logo, light gradient background, brand PDF):
 * light surfaces, magenta→pink accents, Lastica display type and
 * TT Interphases body type. Both typefaces are licensed — the repo ships
 * @font-face slots (apps/web/public/fonts/) and open fallbacks
 * (Space Grotesk / Inter); drop the licensed files in to activate them.
 * Do not invent new palette values here.
 */

export const colors = {
  /** GDF magenta — primary actions, seals */
  primary: '#d73cbe',
  /** Darker magenta for hover/pressed and text-on-light links (AA) */
  primaryDark: '#a52b93',
  /** Bright pink — highlights, gradients, active accents */
  accent: '#ff45e1',
  /** Near-white base surface (the brand background is light) */
  background: '#fdfafd',
  /** Raised card surface */
  surface: '#ffffff',
  /** Deep navy-violet primary text */
  text: '#1b1440',
  /** Muted violet-grey secondary text */
  muted: '#6f6690',
  /** Hairline borders on light surfaces */
  border: '#ecdff0',
  /** Status colors (dark enough for AA on white) */
  success: '#1f8a4c',
  danger: '#d11f38',
} as const;

export const fonts = {
  /** Headings, hero text, credential titles — licensed GDF display face */
  display: 'Lastica',
  /** Body copy, UI labels — licensed GDF text face */
  body: 'TT Interphases',
  /** Open fallbacks (bundled via next/font) */
  displayFallback: 'Space Grotesk',
  bodyFallback: 'Inter',
} as const;

export const radii = {
  sm: 8,
  md: 14,
  lg: 22,
  pill: 999,
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 40,
  xxl: 64,
} as const;

/**
 * Signature effects. The backdrop is the brand's soft blurred gradient —
 * pink/violet/blue clouds over near-white. The magenta→pink gradient is
 * reserved for CTAs and credential seals, never full-page washes.
 */
export const effects = {
  /** magenta → pink, for CTAs and seals only */
  ctaGradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
  /** dot-grid mesh stroke over the light background */
  dotGridStroke: 'rgba(215, 60, 190, 0.10)',
  /** soft pink glow behind hero elements */
  heroGlow: 'radial-gradient(ellipse at center, rgba(255, 69, 225, 0.14) 0%, rgba(253, 250, 253, 0) 70%)',
} as const;

export const brand = {
  name: 'MUN CertView',
  poweredBy: 'powered by GDF',
  org: 'Global Diplomacy Forum',
  tagline: 'Verifiable credentials for the Model UN community.',
  supportEmail: 'rajiv@gdf.social',
  meetingAppUrl: 'https://meet.apextech.llc',
} as const;

export const tokens = { colors, fonts, radii, spacing, effects, brand } as const;
export type BrandTokens = typeof tokens;
