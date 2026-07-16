"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { compressImage } from "@/lib/image";
import { recordPayment, ocrSlipAction } from "./actions";

function Submit() {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
    >
      {pending ? "กำลังบันทึก..." : "บันทึกการชำระเงิน"}
    </button>
  );
}

export default function PaymentForm({
  invoiceId,
  outstanding,
}: {
  invoiceId: number;
  outstanding: number;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const [slip, setSlip] = useState<string>("");
  const [amount, setAmount] = useState<string>(outstanding > 0 ? String(outstanding) : "");
  const [paidDate, setPaidDate] = useState<string>(today);
  const [note, setNote] = useState<string>("");
  const [ocr, setOcr] = useState<"idle" | "reading" | "done" | "error">("idle");
  const [ocrMsg, setOcrMsg] = useState<string>("");
  const formRef = useRef<HTMLFormElement>(null);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await compressImage(file);
    setSlip(dataUrl);

    // Auto-read the slip with vision AI and prefill.
    setOcr("reading");
    setOcrMsg("");
    const res = await ocrSlipAction(dataUrl);
    if (res.ok) {
      if (res.amount > 0) setAmount(String(res.amount));
      if (res.dateISO) setPaidDate(res.dateISO);
      if (res.note) setNote(res.note);
      setOcr("done");
      setOcrMsg("อ่านสลิปอัตโนมัติแล้ว — ตรวจสอบความถูกต้องก่อนบันทึก");
    } else {
      setOcr("error");
      setOcrMsg(res.error);
    }
  }

  function reset() {
    setSlip("");
    setAmount(outstanding > 0 ? String(outstanding) : "");
    setPaidDate(today);
    setNote("");
    setOcr("idle");
    setOcrMsg("");
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await recordPayment(fd);
        reset();
      }}
      className="space-y-3"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="slipUrl" value={slip} />

      <label className="block">
        <span className="text-sm text-slate-600">สลิปโอนเงิน (ถ่ายรูป/อัปโหลด → อ่านอัตโนมัติ)</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={onFile}
          className="mt-1 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
        />
      </label>

      {ocr === "reading" && (
        <p className="text-xs text-blue-600 flex items-center gap-2">
          <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-blue-200 border-t-blue-600" />
          กำลังอ่านสลิปด้วย AI...
        </p>
      )}
      {ocr === "done" && <p className="text-xs text-green-600">{ocrMsg}</p>}
      {ocr === "error" && <p className="text-xs text-amber-600">{ocrMsg}</p>}

      {slip && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slip} alt="สลิป" className="h-32 rounded-lg border border-slate-200 object-contain" />
      )}

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-slate-600">จำนวนเงิน (บาท)</span>
          <input
            name="amount"
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">วันที่ชำระ</span>
          <input
            name="paidDate"
            type="date"
            value={paidDate}
            onChange={(e) => setPaidDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-slate-600">หมายเหตุ</span>
        <input
          name="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
        />
      </label>

      <label className="flex items-center gap-2 text-sm text-slate-600">
        <input type="checkbox" name="autoConfirm" defaultChecked className="rounded" />
        ยืนยันการรับเงินทันที
      </label>

      <Submit />
    </form>
  );
}
