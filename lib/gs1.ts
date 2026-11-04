// Reads the text inside a medicine barcode.
//
// A normal box barcode (EAN-13) holds only the product number.
// The square 2D codes (GS1 DataMatrix) hold numbered parts called "application identifiers":
//   01 = product number (GTIN, always 14 digits)
//   17 = expiry date (YYMMDD)
//   10 = batch number (any length, ends with a separator)
//   21 = serial number (any length, ends with a separator)
//   11 = production date (YYMMDD)
// Example: "(01)06290000000011(17)280531(10)LOT42" is product 06290000000011, expiring 31 May 2028, batch LOT42.

export interface ScannedCode {
  // The product number, always 14 digits, or null if the code had none.
  gtin: string | null;
  // "YYYY-MM-DD", or null.
  expiry: string | null;
  batch: string | null;
  // What the scanner gave, for codes we can't read (some local products use their own codes).
  raw: string;
}

// The invisible separator (GS) that ends a part of any length.
const GS = "\u001d";

// "280531" becomes "2028-05-31". A day of "00" means the last day of that month.
function toDate(yymmdd: string) {
  if (!/^\d{6}$/.test(yymmdd)) return null;
  const year = 2000 + Number(yymmdd.slice(0, 2));
  const month = Number(yymmdd.slice(2, 4));
  let day = Number(yymmdd.slice(4, 6));
  if (month < 1 || month > 12) return null;
  if (day === 0) day = new Date(year, month, 0).getDate();
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function parseBarcode(input: string): ScannedCode {
  const raw = input.trim();
  const result: ScannedCode = { gtin: null, expiry: null, batch: null, raw };
  // Some scanners add a 3-letter type marker at the start, like "]d2". It is not part of the code.
  let text = raw.replace(/^\][A-Za-z]\d/, "");

  // A plain box barcode: only digits. Padding to 14 makes it match the product number inside 2D codes.
  if (/^\d{8,14}$/.test(text)) return { ...result, gtin: text.padStart(14, "0") };

  // The printed form "(01)...(17)..." becomes the scanner form, with a separator before each part.
  if (text.startsWith("(")) text = text.replace(/\((\d{2})\)/g, (_match, ai: string, offset: number) => (offset === 0 ? "" : GS) + ai);

  let i = 0;
  while (i < text.length) {
    if (text[i] === GS) {
      i++;
      continue;
    }
    const ai = text.slice(i, i + 2);
    if (ai === "01") {
      result.gtin = text.slice(i + 2, i + 16);
      i += 16;
    } else if (ai === "17" || ai === "11") {
      if (ai === "17") result.expiry = toDate(text.slice(i + 2, i + 8));
      i += 8;
    } else if (ai === "10" || ai === "21") {
      const end = text.indexOf(GS, i + 2);
      if (ai === "10") result.batch = text.slice(i + 2, end === -1 ? undefined : end);
      i = end === -1 ? text.length : end + 1;
    } else {
      // A part we don't know: stop, and keep what we already read.
      break;
    }
  }
  if (result.gtin && !/^\d{14}$/.test(result.gtin)) result.gtin = null;
  return result;
}

// The key a stock item is saved under: the product number when there is one, otherwise the raw code.
export const barcodeKey = (code: ScannedCode) => code.gtin ?? code.raw;
