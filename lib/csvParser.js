export const parseCSV = (csvText) => {
  if (!csvText || typeof csvText !== "string") {
    throw new Error("CSV_INVALID_INPUT");
  }

  const lines = csvText.trim().split("\n").filter((l) => l.trim() !== "");
  if (lines.length < 2) {
    throw new Error("CSV_INSUFFICIENT_ROWS");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  if (headers.length < 2) {
    throw new Error("CSV_INVALID_HEADERS");
  }

  return lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim());
    return headers.reduce((obj, header, idx) => {
      obj[header] = values[idx] ?? "";
      return obj;
    }, {});
  });
};