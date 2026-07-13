import { FIELD_ALIASES } from '@/constants/fieldAliases';
import type { ImportColumnMapping } from '@/types/import';

/**
 * Auto-suggests a mapping target for each file column by reusing the same
 * alias table as webhook intake (constants/fieldAliases.ts). A column that
 * doesn't match a known alias is suggested as 'skip' — the user decides in
 * the UI whether it becomes a custom field, not the server.
 */
export function suggestMapping(columns: string[]): ImportColumnMapping {
  const mapping: ImportColumnMapping = {};

  for (const column of columns) {
    const alias = FIELD_ALIASES[column.toLowerCase()];
    mapping[column] = alias ?? 'skip';
  }

  return mapping;
}
