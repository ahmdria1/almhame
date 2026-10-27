export function splitVatInclusive(totalHalalas: number, rateBps = 1500) {
  if (!Number.isInteger(totalHalalas) || totalHalalas < 0) {
    throw new Error("amount must be a non-negative integer of halalas");
  }
  const subtotalHalalas = Math.round((totalHalalas * 10000) / (10000 + rateBps));
  const vatHalalas = totalHalalas - subtotalHalalas;
  return { subtotalHalalas, vatHalalas, totalHalalas, vatRateBps: rateBps };
}

export function halalasToSar(halalas: number): string {
  return (halalas / 100).toFixed(2);
}

function tlv(tag: number, value: string): Buffer {
  const bytes = Buffer.from(value, "utf8");
  if (bytes.length > 255) throw new Error("field too long for invoice qr");
  return Buffer.concat([Buffer.from([tag, bytes.length]), bytes]);
}

export function zatcaQrBase64(input: {
  sellerName: string;
  vatNumber: string;
  timestamp: string;
  totalSar: string;
  vatSar: string;
}): string {
  return Buffer.concat([
    tlv(1, input.sellerName),
    tlv(2, input.vatNumber),
    tlv(3, input.timestamp),
    tlv(4, input.totalSar),
    tlv(5, input.vatSar),
  ]).toString("base64");
}

export function nextInvoiceNumber(year: number, sequence: number): string {
  return `ELW-${year}-${String(sequence).padStart(6, "0")}`;
}
