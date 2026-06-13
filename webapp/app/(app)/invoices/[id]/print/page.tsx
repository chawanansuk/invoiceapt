import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { baht, fullDate } from "@/lib/format";
import { promptPayPayload } from "@/lib/billing";
import PrintButton from "./print-button";

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { id: Number(id) },
    include: {
      lines: true,
      room: {
        include: {
          bankAccount: true,
          leases: { where: { active: true }, include: { tenant: true }, take: 1 },
        },
      },
    },
  });
  if (!invoice) notFound();

  const profile = await prisma.billingProfile.findUnique({ where: { key: "normal" } });
  const tenant = invoice.room.leases[0]?.tenant;
  const bank = invoice.room.bankAccount;

  let qrDataUrl: string | null = null;
  if (bank?.promptpayId) {
    const payload = promptPayPayload(bank.promptpayId, invoice.total);
    qrDataUrl = await QRCode.toDataURL(payload, { width: 220, margin: 1 });
  }

  return (
    <div className="space-y-4">
      <div className="no-print flex items-center gap-3">
        <Link href={`/invoices/${invoice.id}`} className="text-slate-400 hover:text-slate-600">
          ← กลับ
        </Link>
        <PrintButton />
        <span className="text-xs text-slate-400">
          เลือก “บันทึกเป็น PDF” ในหน้าต่างการพิมพ์เพื่อบันทึกไฟล์
        </span>
      </div>

      <div className="print-sheet bg-white mx-auto max-w-2xl border border-slate-200 rounded-xl p-8 text-[13px] leading-relaxed text-slate-800">
        {/* header */}
        <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3">
          <div>
            <h1 className="text-lg font-bold">{profile?.name ?? "อพาร์ทเม้นท์"}</h1>
            <p className="text-xs text-slate-600">{profile?.addressLine1}</p>
            <p className="text-xs text-slate-600">{profile?.addressLine2}</p>
          </div>
          <div className="text-right">
            <p className="text-base font-bold">ใบแจ้งหนี้</p>
            <p className="text-xs">เลขที่ {invoice.number}</p>
            <p className="text-xs">วันที่ {fullDate(invoice.issueDate)}</p>
          </div>
        </div>

        {/* tenant / room */}
        <div className="flex justify-between mt-4 text-xs">
          <div>
            <p>
              <span className="text-slate-500">ผู้เช่า:</span>{" "}
              <span className="font-medium">{tenant?.name ?? "-"}</span>
            </p>
            {tenant?.address && <p className="text-slate-600 max-w-xs">{tenant.address}</p>}
            {tenant?.phone && <p className="text-slate-600">โทร. {tenant.phone}</p>}
          </div>
          <div className="text-right">
            <p>
              <span className="text-slate-500">ห้อง:</span>{" "}
              <span className="font-medium">{invoice.room.number}</span> (ชั้น {invoice.room.floor})
            </p>
            <p>
              <span className="text-slate-500">รอบบิล:</span> {invoice.utilityMonth}
            </p>
          </div>
        </div>

        {/* lines */}
        <table className="w-full mt-4 border-collapse">
          <thead>
            <tr className="bg-slate-100 text-xs">
              <th className="text-left px-2 py-1.5 border border-slate-300">รายการ</th>
              <th className="text-right px-2 py-1.5 border border-slate-300 w-20">จำนวน</th>
              <th className="text-right px-2 py-1.5 border border-slate-300 w-24">หน่วยละ</th>
              <th className="text-right px-2 py-1.5 border border-slate-300 w-28">จำนวนเงิน</th>
            </tr>
          </thead>
          <tbody>
            {invoice.lines.map((l) => (
              <tr key={l.id} className="text-xs">
                <td className="px-2 py-1.5 border border-slate-300">{l.description}</td>
                <td className="px-2 py-1.5 border border-slate-300 text-right">
                  {l.qty} {l.unit}
                </td>
                <td className="px-2 py-1.5 border border-slate-300 text-right">{baht(l.unitPrice)}</td>
                <td className="px-2 py-1.5 border border-slate-300 text-right tabular-nums">
                  {baht(l.amount)}
                </td>
              </tr>
            ))}
            <tr className="font-bold">
              <td className="px-2 py-2 border border-slate-300 text-right" colSpan={3}>
                ยอดรวมทั้งสิ้น
              </td>
              <td className="px-2 py-2 border border-slate-300 text-right text-sm tabular-nums">
                ฿{baht(invoice.total)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* payment / QR */}
        <div className="flex justify-between items-start mt-5 gap-4">
          <div className="text-xs space-y-0.5">
            <p className="font-semibold">ชำระเงินผ่าน</p>
            {bank ? (
              <>
                <p>{bank.bankName}</p>
                <p>เลขที่บัญชี {bank.accountNo}</p>
                <p>ชื่อบัญชี {bank.accountName}</p>
              </>
            ) : (
              <p className="text-slate-400">— ไม่ได้ระบุบัญชี —</p>
            )}
          </div>
          {qrDataUrl && (
            <div className="text-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt="PromptPay QR" className="w-32 h-32" />
              <p className="text-[10px] text-slate-500 mt-1">สแกนจ่ายผ่าน PromptPay</p>
              <p className="text-[10px] text-slate-400">฿{baht(invoice.total)}</p>
            </div>
          )}
        </div>

        {/* footer notes */}
        {(profile?.footerNote1 || profile?.footerNote2) && (
          <div className="mt-5 pt-3 border-t border-slate-200 text-[11px] text-slate-500 space-y-1">
            {profile?.footerNote1 && <p>{profile.footerNote1}</p>}
            {profile?.footerNote2 && <p>{profile.footerNote2}</p>}
          </div>
        )}
      </div>
    </div>
  );
}
