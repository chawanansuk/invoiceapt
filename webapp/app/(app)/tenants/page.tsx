import Link from "next/link";
import { prisma } from "@/lib/prisma";

export default async function TenantsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;

  const tenants = await prisma.tenant.findMany({
    where: q
      ? {
          OR: [
            { name: { contains: q } },
            { phone: { contains: q } },
          ],
        }
      : undefined,
    orderBy: { name: "asc" },
    include: {
      leases: {
        where: { active: true },
        include: { room: true },
        take: 1,
      },
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ผู้เช่า</h1>
        <span className="text-sm text-slate-500">{tenants.length} คน</span>
      </div>

      <form className="flex gap-2">
        <input
          name="q"
          defaultValue={q ?? ""}
          placeholder="ค้นหาชื่อ หรือเบอร์โทร"
          className="flex-1 max-w-sm rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500"
        />
        <button className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium">
          ค้นหา
        </button>
      </form>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">ชื่อ</th>
              <th className="text-left px-4 py-2.5 font-medium">เบอร์โทร</th>
              <th className="text-center px-4 py-2.5 font-medium">ห้องปัจจุบัน</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {tenants.map((t) => {
              const room = t.leases[0]?.room;
              return (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="px-4 py-2.5 font-medium">{t.name}</td>
                  <td className="px-4 py-2.5 text-slate-600">{t.phone ?? "-"}</td>
                  <td className="px-4 py-2.5 text-center">
                    {room ? (
                      <span className="font-medium">{room.number}</span>
                    ) : (
                      <span className="text-slate-400 text-xs">ไม่มีสัญญา</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <Link href={`/tenants/${t.id}`} className="text-blue-600 hover:underline">
                      แก้ไข
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
