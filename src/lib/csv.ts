import type { RawDataset } from "../types";

export function parseCsv(text: string, fileName: string): RawDataset {
  const rows = parseRows(text.replace(/^\uFEFF/, ""));
  const headers = rows[0]?.map((header) => header.trim()) ?? [];
  const records = rows.slice(1).filter((row) => row.some(Boolean)).map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      record[header] = row[index]?.trim() ?? "";
    });
    return record;
  });

  return {
    fileName,
    headers,
    rows: records,
    importedAt: new Date().toISOString()
  };
}

function parseRows(text: string): string[][] {
  const result: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      cell += '"';
      i += 1;
      continue;
    }

    if (char === '"') {
      inQuotes = !inQuotes;
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(cell);
      cell = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i += 1;
      row.push(cell);
      result.push(row);
      row = [];
      cell = "";
      continue;
    }

    cell += char;
  }

  if (cell.length > 0 || row.length > 0) {
    row.push(cell);
    result.push(row);
  }

  return result;
}
