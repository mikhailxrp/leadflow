import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import type { ParsedRow } from '@/types/import';

/** 10 MB — the file itself is never persisted, only held for one request. */
export const MAX_IMPORT_FILE_SIZE_BYTES = 10 * 1024 * 1024;

/** Row cap for a single import — see .docs/modules/import.md. */
export const MAX_IMPORT_ROWS = 5000;

export class ImportParseError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = 'ImportParseError';
  }
}

export type ParsedFile = {
  columns: string[];
  rows: ParsedRow[];
};

/**
 * Parses an uploaded CSV/Excel file entirely in memory — never written to disk
 * or object storage (see .docs/modules/import.md "Файл не сохраняется").
 *
 * Format is resolved from the file name extension, not `file.type` — browsers
 * send inconsistent/empty MIME types for CSV and Excel depending on OS.
 */
export async function parseImportFile(file: File): Promise<ParsedFile> {
  if (file.size > MAX_IMPORT_FILE_SIZE_BYTES) {
    throw new ImportParseError('FILE_TOO_LARGE');
  }

  const extension = getExtension(file.name);

  let parsed: ParsedFile;
  if (extension === 'csv') {
    parsed = await parseCsv(file);
  } else if (extension === 'xlsx' || extension === 'xls') {
    parsed = await parseSpreadsheet(file);
  } else {
    throw new ImportParseError('UNSUPPORTED_FORMAT');
  }

  if (parsed.columns.length === 0) {
    throw new ImportParseError('EMPTY_FILE');
  }

  if (parsed.rows.length > MAX_IMPORT_ROWS) {
    throw new ImportParseError('TOO_MANY_ROWS');
  }

  return parsed;
}

function getExtension(fileName: string): string {
  const dotIndex = fileName.lastIndexOf('.');
  return dotIndex === -1 ? '' : fileName.slice(dotIndex + 1).toLowerCase();
}

async function parseCsv(file: File): Promise<ParsedFile> {
  const text = await file.text();
  const result = Papa.parse<ParsedRow>(text, {
    header: true,
    skipEmptyLines: true,
  });

  return { columns: result.meta.fields ?? [], rows: result.data };
}

async function parseSpreadsheet(file: File): Promise<ParsedFile> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer);
  const sheetName = workbook.SheetNames[0];

  if (!sheetName) {
    throw new ImportParseError('EMPTY_FILE');
  }

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<ParsedRow>(sheet, {
    defval: null,
    blankrows: false,
  });
  const columns = rows.length > 0 ? Object.keys(rows[0]) : extractHeaderRow(sheet);

  return { columns, rows };
}

function extractHeaderRow(sheet: XLSX.WorkSheet): string[] {
  const [headerRow] = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1 });
  if (!headerRow) return [];
  return headerRow
    .map((cell) => String(cell ?? '').trim())
    .filter((cell) => cell !== '');
}
