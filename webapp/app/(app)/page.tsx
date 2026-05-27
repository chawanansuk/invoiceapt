import Link from "next/link";
import { prisma } from "@/lib/prisma";

function baht(n: number) {
  return n.toLocaleString("th-TH");
}

export default async function DashboardPage() {
  const [total, occupied, tenants, rooms] = await Promise.all([
    prisma.room.count(),
    prisma.room.count({ where: { status: "occupied" } }),
    prisma.tenant.count(),
    prisma.room.findMany({ select: { floor: true, status: true, rent: true } }),
  ]);
  const vacant = total - occupied;
  const monthlyRent = rooms
    .filter((r) => r.status === "occupied")
    .reduce((s, r) => s + r.rent, 0);

  const byFloor = new Map<number, { total: number; occ: number }>();
  for (const r of rooms) {
    const f = byFloor.get(r.floor) ?? { total: 0, occ: 0 };
    f.total++;
    if (r.status === "occupied") f.occ++;
    byFloor.set(r.floor, f);
  }
  const floors = [...byFloor.entries()].sort((a, b) => a[0] - b[0]);

  const cards = [
    { label: "ห้องทั้งหมด", value: total, color: "text-slate-800" },
    { label: "มีผู้เช่า", value: occupied, color: "text-green-600" },
    { label: "ห้องว่าง", value: vacant, color: "text-amber-600" },
    { label: "รายได้ค่าเช่า/เดือน", value: `฿${baht(monthlyRent)}`, color: "text-blue-600" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">ภาพรวม</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className="bg-white rounded-xl border border-slate-200 p-4">
            <p className="text-sm text-slate-500">{c.label}</p>
            <p className={`text-2xl font-bold mt-1 ${c.color}`}>{c.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <h2 className="font-semibold mb-3">สถานะตามชั้น</h2>
        <div className="space-y-2">
          {floors.map(([floor, s]) => (
            <div key={floor} className="flex items-center gap-3">
              <span className="w-14 text-sm text-slate-600">ชั้น {floor}</span>
              <div className="flex-1 h-5 bg-slate-100 rounded overflow-hidden">
                <div
                  className="h-full bg-green-500"
                  style={{ width: `${(s.occ / s.total) * 100}%` }}
                />
              </div>
              <span className="text-sm text-slate-500 w-20 text-right">
                {s.occ}/{s.total} ห้อง
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Link href="/rooms" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          จัดการห้องพัก
        </Link>
        <Link href="/tenants" className="rounded-lg bg-white border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50">
          จัดการผู้เช่า
        </Link>
      </div>
    </div>
  );
}
