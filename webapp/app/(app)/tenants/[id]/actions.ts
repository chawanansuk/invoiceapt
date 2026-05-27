"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";

export async function updateTenant(formData: FormData) {
  await requireUser();
  const id = Number(formData.get("tenantId"));
  await prisma.tenant.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "").trim(),
      phone: String(formData.get("phone") || "") || null,
      address: String(formData.get("address") || "") || null,
      workplace: String(formData.get("workplace") || "") || null,
    },
  });
  revalidatePath(`/tenants/${id}`);
  revalidatePath("/tenants");
}
