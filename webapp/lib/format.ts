export const THAI_MONTHS = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

/** "เมษายน 2569" — month label in Thai with Buddhist year. */
export function monthLabel(year: number, month: number): string {
  return `${THAI_MONTHS[month - 1]} ${year + 543}`;
}

/** "เม.ย. 69" — short month label. */
export function monthShort(year: number, month: number): string {
  const m = THAI_MONTHS[month - 1].slice(0, 3) + ".";
  return `${m} ${(year + 543) % 100}`;
}

/** Thai baht with thousands separators and 2 decimals when needed. */
export function baht(n: number): string {
  return n.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
}

export function fullDate(d: Date | string): string {
  const date = typeof d === "string" ? new Date(d) : d;
  return `${date.getDate()} ${THAI_MONTHS[date.getMonth()]} ${
    date.getFullYear() + 543
  }`;
}

/** Previous (year, month), 1-based month. */
export function prevMonth(year: number, month: number): [number, number] {
  return month === 1 ? [year - 1, 12] : [year, month - 1];
}
