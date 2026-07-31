/**
 * Core data-model types for MUN CertView.
 * Mirrors the Postgres schema described in docs/PLAYBOOK.md (built in Phases 1–2).
 */

export type UserRole = 'member' | 'organizer' | 'admin';
export type OrgRole = 'owner' | 'admin' | 'staff';
export type CredentialType = 'badge' | 'certificate';
export type CredentialStatus = 'issued' | 'claimed' | 'revoked';
export type CredentialEventType = 'created' | 'claimed' | 'revoked' | 'viewed';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  brand_overrides: Record<string, string> | null;
  owner_id: string;
  created_at: string;
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  role: UserRole;
  public_slug: string;
  avatar_url: string | null;
}

export interface OrgMember {
  org_id: string;
  user_id: string;
  role_in_org: OrgRole;
}

export interface BadgeTemplate {
  id: string;
  /** null = global GDF template available to every org */
  org_id: string | null;
  name: string;
  description: string;
  image_url: string;
  criteria: string;
}

/** One positioned data field on a certificate template (legacy text field). */
export interface CertificateField {
  key: string;
  label: string;
  x: number;
  y: number;
  width: number;
  font: string;
  size: number;
  weight: number;
  align: 'left' | 'center' | 'right';
  color: string;
  sample: string;
}

/**
 * Canva-style layout element. A template's layout_json is an ordered list of
 * these (paint order = array order). All positions are percentages of the page
 * (x/y from the left/top). `type` is optional for backwards compatibility —
 * a legacy element with no `type` is treated as a data `field`.
 */
export type CertElementType = 'field' | 'text' | 'image' | 'rect' | 'ellipse' | 'line' | 'verification';

export interface CertElementBase {
  id: string;
  type?: CertElementType;
  x: number;
  y: number;
  width: number;
}

/** Text-like element: a data field, static text, or the verification stamp. */
export interface CertTextElement extends CertElementBase {
  type?: 'field' | 'text' | 'verification';
  key?: string;        // field: maps to a sheet column. verification: reserved key.
  label?: string;
  text?: string;       // static text content (type 'text')
  font: string;
  size: number;
  weight: number;
  align: 'left' | 'center' | 'right';
  color: string;
  sample?: string;
  vmode?: 'id' | 'url' | 'both'; // verification only
}

export interface CertImageElement extends CertElementBase {
  type: 'image';
  url: string;
  height: number;
  opacity?: number;
}

export interface CertShapeElement extends CertElementBase {
  type: 'rect' | 'ellipse';
  height: number;
  fill: string;
  stroke?: string;
  strokeWidth?: number;
  opacity?: number;
}

export interface CertLineElement extends CertElementBase {
  type: 'line';
  height: number;
  color: string;
  thickness: number;
}

export type CertElement = CertTextElement | CertImageElement | CertShapeElement | CertLineElement;

export interface CertificateTemplate {
  id: string;
  org_id: string;
  name: string;
  background_url: string;
  layout_json: CertElement[];
  page_size: 'A4-landscape' | 'A4-portrait' | 'letter-landscape' | 'letter-portrait';
  created_by: string;
}

export interface Credential {
  id: string;
  type: CredentialType;
  org_id: string;
  template_id: string;
  recipient_email: string;
  /** null until claimed via claim_pending_credentials(email) */
  recipient_user_id: string | null;
  recipient_name: string;
  fields_json: Record<string, string>;
  event_name: string;
  issued_at: string;
  issued_by: string;
  status: CredentialStatus;
  /** unguessable public slug → /verify/{code} */
  verification_code: string;
  /** cryptographic signature over the canonical credential data */
  signature: string;
  asset_url: string | null;
  is_public: boolean;
}

export interface Delegate {
  id: string;
  org_id: string;
  name: string;
  email: string;
  committee: string;
  country_portfolio: string;
  award: string | null;
}

export interface CredentialEvent {
  id: string;
  credential_id: string;
  event: CredentialEventType;
  at: string;
}
