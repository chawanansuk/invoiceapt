"use client";

import { useRef, useState } from "react";
import { compressImage } from "@/lib/image";

/**
 * Small camera/upload button. Picks an image (camera on mobile), compresses it,
 * then hands the data URL to `onCapture` (which does the OCR call). Shows a
 * spinner for the whole round-trip.
 */
export default function CameraButton({
  onCapture,
  title,
  className = "",
}: {
  onCapture: (dataUrl: string) => Promise<void>;
  title: string;
  className?: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-picking the same file
    if (!file) return;
    setBusy(true);
    try {
      const dataUrl = await compressImage(file);
      await onCapture(dataUrl);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={onChange}
        className="hidden"
      />
      <button
        type="button"
        title={title}
        disabled={busy}
        onClick={() => ref.current?.click()}
        className={`inline-flex items-center justify-center rounded-md border border-slate-300 text-slate-500 hover:bg-slate-100 disabled:opacity-50 ${className}`}
      >
        {busy ? (
          <span className="inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" />
        ) : (
          // camera glyph
          <span aria-hidden className="text-sm leading-none">📷</span>
        )}
      </button>
    </>
  );
}
