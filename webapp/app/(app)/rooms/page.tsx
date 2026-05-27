import Link from "next/link";
import { prisma } from "@/lib/prisma";

function baht(n: number) {
  return n.toLocaleString("th-TH");
}

export default async function RoomsPage({
  searchParams,
}: {
  searchParams: Promise<{ floor?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const floor = sp.floor ? Number(sp.floor) : undefined;
  const status = sp.status;

  const rooms = await prisma.room.findMany({
    where: {
      ...(floor ? { floor } : {}),
      ...(status ? { status } : {}),
    },
    orderBy: { number: "asc" },
    include: {
      bankAccount: true,
      leases: { where: { active: true }, include: { tenant: true }, take: 1 },
    },
  });

  const floors = [2, 3, 4, 5, 6];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ห้องพัก</h1>
        <span className="text-sm text-slate-500">{rooms.length} ห้อง</span>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <FilterLink label="ทั้งหมด" href="/rooms" active={!floor && !status} />
        {floors.map((f) => (
          <FilterLink key={f} label={`ชั้น ${f}`} href={`/rooms?floor=${f}`} active={floor === f} />
        ))}
        <span className="w-px bg-slate-200 mx-1" />
        <FilterLink label="มีผู้เช่า" href="/rooms?status=occupied" active={status === "occupied"} />
        <FilterLink label="ห้องว่าง" href="/rooms?status=vacant" active={status === "vacant"} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">ห้อง</th>
              <th className="text-left px-4 py-2.5 font-medium">ผู้เช่า</th>
              <th className="text-right px-4 py-2.5 font-medium">ค่าเช่า</th>
              <th className="text-center px-4 py-2.5 font-medium">สถานะ</th>
              <th className="text-left px-4 py-2.5 font-medium hidden md:table-cell">บัญชีรับเงิน</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {rooms.map((r) => {
              const tenant = r.leases[0]?.tenant;
              return (
                <tr key={r.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium">{r.number}</td>
                  <td className="px-4 py-2.5 text-slate-600">
                    {tenant?.name ?? <span className="text-slate-400">— ว่าง —</span>}
                  </td>
                  <td className="px-4 py-2.5 text-right">฿{baht(r.rent)}</td>
                  <td className="px-4 py-2.5 text-center">
                    <StatusBadge status={r.status} />
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 hidden md:table-cell">
                    {r.bankAccount?.bankName}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/rooms/${r.id}`} className="text-blue-600 hover:underline">
                      จัดการ
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterLink({ label, href, active }: { label: string; href: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1.5 rounded-lg font-medium ${
        active ? "bg-slate-800 text-white" : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
      }`}
    >
      {label}
    </Link>
  );
}

function StatusBadge({ status }: { status: string }) {
  const occ = status === "occupied";
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${
        occ ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
      }`}
    >
      {occ ? "มีผู้เช่า" : "ว่าง"}
    </span>
  );
}
