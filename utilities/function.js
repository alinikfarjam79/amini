import * as XLSX from "xlsx";

export const normalizePersian = (text = "") => {
    return text
        .toString()
        .trim()
        .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
        .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d))
        .replace(/ي/g, "ی")
        .replace(/ى/g, "ی")
        .replace(/ئ/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/ة/g, "ه")
        .replace(/ہ/g, "ه")
        .replace(/أ/g, "ا")
        .replace(/إ/g, "ا")
        .replace(/آ/g, "ا")
        .replace(/ؤ/g, "و")
        .replace(/[\u200c\u200b\u200d]/g, "")
        .toLowerCase();
};

const normalizeStr = (str) =>
    String(str ?? "")
        .trim()
        .replace(/ك/g, "ک")
        .replace(/ي/g, "ی");


export async function readExcelFile(source, fields, options = {}) {
    const { sheetIndex = 0, headerRow = 1 } = options;

    // ── 1. Resolve source to ArrayBuffer ──────────────────────────────────────
    let buffer;

    if (typeof source === "string") {
        const res = await fetch(source);
        if (!res.ok)
            throw Object.assign(
                new Error(`Failed to fetch Excel file: ${source} (HTTP ${res.status})`),
                { type: "NETWORK" }
            );
        buffer = await res.arrayBuffer();
    } else if (source instanceof File) {
        buffer = await source.arrayBuffer();
    } else if (source instanceof ArrayBuffer) {
        buffer = source;
    } else {
        throw new TypeError(
            "readExcelFile: source must be a path string, File, or ArrayBuffer"
        );
    }

    // ── 2. Parse workbook ─────────────────────────────────────────────────────
    const workbook = XLSX.read(buffer, { type: "array" });

    const sheetName = workbook.SheetNames[sheetIndex];
    if (!sheetName)
        throw Object.assign(
            new Error(`Sheet at index ${sheetIndex} not found.`),
            { type: "PARSE" }
        );

    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    if (rows.length < headerRow) return [];

    // ── 3. Map normalized field names → column indices ────────────────────────
    const headerRowData = rows[headerRow - 1];
    const normalizedFields = fields.map(normalizeStr);

    const fieldIndexMap = {}; // normalizedField → column index
    normalizedFields.forEach((normField, i) => {
        const idx = headerRowData.findIndex(
            (cell) => normalizeStr(cell) === normField
        );
        if (idx === -1) {
            console.warn(
                `readExcelFile: column "${fields[i]}" not found in Excel headers.\n` +
                `  Available headers: ${headerRowData.map(normalizeStr).filter(Boolean).join(", ")}`
            );
        }
        fieldIndexMap[normField] = idx;
    });

    // ── 4. Build result rows ──────────────────────────────────────────────────
    const dataRows = rows.slice(headerRow);

    return dataRows
        .filter((row) => row.some((cell) => cell !== "" && cell !== null))
        .map((row) => {
            const obj = {};
            fields.forEach((field) => {
                const normField = normalizeStr(field);
                const idx = fieldIndexMap[normField];
                // Always key the output with the original (non-normalized) field name
                obj[field] = idx !== -1 ? (row[idx] ?? "") : "";
            });
            return obj;
        });
}