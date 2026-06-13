import { prisma } from "@/lib/prisma";
import { monthLabel, prevMonth } from "@/lib/format";
import { invoiceNumber } from "@/lib/billing";
import MeterTable, { type RoomRow } from "./meter-table";
import MonthPicker from "./month-picker";
import { generateAllInvoices } from "./actions";

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string; month?: string }>;
}) {
  const sp = await searchParams;

  // default to the most recent month that has readings, else current month
  let year = sp.year ? Number(sp.year) : 0;
  let month = sp.month ? Number(sp.month) : 0;
  if (!year || !month) {
    const latest = await prisma.meterReading.findFirst({
      orderBy: [{ year: "desc" }, { month: "desc" }],
      select: { year: true, month: true },
    });
    const now = new Date();
    year = latest?.year ?? now.getFullYear();
    month = latest?.month ?? now.getMonth() + 1;
  }

  const [py, pm] = prevMonth(year, month);

  const rooms = await prisma.room.findMany({
    where: { status: "occupied" },
    orderBy: { number: "asc" },
    include: { leases: { where: { active: true }, include: { tenant: true }, take: 1 } },
  });

  const [curReadings, prevReadings] = await Promise.all([
    prisma.meterReading.findMany({ where: { year, month } }),
    prisma.meterReading.findMany({ where: { year: py, month: pm } }),
  ]);
  const curMap = new Map(curReadings.map((r) => [r.roomId, r]));
  const prevMap = new Map(prevReadings.map((r) => [r.roomId, r]));

  // which rooms already have an invoice for this month
  const numbers = rooms.map((r) => invoiceNumber(year, month, r.number));
  const invoices = await prisma.invoice.findMany({
    where: { number: { in: numbers } },
    select: { id: true, roomId: true },
  });
  const invMap = new Map(invoices.map((i) => [i.roomId, i.id]));

  const rows: RoomRow[] = rooms.map((room) => {
    const cur = curMap.get(room.id);
    const prev = prevMap.get(room.id);
    return {
      roomId: room.id,
      roomNumber: room.number,
      tenantName: room.leases[0]?.tenant.name ?? "",
      elecOld: cur?.elecOld ?? prev?.elecNew ?? null,
      elecNew: cur?.elecNew ?? null,
      waterOld: cur?.waterOld ?? prev?.waterNew ?? null,
      waterNew: cur?.waterNew ?? null,
      other: cur?.other ?? 0,
      rent: room.rent,
      furnitureFee: room.furnitureFee,
      commonFee: room.commonFee,
      garbageFee: room.garbageFee,
      elecRate: room.elecRate,
      waterRate: room.waterRate,
      waterMin: room.waterMin,
      invoiceId: invMap.get(room.id) ?? null,
    };
  });

  const pending = rows.filter((r) => !r.invoiceId).length;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">ออกบิลรายเดือน</h1>
          <p className="text-slate-500 text-sm mt-0.5">
            รอบบิล {monthLabel(year, month)} · {rows.length} ห้องมีผู้เช่า
          </p>
        </div>
        <MonthPicker year={year} month={month} />
      </div>

      <MeterTable year={year} month={month} rows={rows} />

      {pending > 0 && (
        <form
          action={generateAllInvoices}
          className="bg-white rounded-xl border border-slate-200 p-4 flex items-center justify-between"
        >
          <input type="hidden" name="year" value={year} />
          <input type="hidden" name="month" value={month} />
          <p className="text-sm text-slate-600">
            ยังไม่ออกใบแจ้งหนี้ <span className="font-semibold">{pending}</span> ห้อง
            <span className="text-slate-400"> (บันทึกมิเตอร์ก่อนออกบิล)</span>
          </p>
          <button className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
            ออกใบแจ้งหนี้ที่เหลือทั้งหมด
          </button>
        </form>
      )}
    </div>
  );
}
