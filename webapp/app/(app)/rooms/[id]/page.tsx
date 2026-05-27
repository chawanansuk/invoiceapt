import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { updateRoom, addTenant, endLease } from "./actions";

function Field({
  label,
  name,
  value,
  suffix,
}: {
  label: string;
  name: string;
  value: number;
  suffix?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm text-slate-600">{label}</span>
      <div className="flex items-center gap-2 mt-1">
        <input
          name={name}
          defaultValue={value}
          inputMode="decimal"
          className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        {suffix && <span className="text-sm text-slate-400 whitespace-nowrap">{suffix}</span>}
      </div>
    </label>
  );
}

export default async function RoomDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const roomId = Number(id);

  const [room, banks] = await Promise.all([
    prisma.room.findUnique({
      where: { id: roomId },
      include: {
        bankAccount: true,
        leases: {
          where: { active: true },
          include: { tenant: true },
          take: 1,
        },
      },
    }),
    prisma.bankAccount.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!room) notFound();
  const lease = room.leases[0];

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center gap-3">
        <Link href="/rooms" className="text-slate-400 hover:text-slate-600">
          ← ห้องพัก
        </Link>
        <h1 className="text-2xl font-bold">ห้อง {room.number}</h1>
        <span className="text-sm text-slate-500">ชั้น {room.floor}</span>
      </div>

      {/* tenant section */}
      <section className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="font-semibold mb-3">ผู้เช่าปัจจุบัน</h2>
        {lease ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <Info label="ชื่อ" value={lease.tenant.name} />
              <Info label="เบอร์โทร" value={lease.tenant.phone ?? "-"} />
              <Info label="เลขที่สัญญา" value={lease.contractNo ?? "-"} />
              <Info
                label="วันเข้าอยู่"
                value={
                  lease.moveInDate
                    ? new Date(lease.moveInDate).toLocaleDateString("th-TH")
                    : "-"
                }
              />
              <div className="col-span-2">
                <Info label="ที่อยู่" value={lease.tenant.address ?? "-"} />
              </div>
            </div>
            <div className="flex gap-2 pt-1">
              <Link
                href={`/tenants/${lease.tenant.id}`}
                className="text-sm rounded-lg border border-slate-300 px-3 py-1.5 hover:bg-slate-50"
              >
                แก้ไขข้อมูลผู้เช่า
              </Link>
              <form action={endLease}>
                <input type="hidden" name="roomId" value={room.id} />
                <input type="hidden" name="leaseId" value={lease.id} />
                <button className="text-sm rounded-lg border border-red-200 text-red-600 px-3 py-1.5 hover:bg-red-50">
                  ย้ายออก
                </button>
              </form>
            </div>
          </div>
        ) : (
          <form action={addTenant} className="space-y-3">
            <input type="hidden" name="roomId" value={room.id} />
            <p className="text-sm text-amber-600">ห้องนี้ว่าง — เพิ่มผู้เช่าใหม่</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm text-slate-600">ชื่อผู้เช่า *</span>
                <input name="name" required className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600">เบอร์โทร</span>
                <input name="phone" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block">
                <span className="text-sm text-slate-600">เลขที่สัญญา</span>
                <input name="contractNo" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
              <label className="block sm:col-span-2">
                <span className="text-sm text-slate-600">ที่อยู่</span>
                <input name="address" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500" />
              </label>
            </div>
            <button className="rounded-lg bg-green-600 text-white px-4 py-2 text-sm font-medium hover:bg-green-700">
              เพิ่มผู้เช่า
            </button>
          </form>
        )}
      </section>

      {/* room settings */}
      <form action={updateRoom} className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
        <input type="hidden" name="roomId" value={room.id} />
        <h2 className="font-semibold">ค่าเช่าและอัตราค่าบริการ</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="ค่าเช่าห้อง" name="rent" value={room.rent} suffix="บาท/เดือน" />
          <Field label="ค่าเฟอร์นิเจอร์" name="furnitureFee" value={room.furnitureFee} suffix="บาท/เดือน" />
          <Field label="ค่าส่วนกลาง" name="commonFee" value={room.commonFee} suffix="บาท/เดือน" />
          <Field label="ค่าขยะ" name="garbageFee" value={room.garbageFee} suffix="บาท/เดือน" />
          <Field label="ค่าไฟ/หน่วย" name="elecRate" value={room.elecRate} suffix="บาท" />
          <Field label="ค่าน้ำ/หน่วย" name="waterRate" value={room.waterRate} suffix="บาท" />
          <Field label="ค่าน้ำขั้นต่ำ" name="waterMin" value={room.waterMin} suffix="บาท" />
        </div>
        <label className="block">
          <span className="text-sm text-slate-600">บัญชีรับชำระ</span>
          <select
            name="bankAccountId"
            defaultValue={room.bankAccountId ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 bg-white outline-none focus:border-blue-500"
          >
            <option value="">— ไม่ระบุ —</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.bankName} {b.accountNo} ({b.label})
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">หมายเหตุ</span>
          <input
            name="note"
            defaultValue={room.note ?? ""}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
        <button className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700">
          บันทึก
        </button>
      </form>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-slate-400 text-xs">{label}</span>
      <p className="text-slate-800">{value}</p>
    </div>
  );
}
