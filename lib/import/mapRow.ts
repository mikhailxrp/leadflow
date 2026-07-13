import type {
  ImportColumnMapping,
  MappedRowFields,
  MappingTarget,
  ParsedRow,
} from '@/types/import';

const CUSTOM_FIELD_PREFIX = 'customField:';

function isCustomFieldTarget(
  target: MappingTarget,
): target is `customField:${string}` {
  return target.startsWith(CUSTOM_FIELD_PREFIX);
}

/**
 * Applies a column mapping to a single parsed row.
 *
 * Deliberately does NOT call normalizeLead() — the row is already keyed by
 * user-chosen targets, not raw form field names, so re-running alias/UTM
 * detection on it would re-interpret already-mapped keys.
 *
 * A column present in the row but absent from `mapping` is preserved into
 * customFields under its original header (never silently dropped) — only an
 * explicit 'skip' target discards a column. Same principle as intake: an
 * unrecognised field must not lose data.
 *
 * Shared between the dedup preview (this task) and batch creation (Phase 20 Task 2)
 * so both stages resolve a row to lead fields identically.
 */
export function mapRow(row: ParsedRow, mapping: ImportColumnMapping): MappedRowFields {
  const fields: MappedRowFields = {
    name: null,
    phone: null,
    email: null,
    comment: null,
    customFields: {},
  };

  for (const [column, value] of Object.entries(row)) {
    const target = mapping[column];

    if (target === 'skip') {
      continue;
    }

    if (target === undefined) {
      if (hasValue(value)) {
        fields.customFields[column] = value;
      }
      continue;
    }

    if (isCustomFieldTarget(target)) {
      if (hasValue(value)) {
        const name = target.slice(CUSTOM_FIELD_PREFIX.length);
        fields.customFields[name] = value;
      }
      continue;
    }

    if (fields[target] === null) {
      fields[target] = toStringOrNull(value);
    }
  }

  return fields;
}

/** A row maps to no usable data at all — the "empty row" error case (import.md). */
export function isMappedRowEmpty(fields: MappedRowFields): boolean {
  return (
    fields.name === null &&
    fields.phone === null &&
    fields.email === null &&
    fields.comment === null &&
    Object.keys(fields.customFields).length === 0
  );
}

function toStringOrNull(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  const str = String(value).trim();
  return str === '' ? null : str;
}

/**
 * A blank cell (null/undefined/whitespace-only string) carries no data and
 * must not be written into customFields — otherwise a fully empty row would
 * still produce e.g. `customFields: { column: "" }` and fail to be detected
 * as the "empty row" error case. Non-string values (numbers incl. 0,
 * booleans incl. false, dates) always count as real values.
 */
function hasValue(value: unknown): boolean {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}
