/**
 * GDF brand tokens — the single source of truth for both apps/web and apps/mobile.
 *
 * Colors were extracted from the live gdf.social site (Global Diplomacy Forum).
 * The site's typeface is Canva Sans, which is proprietary; Space Grotesk (display)
 * and Inter (body) are the chosen open equivalents. Do not invent new palette
 * values here — change them only against real GDF brand assets.
 */

export const colors = {
  /** GDF magenta — primary actions, links, focus rings */
  primary: '#d73cbe',
  /** Darker magenta for hover/pressed states */
  primaryDark: '#a52b93',
  /** Bright pink — highlights, seals, active accents */
  accent: '#ff45e1',
  /** Deep midnight navy — the GDF base surface */
  background: '#06002e',
  /** Raised card surface (dark violet) */
  surface: '#2d2659',
  /** Off-white primary text */
  text: '#fbfbf9',
  /** Lavender-grey secondary text (derived for AA contrast on background) */
  muted: '#a9a3c9',
  /** Hairline borders on dark surfaces */
  border: '#3d3570',
  /** Status colors */
  success: '#3cac67',
  danger: '#ef2d43',
} as const;

export const fonts = {
  /** Headings, hero text, credential titles */
  display: 'Space Grotesk',
  /** Body copy, UI labels */
  body: 'Inter',
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
 * Signature effects. The globe grid is GDF's background motif: a subtle
 * latitude/longitude line mesh over the deep navy. The CTA gradient is
 * reserved for buttons and credential seals — never full-page washes.
 */
export const effects = {
  /** magenta → pink, for CTAs and seals only */
  ctaGradient: `linear-gradient(135deg, ${colors.primary} 0%, ${colors.accent} 100%)`,
  /** stroke color for the globe-grid mesh */
  globeGridStroke: 'rgba(215, 60, 190, 0.14)',
  /** soft glow behind hero elements */
  heroGlow: 'radial-gradient(ellipse at center, rgba(215, 60, 190, 0.25) 0%, rgba(6, 0, 46, 0) 70%)',
} as const;

export const brand = {
  name: 'MUN CertView',
  poweredBy: 'powered by GDF',
  org: 'Global Diplomacy Forum',
  tagline: 'Verifiable credentials for the Model UN community.',
} as const;

export const tokens = { colors, fonts, radii, spacing, effects, brand } as const;
export type BrandTokens = typeof tokens;
