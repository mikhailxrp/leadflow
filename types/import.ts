/**
 * Mapping target for a single file column.
 * `customField:<name>` is a template — `<name>` is the key written into Lead.customFields.
 */
export type MappingTarget =
  | 'name'
  | 'phone'
  | 'email'
  | 'comment'
  | 'skip'
  | `customField:${string}`;

export type ImportColumnMapping = Record<string, MappingTarget>;

/** A single row as parsed from the file, keyed by original column header. */
export type ParsedRow = Record<string, unknown>;

/** Response of the first (multipart) call to POST /api/import/preview. */
export type ImportPreviewParseResult = {
  columns: string[];
  rows: ParsedRow[];
  suggestedMapping: ImportColumnMapping;
};

/** Result of applying a column mapping to a single parsed row. */
export type MappedRowFields = {
  name: string | null;
  phone: string | null;
  email: string | null;
  comment: string | null;
  customFields: Record<string, unknown>;
};

export type ImportPreviewRowResult = {
  index: number;
  isDuplicate: boolean;
  isError: boolean;
};

/** Response of the second (JSON) call to POST /api/import/preview. */
export type ImportPreviewDedupResult = {
  totalRows: number;
  willCreate: number;
  possibleDuplicates: number;
  errors: number;
  rows: ImportPreviewRowResult[];
};

/** Response of POST /api/import/confirm (Task 2). */
export type ImportReport = {
  batchId: string;
  totalRows: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
};

/** A single row of GET /api/import (import history, Task 2). */
export type ImportHistoryItem = {
  id: string;
  fileName: string;
  status: 'PROCESSING' | 'DONE' | 'ROLLED_BACK';
  totalRows: number;
  imported: number;
  skipped: number;
  duplicates: number;
  errors: number;
  createdAt: string;
  createdByName: string | null;
};
