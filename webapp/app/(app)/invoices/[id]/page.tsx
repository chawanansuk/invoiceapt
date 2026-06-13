import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { baht, fullDate } from "@/lib/format";
import PaymentForm from "./payment-form";
import { setPaymentStatus, deletePayment, deleteInvoice } from "./actions";

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

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(id) },
    include: {
      lines: true,
      payments: { orderBy: { paidDate: "desc" } },
      room: { include: { leases: { where: { active: true }, include: { tenant: true }, take: 1 } } },
    },
  });
  if (!invoice) notFound();

  const tenant = invoice.room.leases[0]?.tenant;
  const confirmed = invoice.payments
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, invoice.total - confirmed);

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/invoices" className="text-slate-400 hover:text-slate-600">
          ← ใบแจ้งหนี้
        </Link>
        <h1 className="text-2xl font-bold">{invoice.number}</h1>
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLE[invoice.status]}`}>
          {STATUS_LABEL[invoice.status]}
        </span>
        <div className="ml-auto flex gap-2">
          <Link
            href={`/invoices/${invoice.id}/print`}
            className="rounded-lg bg-slate-800 text-white px-4 py-2 text-sm font-medium hover:bg-slate-700"
          >
            พิมพ์ / PDF
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <Info label="ห้อง" value={`${invoice.room.number} (ชั้น ${invoice.room.floor})`} />
        <Info label="ผู้เช่า" value={tenant?.name ?? "-"} />
        <Info label="รอบบิล" value={invoice.utilityMonth} />
      </div>

      {/* line items */}
      <section className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="text-left px-4 py-2 font-medium">รายการ</th>
              <th className="text-right px-3 py-2 font-medium">จำนวน</th>
              <th className="text-right px-3 py-2 font-medium">หน่วยละ</th>
              <th className="text-right px-4 py-2 font-medium">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoice.lines.map((l) => (
              <tr key={l.id}>
                <td className="px-4 py-2">{l.description}</td>
                <td className="px-3 py-2 text-right text-slate-500">
                  {l.qty} {l.unit}
                </td>
                <td className="px-3 py-2 text-right text-slate-500">฿{baht(l.unitPrice)}</td>
                <td className="px-4 py-2 text-right tabular-nums">฿{baht(l.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-slate-200 font-semibold">
              <td className="px-4 py-2.5" colSpan={3}>
                ยอดรวมทั้งสิ้น
              </td>
              <td className="px-4 py-2.5 text-right text-lg tabular-nums">฿{baht(invoice.total)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* payment summary */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">ชำระแล้ว</p>
          <p className="text-xl font-bold text-green-600">฿{baht(confirmed)}</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-sm text-slate-500">คงเหลือ</p>
          <p className="text-xl font-bold text-red-600">฿{baht(outstanding)}</p>
        </div>
      </div>

      {/* payments list */}
      {invoice.payments.length > 0 && (
        <section className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <h2 className="font-semibold">ประวัติการชำระ</h2>
          <ul className="divide-y divide-slate-100">
            {invoice.payments.map((p) => (
              <li key={p.id} className="py-3 flex items-start gap-3">
                {p.slipUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={p.slipUrl} target="_blank" rel="noreferrer">
                    <img src={p.slipUrl} alt="สลิป" className="h-16 w-16 rounded-lg border border-slate-200 object-cover" />
                  </a>
                ) : (
                  <div className="h-16 w-16 rounded-lg bg-slate-100 flex items-center justify-center text-slate-300 text-xs">
                    ไม่มีสลิป
                  </div>
                )}
                <div className="flex-1">
                  <p className="font-medium tabular-nums">฿{baht(p.amount)}</p>
                  <p className="text-xs text-slate-500">{fullDate(p.paidDate)}</p>
                  {p.note && <p className="text-xs text-slate-400">{p.note}</p>}
                  <span
                    className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                      p.status === "confirmed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {p.status === "confirmed" ? "ยืนยันแล้ว" : "รอยืนยัน"}
                  </span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {p.status === "confirmed" ? (
                    <form action={setPaymentStatus}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="status" value="pending" />
                      <button className="text-xs text-amber-600 hover:underline">ยกเลิกยืนยัน</button>
                    </form>
                  ) : (
                    <form action={setPaymentStatus}>
                      <input type="hidden" name="paymentId" value={p.id} />
                      <input type="hidden" name="invoiceId" value={invoice.id} />
                      <input type="hidden" name="status" value="confirmed" />
                      <button className="text-xs text-green-600 hover:underline">ยืนยันรับเงิน</button>
                    </form>
                  )}
                  <form action={deletePayment}>
                    <input type="hidden" name="paymentId" value={p.id} />
                    <input type="hidden" name="invoiceId" value={invoice.id} />
                    <button className="text-xs text-red-500 hover:underline">ลบ</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* record payment */}
      {invoice.status !== "paid" && (
        <section className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold mb-3">บันทึกการชำระเงิน</h2>
          <PaymentForm invoiceId={invoice.id} outstanding={outstanding} />
        </section>
      )}

      {/* danger */}
      <form action={deleteInvoice} className="pt-2">
        <input type="hidden" name="invoiceId" value={invoice.id} />
        <button className="text-sm text-red-500 hover:underline">ลบใบแจ้งหนี้นี้</button>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 px-4 py-3">
      <span className="text-slate-400 text-xs">{label}</span>
      <p className="text-slate-800 font-medium">{value}</p>
    </div>
  );
}
