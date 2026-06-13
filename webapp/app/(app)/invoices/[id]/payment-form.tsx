"use client";

import { useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { recordPayment } from "./actions";

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

/** Downscale an image file to a JPEG data URL (max 1200px, q0.8) to keep payloads small. */
function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) return reject(new Error("no canvas"));
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.8));
      };
      img.onerror = reject;
      img.src = reader.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function PaymentForm({
  invoiceId,
  outstanding,
}: {
  invoiceId: number;
  outstanding: number;
}) {
  const [slip, setSlip] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const today = new Date().toISOString().slice(0, 10);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      setSlip(await compress(file));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      ref={formRef}
      action={async (fd) => {
        await recordPayment(fd);
        formRef.current?.reset();
        setSlip("");
      }}
      className="space-y-3"
    >
      <input type="hidden" name="invoiceId" value={invoiceId} />
      <input type="hidden" name="slipUrl" value={slip} />

      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-sm text-slate-600">จำนวนเงิน (บาท)</span>
          <input
            name="amount"
            inputMode="decimal"
            defaultValue={outstanding > 0 ? outstanding : ""}
            required
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
        <label className="block">
          <span className="text-sm text-slate-600">วันที่ชำระ</span>
          <input
            name="paidDate"
            type="date"
            defaultValue={today}
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 outline-none focus:border-blue-500"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-sm text-slate-600">สลิปโอนเงิน (รูปภาพ)</span>
        <input
          type="file"
          accept="image/*"
          onChange={onFile}
          className="mt-1 block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-slate-200"
        />
      </label>

      {busy && <p className="text-xs text-slate-400">กำลังประมวลผลรูป...</p>}
      {slip && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={slip} alt="สลิป" className="h-32 rounded-lg border border-slate-200 object-contain" />
      )}

      <label className="block">
        <span className="text-sm text-slate-600">หมายเหตุ</span>
        <input
          name="note"
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
