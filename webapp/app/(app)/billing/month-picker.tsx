"use client";

import { useRouter } from "next/navigation";
import { THAI_MONTHS } from "@/lib/format";

export default function MonthPicker({
  year,
  month,
}: {
  year: number;
  month: number;
}) {
  const router = useRouter();
  const thisYear = new Date().getFullYear();
  const years = [thisYear - 1, thisYear, thisYear + 1];

  function go(y: number, m: number) {
    router.push(`/billing?year=${y}&month=${m}`);
  }

  return (
    <div className="flex items-center gap-2">
      <select
        value={month}
        onChange={(e) => go(year, Number(e.target.value))}
        className="rounded-lg border border-slate-300 px-3 py-2 bg-white text-sm outline-none focus:border-blue-500"
      >
        {THAI_MONTHS.map((m, i) => (
          <option key={i} value={i + 1}>
            {m}
          </option>
        ))}
      </select>
      <select
        value={year}
        onChange={(e) => go(Number(e.target.value), month)}
        className="rounded-lg border border-slate-300 px-3 py-2 bg-white text-sm outline-none focus:border-blue-500"
      >
        {years.map((y) => (
          <option key={y} value={y}>
            {y + 543}
          </option>
        ))}
      </select>
    </div>
  );
}
