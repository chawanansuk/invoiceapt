import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateTenant } from "./actions";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenant = await prisma.tenant.findUnique({
    where: { id: Number(id) },
    include: {
      leases: {
        include: { room: true },
        orderBy: { id: "desc" },
      },
    },
  });
  if (!tenant) notFound();

  const active = tenant.leases.find((l) => l.active);

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-3">
        <Link href="/tenants" className="text-slate-400 hover:text-slate-600">
          ← ผู้เช่า
        </Link>
        <h1 className="text-2xl font-bold">{tenant.name}</h1>
        {active && (
          <Link
            href={`/rooms/${active.roomId}`}
            className="text-sm bg-slate-100 rounded-full px-3 py-0.5 text-slate-600 hover:bg-slate-200"
          >
            ห้อง {active.room.number}
          </Link>
        )}
      </div>

      <form action={updateTenant} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <input type="hidden" name="tenantId" value={tenant.id} />
        <label className="block">
          <span className="text-sm text-slate-600">ชื่อ *</span>
          <input name="name" required defaultValue={tenant.name} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <div className="grid sm:grid-cols-2 gap-4">
          <label className="block">
            <span className="text-sm text-slate-600">เบอร์โทร</span>
            <input name="phone" defaultValue={tenant.phone ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
          <label className="block">
            <span className="text-sm text-slate-600">ที่ทำงาน</span>
            <input name="workplace" defaultValue={tenant.workplace ?? ""} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
          </label>
        </div>
        <label className="block">
          <span className="text-sm text-slate-600">ที่อยู่</span>
          <textarea name="address" defaultValue={tenant.address ?? ""} rows={2} className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
        </label>
        <button className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700">
          บันทึก
        </button>
      </form>

      {tenant.leases.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3">ประวัติการเช่า</h2>
          <ul className="space-y-2 text-sm">
            {tenant.leases.map((l) => (
              <li key={l.id} className="flex items-center justify-between">
                <span>
                  ห้อง {l.room.number}
                  {l.contractNo ? ` · ${l.contractNo}` : ""}
                </span>
                <span className={l.active ? "text-green-600" : "text-slate-400"}>
                  {l.active ? "กำลังเช่า" : "สิ้นสุดแล้ว"}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
