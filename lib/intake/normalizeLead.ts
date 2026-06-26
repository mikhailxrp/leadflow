import { FIELD_ALIASES, MARKETING_FIELDS } from '@/constants/fieldAliases';

export type NormalizedLead = {
  name: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  source: string;
  utm: Record<string, unknown>;
  marketing: Record<string, unknown>;
  customFields: Record<string, unknown>;
};

type StandardField = 'name' | 'phone' | 'email' | 'comment';

/**
 * Maps a flat raw payload to normalized Lead fields.
 *
 * Rules:
 *  - Alias lookup is case-insensitive (.toLowerCase() on input key only).
 *  - UTM fields (key starts with "utm_", case-insensitive) → utm bucket.
 *  - Marketing tracking fields (MARKETING_FIELDS set) → marketing bucket.
 *  - Unrecognised fields → customFields with the ORIGINAL key (no casing change).
 *  - Standard field with empty / whitespace-only value → null.
 */
export function normalizeLead(
  raw: Record<string, unknown>,
  source: string,
): NormalizedLead {
  const standard: Record<StandardField, string | null> = {
    name: null,
    phone: null,
    email: null,
    comment: null,
  };
  const utm: Record<string, unknown> = {};
  const marketing: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {};

  for (const [originalKey, value] of Object.entries(raw)) {
    const lowerKey = originalKey.toLowerCase();

    if (lowerKey.startsWith('utm_')) {
      utm[originalKey] = value;
      continue;
    }

    if (MARKETING_FIELDS.has(lowerKey)) {
      marketing[originalKey] = value;
      continue;
    }

    const standardField = FIELD_ALIASES[lowerKey];
    if (standardField !== undefined) {
      // Only set if not already populated — first recognised value wins.
      if (standard[standardField] === null) {
        standard[standardField] = toStringOrNull(value);
      }
      continue;
    }

    // Unrecognised key → customFields, original casing preserved.
    customFields[originalKey] = value;
  }

  return {
    name: standard.name,
    phone: standard.phone,
    email: standard.email,
    comment: standard.comment,
    source,
    utm,
    marketing,
    customFields,
  };
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}
