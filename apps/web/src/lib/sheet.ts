import * as XLSX from 'xlsx';

/**
 * Any-format spreadsheet parsing shared by the delegate importer and the
 * certificate bulk-issue flow. SheetJS reads xlsx/xls/xlsm/csv/tsv/ods and
 * more from the same bytes. Multi-sheet workbooks expose every tab so the
 * user can pick which one to import.
 */
export interface ParsedSheet {
  columns: string[];
  rows: Array<Record<string, string>>;
}

export interface ParsedWorkbook {
  sheetNames: string[];
  getSheet: (name: string) => ParsedSheet;
}

export async function parseWorkbook(file: File): Promise<ParsedWorkbook> {
  const workbook = XLSX.read(await file.arrayBuffer(), { cellDates: true });
  const sheetNames = workbook.SheetNames.filter((n) => {
    const ref = workbook.Sheets[n]?.['!ref'];
    return Boolean(ref); // skip empty tabs
  });
  return {
    sheetNames: sheetNames.length ? sheetNames : workbook.SheetNames,
    getSheet(name: string): ParsedSheet {
      const ws = workbook.Sheets[name];
      // raw:false → dates/numbers render as display strings (no serials); defval keeps blanks.
      const parsed = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { raw: false, defval: '' });
      const columns = [...new Set(parsed.flatMap((r) => Object.keys(r)))].filter((c) => !c.startsWith('__EMPTY'));
      const rows = parsed
        .map((r) => Object.fromEntries(columns.map((c) => [c, String(r[c] ?? '').trim()])))
        .filter((r) => Object.values(r).some((v) => v !== ''));
      return { columns, rows };
    },
  };
}
