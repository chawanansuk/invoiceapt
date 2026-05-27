"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

function num(v: FormDataEntryValue | null): number {
  const n = parseFloat(String(v ?? "").replace(/,/g, ""));
  return isNaN(n) ? 0 : n;
}

export async function updateRoom(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("roomId"));
  const bankId = Number(formData.get("bankAccountId"));
  await prisma.room.update({
    where: { id },
    data: {
      rent: num(formData.get("rent")),
      furnitureFee: num(formData.get("furnitureFee")),
      commonFee: num(formData.get("commonFee")),
      garbageFee: num(formData.get("garbageFee")),
      elecRate: num(formData.get("elecRate")),
      waterRate: num(formData.get("waterRate")),
      waterMin: num(formData.get("waterMin")),
      bankAccountId: bankId || null,
      note: String(formData.get("note") || "") || null,
    },
  });
  revalidatePath(`/rooms/${id}`);
  revalidatePath("/rooms");
}

export async function addTenant(formData: FormData) {
  await requireUser();
  const roomId = Number(formData.get("roomId"));
  const name = String(formData.get("name") || "").trim();
  if (!name) return;
  const room = await prisma.room.findUnique({ where: { id: roomId } });
  const tenant = await prisma.tenant.create({
    data: {
      name,
      address: String(formData.get("address") || "") || null,
      phone: String(formData.get("phone") || "") || null,
    },
  });
  await prisma.lease.create({
    data: {
      roomId,
      tenantId: tenant.id,
      contractNo: String(formData.get("contractNo") || "") || null,
      rent: room?.rent ?? 0,
      active: true,
    },
  });
  await prisma.room.update({ where: { id: roomId }, data: { status: "occupied" } });
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
}

export async function endLease(formData: FormData) {
  await requireUser();
  const roomId = Number(formData.get("roomId"));
  const leaseId = Number(formData.get("leaseId"));
  await prisma.lease.update({
    where: { id: leaseId },
    data: { active: false, moveOutDate: new Date() },
  });
  await prisma.room.update({ where: { id: roomId }, data: { status: "vacant" } });
  revalidatePath(`/rooms/${roomId}`);
  revalidatePath("/rooms");
}
