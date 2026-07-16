"use client";

import { useState } from "react";
import Link from "next/link";
import { useFormStatus } from "react-dom";
import { computeBill } from "@/lib/billing";
import { baht } from "@/lib/format";
import { saveReadings, ocrMeterAction } from "./actions";
import CameraButton from "../camera-button";

export type RoomRow = {
  roomId: number;
  roomNumber: number;
  tenantName: string;
  elecOld: number | null;
  elecNew: number | null;
  waterOld: number | null;
  waterNew: number | null;
  other: number;
  rent: number;
  furnitureFee: number;
  commonFee: number;
  garbageFee: number;
  elecRate: number;
  waterRate: number;
  waterMin: number;
  invoiceId: number | null;
};

type RowState = {
  elecOld: string;
  elecNew: string;
  waterOld: string;
  waterNew: string;
  other: string;
};

function toStr(n: number | null): string {
  return n == null ? "" : String(n);
}
function toNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = parseFloat(t);
  return isNaN(n) ? null : n;
}

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-green-600 text-white px-5 py-2 text-sm font-medium hover:bg-green-700 disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : "บันทึกมิเตอร์ทั้งหมด"}
    </button>
  );
}

const cell =
  "w-20 rounded border border-slate-300 px-2 py-1 text-right text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-200";

export default function MeterTable({
  year,
  month,
  rows,
}: {
  year: number;
  month: number;
  rows: RoomRow[];
}) {
  const [state, setState] = useState<Record<number, RowState>>(() => {
    const init: Record<number, RowState> = {};
    for (const r of rows) {
      init[r.roomId] = {
        elecOld: toStr(r.elecOld),
        elecNew: toStr(r.elecNew),
        waterOld: toStr(r.waterOld),
        waterNew: toStr(r.waterNew),
        other: r.other ? String(r.other) : "",
      };
    }
    return init;
  });

  function update(roomId: number, field: keyof RowState, value: string) {
    setState((s) => ({ ...s, [roomId]: { ...s[roomId], [field]: value } }));
  }

  function previewTotal(r: RoomRow): number {
    const s = state[r.roomId];
    return computeBill({
      rent: r.rent,
      furnitureFee: r.furnitureFee,
      commonFee: r.commonFee,
      garbageFee: r.garbageFee,
      elecRate: r.elecRate,
      waterRate: r.waterRate,
      waterMin: r.waterMin,
      elecOld: toNum(s.elecOld),
      elecNew: toNum(s.elecNew),
      waterOld: toNum(s.waterOld),
      waterNew: toNum(s.waterNew),
      other: toNum(s.other),
    }).total;
  }

  return (
    <form action={saveReadings} className="space-y-4">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <input type="hidden" name="roomIds" value={rows.map((r) => r.roomId).join(",")} />

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[760px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-3 py-2 font-medium">ห้อง</th>
              <th className="text-left px-3 py-2 font-medium">ผู้เช่า</th>
              <th className="text-center px-2 py-2 font-medium" colSpan={2}>
                ไฟฟ้า (เก่า/ใหม่)
              </th>
              <th className="text-center px-2 py-2 font-medium" colSpan={2}>
                น้ำ (เก่า/ใหม่)
              </th>
              <th className="text-right px-3 py-2 font-medium">อื่นๆ</th>
              <th className="text-right px-3 py-2 font-medium">รวม (ประมาณ)</th>
              <th className="text-center px-3 py-2 font-medium">บิล</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rows.map((r) => {
              const s = state[r.roomId];
              return (
                <tr key={r.roomId} className="hover:bg-slate-50">
                  <td className="px-3 py-1.5 font-medium">{r.roomNumber}</td>
                  <td className="px-3 py-1.5 text-slate-600 max-w-[140px] truncate">
                    {r.tenantName}
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      name={`elecOld_${r.roomId}`}
                      value={s.elecOld}
                      onChange={(e) => update(r.roomId, "elecOld", e.target.value)}
                      inputMode="decimal"
                      className={cell}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        name={`elecNew_${r.roomId}`}
                        value={s.elecNew}
                        onChange={(e) => update(r.roomId, "elecNew", e.target.value)}
                        inputMode="decimal"
                        className={cell}
                      />
                      <CameraButton
                        title={`ถ่ายรูปมิเตอร์ไฟ ห้อง ${r.roomNumber}`}
                        className="h-7 w-7 shrink-0"
                        onCapture={async (d) => {
                          const res = await ocrMeterAction(d, "elec");
                          if (res.ok && res.value > 0)
                            update(r.roomId, "elecNew", String(res.value));
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      name={`waterOld_${r.roomId}`}
                      value={s.waterOld}
                      onChange={(e) => update(r.roomId, "waterOld", e.target.value)}
                      inputMode="decimal"
                      className={cell}
                    />
                  </td>
                  <td className="px-1 py-1.5">
                    <div className="flex items-center gap-1">
                      <input
                        name={`waterNew_${r.roomId}`}
                        value={s.waterNew}
                        onChange={(e) => update(r.roomId, "waterNew", e.target.value)}
                        inputMode="decimal"
                        className={cell}
                      />
                      <CameraButton
                        title={`ถ่ายรูปมิเตอร์น้ำ ห้อง ${r.roomNumber}`}
                        className="h-7 w-7 shrink-0"
                        onCapture={async (d) => {
                          const res = await ocrMeterAction(d, "water");
                          if (res.ok && res.value > 0)
                            update(r.roomId, "waterNew", String(res.value));
                        }}
                      />
                    </div>
                  </td>
                  <td className="px-1 py-1.5">
                    <input
                      name={`other_${r.roomId}`}
                      value={s.other}
                      onChange={(e) => update(r.roomId, "other", e.target.value)}
                      inputMode="decimal"
                      className={cell}
                    />
                  </td>
                  <td className="px-3 py-1.5 text-right font-medium tabular-nums">
                    ฿{baht(previewTotal(r))}
                  </td>
                  <td className="px-3 py-1.5 text-center">
                    {r.invoiceId ? (
                      <Link
                        href={`/invoices/${r.invoiceId}`}
                        className="text-green-600 hover:underline text-xs"
                      >
                        ออกแล้ว ✓
                      </Link>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3">
        <SaveButton />
        <span className="text-xs text-slate-400">
          บันทึกมิเตอร์ก่อน แล้วจึงกดออกใบแจ้งหนี้ด้านล่าง
        </span>
      </div>
    </form>
  );
}
