"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { extractSlip, isConfigured } from "@/lib/anthropic";

export type SlipOcr =
  | { ok: true; amount: number; dateISO: string; note: string }
  | { ok: false; error: string };

/** Read a payment slip image with vision AI and return prefill values. */
export async function ocrSlipAction(dataUrl: string): Promise<SlipOcr> {
  await requireUser();
  if (!isConfigured()) {
    return { ok: false, error: "ยังไม่ได้ตั้งค่า ANTHROPIC_API_KEY — กรอกข้อมูลเองได้" };
  }
  try {
    const r = await extractSlip(dataUrl);
    const note = [r.sender && `ผู้โอน: ${r.sender}`, r.ref && `อ้างอิง: ${r.ref}`]
      .filter(Boolean)
      .join(" · ");
    return { ok: true, amount: r.amount, dateISO: r.dateISO, note };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "อ่านสลิปไม่สำเร็จ" };
  }
}

/** Recompute invoice status from its confirmed payments. */
async function refreshStatus(invoiceId: number) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!inv) return;
  const paid = inv.payments
    .filter((p) => p.status === "confirmed")
    .reduce((s, p) => s + p.amount, 0);
  const status = paid >= inv.total ? "paid" : paid > 0 ? "partial" : "unpaid";
  await prisma.invoice.update({ where: { id: invoiceId }, data: { status } });
}

export async function recordPayment(formData: FormData) {
  await requireUser();
  const invoiceId = Number(formData.get("invoiceId"));
  const amount = parseFloat(String(formData.get("amount") || "0").replace(/,/g, ""));
  const paidDateRaw = String(formData.get("paidDate") || "");
  const slipUrl = String(formData.get("slipUrl") || "") || null;
  const note = String(formData.get("note") || "") || null;
  const autoConfirm = formData.get("autoConfirm") === "on";

  if (!invoiceId || isNaN(amount) || amount <= 0) return;

  await prisma.payment.create({
    data: {
      invoiceId,
      amount,
      paidDate: paidDateRaw ? new Date(paidDateRaw) : new Date(),
      method: "transfer",
      slipUrl,
      status: autoConfirm ? "confirmed" : "pending",
      note,
    },
  });

  await refreshStatus(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function setPaymentStatus(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get("paymentId"));
  const invoiceId = Number(formData.get("invoiceId"));
  const status = String(formData.get("status"));
  await prisma.payment.update({ where: { id: paymentId }, data: { status } });
  await refreshStatus(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function deletePayment(formData: FormData) {
  await requireUser();
  const paymentId = Number(formData.get("paymentId"));
  const invoiceId = Number(formData.get("invoiceId"));
  await prisma.payment.delete({ where: { id: paymentId } });
  await refreshStatus(invoiceId);
  revalidatePath(`/invoices/${invoiceId}`);
  revalidatePath("/invoices");
}

export async function deleteInvoice(formData: FormData) {
  await requireUser();
  const invoiceId = Number(formData.get("invoiceId"));
  await prisma.payment.deleteMany({ where: { invoiceId } });
  await prisma.invoiceLine.deleteMany({ where: { invoiceId } });
  await prisma.invoice.delete({ where: { id: invoiceId } });
  revalidatePath("/invoices");
  revalidatePath("/billing");
  redirect("/invoices");
}
