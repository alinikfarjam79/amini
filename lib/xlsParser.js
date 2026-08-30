import * as XLSX from "xlsx";

/**
 * Parse an ArrayBuffer (from fetching an .xls / .xlsx file) into
 * an array of plain objects, one per data row.
 *
 * @param {ArrayBuffer} buffer   - Raw file bytes
 * @param {string}      [sheet]  - Sheet name to read; defaults to the first sheet
 * @returns {Array<Object>}
 */
export const parseXLS = (buffer, sheet = null) => {
  if (!buffer || !(buffer instanceof ArrayBuffer)) {
    throw new Error("XLS_INVALID_INPUT");
  }

  const workbook = XLSX.read(buffer, { type: "array" });

  const sheetName = sheet ?? workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("XLS_NO_SHEETS");
  }

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`XLS_SHEET_NOT_FOUND: ${sheetName}`);
  }

  // header: 1  → first row becomes the keys
  const records = XLSX.utils.sheet_to_json(worksheet, { defval: "" });

  if (records.length === 0) {
    throw new Error("XLS_INSUFFICIENT_ROWS");
  }

  return records;
};
