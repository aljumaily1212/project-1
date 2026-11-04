// Builds a real Excel (.xlsx) file in the browser and asks the user where to save it.
// Arabic sheets are right-to-left, the header row is bold and stays in place while scrolling.

export type ExcelColumn<T> = {
  header: string;
  value: (row: T) => string | number | null;
  // Width in characters. Wider for names, narrower for numbers.
  width?: number;
};

export type ExcelSheet = { name: string; columns: ExcelColumn<unknown>[]; rows: unknown[] };

// Describes one sheet. Each page's rows have their own type; this checks the columns against it,
// then hides the type so sheets of different rows can go into one file.
export const sheet = <T,>(name: string, columns: ExcelColumn<T>[], rows: T[]): ExcelSheet => ({ name, columns, rows }) as unknown as ExcelSheet;

export async function downloadExcel(fileName: string, sheets: ExcelSheet[], rightToLeft: boolean) {
  // Loaded only when someone exports, so pages stay light for everyone else.
  const { default: writeExcelFile } = await import("write-excel-file/browser");
  const data = sheets.map((sheet) => ({
    sheet: sheet.name.slice(0, 31), // Excel refuses sheet names longer than 31 characters.
    rightToLeft,
    stickyRowsCount: 1,
    columns: sheet.columns.map((c) => ({ width: c.width ?? 18 })),
    data: [
      sheet.columns.map((c) => ({ value: c.header, fontWeight: "bold" as const })),
      ...sheet.rows.map((row) =>
        sheet.columns.map((c) => {
          const value = c.value(row);
          // Numbers stay numbers, so Excel can add them up.
          return value === null ? null : typeof value === "number" ? { value, type: Number } : { value: String(value), type: String };
        }),
      ),
    ],
  }));
  await writeExcelFile(data).toFile(`${fileName}.xlsx`);
}
