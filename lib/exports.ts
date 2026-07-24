export type CsvValue = string | number | Date | null | undefined;

export function createCsv(
  headers: readonly string[],
  rows: readonly (readonly CsvValue[])[],
) {
  return [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ].join("\r\n");
}

export function createExportDate(date: Date) {
  return date.toISOString().slice(0, 10);
}

function escapeCsvCell(value: CsvValue) {
  const text = value instanceof Date ? value.toISOString() : String(value ?? "");

  if (/[",\r\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }

  return text;
}
