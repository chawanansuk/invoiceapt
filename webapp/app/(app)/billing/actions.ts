"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { computeBill, invoiceNumber } from "@/lib/billing";
import { monthLabel } from "@/lib/format";

function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(/,/g, "");
  if (s === "") return null;
  const n = parseFloat(s);
  return isNaN(n) ? null : n;
}

function num(v: FormDataEntryValue | null): number {
  return numOrNull(v) ?? 0;
}

/** Bulk upsert meter readings for a month from the billing table form. */
export async function saveReadings(formData: FormData) {
  await requireUser();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  const roomIds = String(formData.get("roomIds") || "")
    .split(",")
    .map((s) => Number(s))
    .filter(Boolean);

  for (const roomId of roomIds) {
    const elecOld = numOrNull(formData.get(`elecOld_${roomId}`));
    const elecNew = numOrNull(formData.get(`elecNew_${roomId}`));
    const waterOld = numOrNull(formData.get(`waterOld_${roomId}`));
    const waterNew = numOrNull(formData.get(`waterNew_${roomId}`));
    const other = num(formData.get(`other_${roomId}`));

    await prisma.meterReading.upsert({
      where: { roomId_year_month: { roomId, year, month } },
      create: { roomId, year, month, elecOld, elecNew, waterOld, waterNew, other },
      update: { elecOld, elecNew, waterOld, waterNew, other },
    });
  }

  revalidatePath("/billing");
}

/** Create an invoice for one room/month from its saved reading. Returns invoice id. */
export async function generateInvoice(
  roomId: number,
  year: number,
  month: number
): Promise<number | null> {
  await requireUser();

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { leases: { where: { active: true }, take: 1 } },
  });
  if (!room) return null;

  const reading = await prisma.meterReading.findUnique({
    where: { roomId_year_month: { roomId, year, month } },
  });

  const bill = computeBill({
    rent: room.rent,
    furnitureFee: room.furnitureFee,
    commonFee: room.commonFee,
    garbageFee: room.garbageFee,
    elecRate: room.elecRate,
    waterRate: room.waterRate,
    waterMin: room.waterMin,
    elecOld: reading?.elecOld,
    elecNew: reading?.elecNew,
    waterOld: reading?.waterOld,
    waterNew: reading?.waterNew,
    other: reading?.other,
  });

  const number = invoiceNumber(year, month, room.number);
  const label = monthLabel(year, month);

  const existing = await prisma.invoice.findUnique({ where: { number } });
  if (existing) return existing.id;

  const invoice = await prisma.invoice.create({
    data: {
      number,
      roomId,
      leaseId: room.leases[0]?.id ?? null,
      rentMonth: label,
      utilityMonth: label,
      total: bill.total,
      status: "unpaid",
      lines: { create: bill.lines },
    },
  });

  revalidatePath("/billing");
  revalidatePath("/invoices");
  return invoice.id;
}

/** Form wrapper: generate one invoice and revalidate. */
export async function generateInvoiceAction(formData: FormData) {
  const roomId = Number(formData.get("roomId"));
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));
  await generateInvoice(roomId, year, month);
}

/** Generate invoices for every occupied room with a reading but no invoice yet. */
export async function generateAllInvoices(formData: FormData) {
  await requireUser();
  const year = Number(formData.get("year"));
  const month = Number(formData.get("month"));

  const rooms = await prisma.room.findMany({
    where: { status: "occupied" },
    select: { id: true, number: true },
  });

  for (const room of rooms) {
    const number = invoiceNumber(year, month, room.number);
    const existing = await prisma.invoice.findUnique({ where: { number } });
    if (!existing) {
      await generateInvoice(room.id, year, month);
    }
  }

  revalidatePath("/billing");
  revalidatePath("/invoices");
}
