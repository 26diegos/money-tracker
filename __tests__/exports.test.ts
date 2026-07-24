import { describe, expect, it } from "vitest";
import { createCsv, createExportDate } from "@/lib/exports";

describe("CSV exports", () => {
  it("escapes commas, quotes, and line breaks", () => {
    const csv = createCsv(
      ["name", "notes"],
      [
        ["Alejandra", "Flight, three installments"],
        ['Diego "D"', "First line\nSecond line"],
      ],
    );

    expect(csv).toBe(
      [
        "name,notes",
        'Alejandra,"Flight, three installments"',
        '"Diego ""D""","First line\nSecond line"',
      ].join("\r\n"),
    );
  });

  it("writes null values as empty cells and dates as ISO timestamps", () => {
    const date = new Date("2026-07-24T12:34:56.000Z");

    expect(createCsv(["notes", "createdAt"], [[null, date]])).toBe(
      "notes,createdAt\r\n,2026-07-24T12:34:56.000Z",
    );
  });
});

describe("export filenames", () => {
  it("uses the UTC calendar date", () => {
    expect(createExportDate(new Date("2026-07-24T23:59:59.000Z"))).toBe(
      "2026-07-24",
    );
  });
});
