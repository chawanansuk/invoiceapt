import "server-only";
import Anthropic from "@anthropic-ai/sdk";

// Vision OCR helpers for payment slips and utility meters.
// Requires ANTHROPIC_API_KEY in the environment. Falls back gracefully
// (isConfigured() === false) so the app still works with manual entry.

const MODEL = process.env.ANTHROPIC_OCR_MODEL || "claude-opus-4-8";

export function isConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic();
  return _client;
}

/** Split a data URL ("data:image/jpeg;base64,....") into media type + base64. */
function parseDataUrl(dataUrl: string): { mediaType: string; data: string } {
  const m = /^data:([^;]+);base64,([\s\S]*)$/.exec(dataUrl);
  if (!m) throw new Error("รูปแบบรูปภาพไม่ถูกต้อง");
  return { mediaType: m[1], data: m[2] };
}

type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";
function mediaType(t: string): ImageMediaType {
  const allowed: ImageMediaType[] = ["image/jpeg", "image/png", "image/gif", "image/webp"];
  return (allowed.includes(t as ImageMediaType) ? t : "image/jpeg") as ImageMediaType;
}

async function extract(
  dataUrl: string,
  prompt: string,
  schema: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const { mediaType: mt, data } = parseDataUrl(dataUrl);

  const res = await client().messages.create({
    model: MODEL,
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType(mt), data },
          },
          { type: "text", text: prompt },
        ],
      },
    ],
    // Structured output: constrain the response to our JSON schema.
    output_config: { format: { type: "json_schema", schema } },
  } as Anthropic.MessageCreateParamsNonStreaming);

  const text = res.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") throw new Error("ไม่พบข้อมูลจากรูป");
  return JSON.parse(text.text);
}

export type SlipResult = {
  amount: number;
  dateISO: string;
  ref: string;
  sender: string;
};

/** Read a Thai bank transfer slip: amount, date, reference, sender. */
export async function extractSlip(dataUrl: string): Promise<SlipResult> {
  const schema = {
    type: "object",
    properties: {
      amount: { type: "number", description: "ยอดเงินที่โอน (บาท) เป็นตัวเลข ไม่พบให้ใส่ 0" },
      dateISO: { type: "string", description: "วันที่โอนในรูปแบบ YYYY-MM-DD ไม่พบให้ใส่ค่าว่าง" },
      ref: { type: "string", description: "เลขที่รายการ/อ้างอิง ไม่พบให้ใส่ค่าว่าง" },
      sender: { type: "string", description: "ชื่อผู้โอน ไม่พบให้ใส่ค่าว่าง" },
    },
    required: ["amount", "dateISO", "ref", "sender"],
    additionalProperties: false,
  };
  const prompt =
    "นี่คือสลิปโอนเงินของธนาคารไทย อ่านและดึงข้อมูล: ยอดเงินที่โอน (บาท), " +
    "วันที่โอน (แปลง พ.ศ. เป็น ค.ศ. ให้ด้วย), เลขที่อ้างอิง, และชื่อผู้โอน " +
    "ตอบเป็น JSON ตาม schema เท่านั้น";
  const r = await extract(dataUrl, prompt, schema);
  return {
    amount: Number(r.amount) || 0,
    dateISO: String(r.dateISO || ""),
    ref: String(r.ref || ""),
    sender: String(r.sender || ""),
  };
}

export type MeterResult = { value: number; raw: string };

/** Read a utility meter photo. kind = "elec" | "water" for prompt wording. */
export async function extractMeter(
  dataUrl: string,
  kind: "elec" | "water"
): Promise<MeterResult> {
  const label = kind === "elec" ? "มิเตอร์ไฟฟ้า" : "มิเตอร์น้ำประปา";
  const schema = {
    type: "object",
    properties: {
      value: { type: "number", description: "เลขมิเตอร์ที่อ่านได้ เป็นจำนวนเต็ม อ่านไม่ได้ให้ใส่ 0" },
      raw: { type: "string", description: "ตัวเลขที่เห็นบนหน้าปัด ตามที่อ่านได้" },
    },
    required: ["value", "raw"],
    additionalProperties: false,
  };
  const prompt =
    `นี่คือรูปหน้าปัด${label} อ่านตัวเลขที่แสดงบนหน้าปัด (เฉพาะจำนวนเต็ม ตัดทศนิยม/เลขหลังจุดสีแดงออก) ` +
    "ตอบเป็น JSON ตาม schema เท่านั้น";
  const r = await extract(dataUrl, prompt, schema);
  return { value: Number(r.value) || 0, raw: String(r.raw || "") };
}
