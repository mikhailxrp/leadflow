import {
  FIELD_ALIASES,
  LAST_NAME_ALIASES,
  MARKETING_FIELDS,
  NON_NAME_META_FIELDS,
} from '@/constants/fieldAliases';

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

const MAX_FLATTEN_DEPTH = 4;

/**
 * Maps a flat raw payload to normalized Lead fields.
 *
 * Rules:
 *  - Nested objects (some plugins — e.g. Fluent Forms — wrap fields in a
 *    `fields`/`data`-style envelope) are flattened before alias lookup, so
 *    aliases match regardless of nesting depth.
 *  - Alias lookup is case-insensitive (.toLowerCase() on input key only).
 *  - UTM fields (key starts with "utm_", case-insensitive) → utm bucket.
 *  - Marketing tracking fields (MARKETING_FIELDS set) → marketing bucket.
 *  - LAST_NAME_ALIASES fields are appended to the matched name (first-name
 *    part), covering forms that split the name into first/last.
 *  - Unrecognised fields → customFields with the ORIGINAL key (no casing change).
 *  - Standard field with empty / whitespace-only value → null.
 *  - As a last resort, once aliases are exhausted: any leftover field whose
 *    value looks like an email/phone is claimed by that field (arbitrary,
 *    plugin-specific key names can't be enumerated); if exactly one
 *    non-metadata field is still unclaimed, it's treated as the name.
 */
export function normalizeLead(
  raw: Record<string, unknown>,
  source: string,
): NormalizedLead {
  const flattened = flattenFields(raw);

  const standard: Record<StandardField, string | null> = {
    name: null,
    phone: null,
    email: null,
    comment: null,
  };
  const utm: Record<string, unknown> = {};
  const marketing: Record<string, unknown> = {};
  const customFields: Record<string, unknown> = {};
  let lastNamePart: string | null = null;

  for (const [originalKey, value] of Object.entries(flattened)) {
    const lowerKey = originalKey.toLowerCase();

    if (lowerKey.startsWith('utm_')) {
      utm[originalKey] = value;
      continue;
    }

    if (MARKETING_FIELDS.has(lowerKey)) {
      marketing[originalKey] = value;
      continue;
    }

    if (LAST_NAME_ALIASES.has(lowerKey)) {
      if (lastNamePart === null) {
        lastNamePart = toStringOrNull(value);
      }
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

  if (lastNamePart) {
    standard.name = standard.name ? `${standard.name} ${lastNamePart}` : lastNamePart;
  }

  claimByValueShape(customFields, standard, 'email', looksLikeEmail);
  claimByValueShape(customFields, standard, 'phone', looksLikePhone);

  if (standard.name === null) {
    const candidateKeys = Object.keys(customFields).filter((key) =>
      isNameCandidate(key, customFields[key]),
    );
    if (candidateKeys.length === 1) {
      const value = toStringOrNull(customFields[candidateKeys[0]]);
      if (value) {
        standard.name = value;
        delete customFields[candidateKeys[0]];
      }
    }
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Hoists nested-object leaf keys to the top level so alias lookup sees them
 * regardless of how deep a plugin nested its payload. A leaf key that
 * collides with an existing one is kept under its dotted path instead of
 * silently overwriting — no field is ever dropped.
 */
function flattenFields(
  raw: Record<string, unknown>,
  depth = 0,
): Record<string, unknown> {
  if (depth >= MAX_FLATTEN_DEPTH) return raw;

  const flat: Record<string, unknown> = {};
  const claimed = new Set(Object.keys(raw));

  for (const [key, value] of Object.entries(raw)) {
    if (!isPlainObject(value)) {
      flat[key] = value;
      continue;
    }

    const nested = flattenFields(value, depth + 1);
    for (const [innerKey, innerValue] of Object.entries(nested)) {
      if (claimed.has(innerKey)) {
        flat[`${key}.${innerKey}`] = innerValue;
      } else {
        flat[innerKey] = innerValue;
        claimed.add(innerKey);
      }
    }
  }

  return flat;
}

function looksLikeEmail(value: unknown): value is string {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function looksLikePhone(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed || !/^[+()\-\s\d]+$/.test(trimmed)) return false;
  const digits = trimmed.replace(/\D/g, '');
  return digits.length >= 6 && digits.length <= 15;
}

/** form_id/entry_id/post_id-style metadata — never a real form field's name. */
function isTechnicalKey(key: string): boolean {
  const lower = key.toLowerCase();
  if (lower.startsWith('_')) return true;
  if (/(^|[_-])id$/.test(lower)) return true;
  if (/nonce/.test(lower)) return true;
  if (/refer(er|rer)/.test(lower)) return true;
  return false;
}

function isNameCandidate(key: string, value: unknown): boolean {
  if (isTechnicalKey(key)) return false;
  if (NON_NAME_META_FIELDS.has(key.toLowerCase())) return false;
  const str = toStringOrNull(value);
  if (!str) return false;
  if (/^-?\d+(\.\d+)?$/.test(str)) return false; // purely numeric — not a name
  if (/^https?:\/\//i.test(str)) return false; // URL — not a name
  return true;
}

/** Scans leftover customFields for a value shaped like `field`, claims the first match. */
function claimByValueShape(
  customFields: Record<string, unknown>,
  standard: Record<StandardField, string | null>,
  field: 'email' | 'phone',
  matches: (value: unknown) => value is string,
): void {
  if (standard[field] !== null) return;

  for (const [key, value] of Object.entries(customFields)) {
    if (matches(value)) {
      standard[field] = value.trim();
      delete customFields[key];
      return;
    }
  }
}
