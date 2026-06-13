import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { baht } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  unpaid: "ค้างชำระ",
  partial: "ชำระบางส่วน",
  paid: "ชำระแล้ว",
};
const STATUS_STYLE: Record<string, string> = {
  unpaid: "bg-red-100 text-red-700",
  partial: "bg-amber-100 text-amber-700",
  paid: "bg-green-100 text-green-700",
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; month?: string }>;
}) {
  const sp = await searchParams;
  const status = sp.status;
  const month = sp.month;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(month ? { utilityMonth: month } : {}),
    },
    orderBy: [{ createdAt: "desc" }],
    include: {
      room: { include: { leases: { where: { active: true }, include: { tenant: true }, take: 1 } } },
      payments: true,
    },
  });

  const months = await prisma.invoice.findMany({
    distinct: ["utilityMonth"],
    select: { utilityMonth: true },
    orderBy: { createdAt: "desc" },
  });

  const totalOutstanding = invoices
    .filter((i) => i.status !== "paid")
    .reduce((s, i) => {
      const paid = i.payments.filter((p) => p.status === "confirmed").reduce((a, p) => a + p.amount, 0);
      return s + (i.total - paid);
    }, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">ใบแจ้งหนี้</h1>
        <Link href="/billing" className="rounded-lg bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-700">
          ออกบิลรายเดือน
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Chip label="ทั้งหมด" href="/invoices" active={!status && !month} />
        <Chip label="ค้างชำระ" href="/invoices?status=unpaid" active={status === "unpaid"} />
        <Chip label="ชำระบางส่วน" href="/invoices?status=partial" active={status === "partial"} />
        <Chip label="ชำระแล้ว" href="/invoices?status=paid" active={status === "paid"} />
        {months.length > 0 && <span className="w-px h-5 bg-slate-200 mx-1" />}
        {months.map((m) => (
          <Chip
            key={m.utilityMonth}
            label={m.utilityMonth}
            href={`/invoices?month=${encodeURIComponent(m.utilityMonth)}`}
            active={month === m.utilityMonth}
          />
        ))}
      </div>

      {totalOutstanding > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800">
          ยอดค้างชำระรวม <span className="font-bold">฿{baht(totalOutstanding)}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2.5 font-medium">เลขที่</th>
              <th className="text-center px-3 py-2.5 font-medium">ห้อง</th>
              <th className="text-left px-3 py-2.5 font-medium">ผู้เช่า</th>
              <th className="text-left px-3 py-2.5 font-medium">รอบบิล</th>
              <th className="text-right px-4 py-2.5 font-medium">ยอดรวม</th>
              <th className="text-center px-3 py-2.5 font-medium">สถานะ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                  ยังไม่มีใบแจ้งหนี้ — ไปที่ “ออกบิลรายเดือน”
                </td>
              </tr>
            )}
            {invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50">
                <td className="px-4 py-2.5">
                  <Link href={`/invoices/${inv.id}`} className="text-blue-600 hover:underline font-medium">
                    {inv.number}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-center">{inv.room.number}</td>
                <td className="px-3 py-2.5 text-slate-600 max-w-[160px] truncate">
                  {inv.room.leases[0]?.tenant.name ?? "-"}
                </td>
                <td className="px-3 py-2.5 text-slate-500">{inv.utilityMonth}</td>
                <td className="px-4 py-2.5 text-right font-medium tabular-nums">฿{baht(inv.total)}</td>
                <td className="px-3 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[inv.status]}`}>
                    {STATUS_LABEL[inv.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Chip({ label, href, active }: { label: string; href: string; active: boolean }) {
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
