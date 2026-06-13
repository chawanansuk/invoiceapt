import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { readFileSync } from "node:fs";

const prisma = new PrismaClient();

function parseDate(s) {
  if (!s) return null;
  const d = new Date(String(s).replace(" ", "T"));
  return isNaN(d.getTime()) ? null : d;
}

async function main() {
  const roomsData = JSON.parse(
    readFileSync(new URL("../../room_data.json", import.meta.url), "utf8")
  );

  // reset (dependency order)
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.meterReading.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.room.deleteMany();
  await prisma.bankAccount.deleteMany();
  await prisma.billingProfile.deleteMany();
  await prisma.user.deleteMany();

  // users
  await prisma.user.create({
    data: {
      username: "admin",
      passwordHash: bcrypt.hashSync("admin1234", 10),
      name: "เจ้าของกิจการ",
      role: "owner",
    },
  });

  // billing profiles
  await prisma.billingProfile.createMany({
    data: [
      {
        key: "normal",
        name: "อพาร์ทเม้นท์ มั่งมีทวีสุข",
        addressLine1: "558/1 ถนนท่าดินแดง 16 แขวงคลองสาน",
        addressLine2: "เขตคลองสาน กรุงเทพฯ 10600",
        footerNote1:
          "กรุณาชำระภายในวันที่ 5 ของเดือนถัดไป (ชำระหลังวันที่ 5 คิดค่าธรรมเนียมล่าช้าวันละ 200 บาท)",
        footerNote2:
          "โอนแล้วกรุณาแจ้งผ่าน LINE ID : MT.Apartment (หากไม่แจ้ง ทางเราจะถือว่ายังไม่ได้รับเงินค่ะ)",
      },
      {
        key: "tax",
        name: "อพาร์ทเม้นท์ บ้านแห่งความสุข",
        addressLine1: "576 ถนนท่าดินแดง 16 แขวงคลองสาน โทร 099-441-9465",
        addressLine2: "เขตคลองสาน กรุงเทพฯ 10600",
        taxId: "129900358828",
      },
    ],
  });

  // bank accounts — promptpayId defaults to the owner's phone; edit per account in settings
  const acctName = "นายชวนันท์ สุขพรชัยรัก";
  const ppDefault = "0994419465";
  const kkp = await prisma.bankAccount.create({
    data: { label: "ชั้น 2-3", bankName: "ธนาคารเกียรตินาคินภัทร", accountNo: "20-0208389-2", accountName: acctName, promptpayId: ppDefault },
  });
  const ksr = await prisma.bankAccount.create({
    data: { label: "ชั้น 4-5", bankName: "ธนาคารกรุงศรีอยุธยา สาขาท่าดินแดง", accountNo: "112-1-33961-7", accountName: acctName, promptpayId: ppDefault },
  });
  const ktb = await prisma.bankAccount.create({
    data: { label: "ชั้น 6 / ห้องพิเศษ", bankName: "ธนาคารกรุงไทย สาขาราชวงศ์", accountNo: "043-0-24123-2", accountName: acctName, promptpayId: ppDefault },
  });

  function bankFor(bankText) {
    if (!bankText) return ktb.id;
    if (bankText.includes("เกียรตินาคิน")) return kkp.id;
    if (bankText.includes("กรุงศรี")) return ksr.id;
    return ktb.id; // กรุงไทย + default
  }

  let tenants = 0;
  let leases = 0;
  let readings = 0;
  for (const r of roomsData) {
    const hasTenant = r.name && r.name.trim().length > 0;
    const room = await prisma.room.create({
      data: {
        number: r.room,
        floor: Math.floor(r.room / 100),
        rent: r.rent || 0,
        furnitureFee: r.furniture || 0,
        commonFee: r.common || 0,
        garbageFee: r.garbage || 0,
        elecRate: r.elec_rate || 8,
        waterRate: r.water_rate || 20,
        waterMin: r.water_min ?? 100,
        status: hasTenant ? "occupied" : "vacant",
        note: r.note || null,
        bankAccountId: bankFor(r.bank),
      },
    });

    if (hasTenant) {
      const tenant = await prisma.tenant.create({
        data: {
          name: r.name.trim(),
          address: r.address || null,
          phone: r.phone || null,
        },
      });
      tenants++;
      await prisma.lease.create({
        data: {
          roomId: room.id,
          tenantId: tenant.id,
          contractNo: r.contract || null,
          moveInDate: parseDate(r.movein),
          rent: r.rent || 0,
          active: true,
          note: r.note || null,
        },
      });
      leases++;
    }

    // seed current meter reading (utility month: April 2026)
    if (r.elec_old != null || r.water_old != null) {
      await prisma.meterReading.create({
        data: {
          roomId: room.id,
          year: 2026,
          month: 4,
          elecOld: r.elec_old ?? null,
          elecNew: r.elec_new ?? null,
          waterOld: r.water_old ?? null,
          waterNew: r.water_new ?? null,
          other: r.other || 0,
        },
      });
      readings++;
    }
  }

  console.log(
    `seeded: ${roomsData.length} rooms, ${tenants} tenants, ${leases} leases, ${readings} readings`
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
