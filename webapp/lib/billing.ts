// Pure billing helpers — no framework/Prisma deps, so they stay easy to test.

export type ChargeInput = {
  rent: number;
  furnitureFee: number;
  commonFee: number;
  garbageFee: number;
  elecRate: number;
  waterRate: number;
  waterMin: number;
  elecOld?: number | null;
  elecNew?: number | null;
  waterOld?: number | null;
  waterNew?: number | null;
  other?: number | null;
};

export type ComputedLine = {
  description: string;
  qty: number;
  unit: string;
  unitPrice: number;
  amount: number;
};

export type ComputedBill = {
  lines: ComputedLine[];
  total: number;
  elecUnits: number;
  waterUnits: number;
};

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Compute invoice line items + total from room rates and a meter reading. */
export function computeBill(input: ChargeInput): ComputedBill {
  const lines: ComputedLine[] = [];

  if (input.rent > 0) {
    lines.push({
      description: "ค่าเช่าห้อง",
      qty: 1,
      unit: "เดือน",
      unitPrice: input.rent,
      amount: input.rent,
    });
  }

  if (input.furnitureFee > 0) {
    lines.push({
      description: "ค่าเฟอร์นิเจอร์",
      qty: 1,
      unit: "เดือน",
      unitPrice: input.furnitureFee,
      amount: input.furnitureFee,
    });
  }

  // electricity
  let elecUnits = 0;
  if (input.elecOld != null && input.elecNew != null) {
    elecUnits = Math.max(0, input.elecNew - input.elecOld);
    const amount = round2(elecUnits * input.elecRate);
    lines.push({
      description: `ค่าไฟฟ้า (${input.elecOld} → ${input.elecNew})`,
      qty: elecUnits,
      unit: "หน่วย",
      unitPrice: input.elecRate,
      amount,
    });
  }

  // water — apply minimum charge if usage falls below it
  let waterUnits = 0;
  if (input.waterOld != null && input.waterNew != null) {
    waterUnits = Math.max(0, input.waterNew - input.waterOld);
    const usage = round2(waterUnits * input.waterRate);
    const amount = input.waterMin > 0 ? Math.max(usage, input.waterMin) : usage;
    const minNote =
      input.waterMin > 0 && usage < input.waterMin ? " (ขั้นต่ำ)" : "";
    lines.push({
      description: `ค่าน้ำประปา (${input.waterOld} → ${input.waterNew})${minNote}`,
      qty: waterUnits,
      unit: "หน่วย",
      unitPrice: input.waterRate,
      amount,
    });
  } else if (input.waterMin > 0) {
    lines.push({
      description: "ค่าน้ำประปา (เหมาจ่ายขั้นต่ำ)",
      qty: 1,
      unit: "เดือน",
      unitPrice: input.waterMin,
      amount: input.waterMin,
    });
  }

  if (input.commonFee > 0) {
    lines.push({
      description: "ค่าส่วนกลาง",
      qty: 1,
      unit: "เดือน",
      unitPrice: input.commonFee,
      amount: input.commonFee,
    });
  }

  if (input.garbageFee > 0) {
    lines.push({
      description: "ค่าขยะ",
      qty: 1,
      unit: "เดือน",
      unitPrice: input.garbageFee,
      amount: input.garbageFee,
    });
  }

  if (input.other && input.other > 0) {
    lines.push({
      description: "ค่าใช้จ่ายอื่นๆ",
      qty: 1,
      unit: "รายการ",
      unitPrice: input.other,
      amount: input.other,
    });
  }

  const total = round2(lines.reduce((s, l) => s + l.amount, 0));
  return { lines, total, elecUnits, waterUnits };
}

/** Invoice number: INV-YYYYMM-<room>, unique per room per utility month. */
export function invoiceNumber(
  year: number,
  month: number,
  roomNumber: number
): string {
  return `INV-${year}${String(month).padStart(2, "0")}-${roomNumber}`;
}

// ---- PromptPay EMVCo QR payload ----

function tlv(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function crc16(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/**
 * Build a PromptPay QR payload string.
 * @param id  mobile number (0xxxxxxxxxx) or 13-digit national/tax id
 * @param amount  optional THB amount (omit for a static/any-amount QR)
 */
export function promptPayPayload(id: string, amount?: number): string {
  const clean = id.replace(/[^0-9]/g, "");
  const isTaxId = clean.length === 13;

  let target: string;
  if (isTaxId) {
    target = tlv("02", clean);
  } else {
    // mobile: 0066 + number without leading zero, padded to 13 digits
    const intl = ("66" + clean.replace(/^0/, "")).padStart(13, "0");
    target = tlv("01", intl);
  }

  const merchant = tlv("29", tlv("00", "A000000677010111") + target);

  let payload =
    tlv("00", "01") +
    tlv("01", amount && amount > 0 ? "12" : "11") +
    merchant +
    tlv("53", "764") +
    (amount && amount > 0 ? tlv("54", amount.toFixed(2)) : "") +
    tlv("58", "TH");

  payload += "6304";
  return payload + crc16(payload);
}
