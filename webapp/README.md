# ระบบจัดการหอพัก — อพาร์ทเม้นท์ มั่งมีทวีสุข

เว็บแอปจัดการห้องเช่า ผู้เช่า และ (ในเฟสถัดไป) ใบแจ้งหนี้/การชำระเงิน
ต่อยอดจากไฟล์ Excel เดิม (`../room_data.json` คือข้อมูลตั้งต้น 90 ห้อง)

## เทคโนโลยี
- Next.js 16 (App Router) + React 19 + TypeScript
- Prisma 6 + SQLite (dev) / PostgreSQL (prod)
- Tailwind CSS 4
- เซสชันแบบ JWT cookie (jose) + รหัสผ่าน bcrypt

## เริ่มใช้งาน (dev)
```bash
cp .env.example .env          # ตั้งค่า DATABASE_URL และ SESSION_SECRET
npm install
npx prisma migrate dev        # สร้างฐานข้อมูล
npm run seed                  # นำเข้าข้อมูล 90 ห้องจาก ../room_data.json
npm run dev                   # เปิด http://localhost:3000
```
ผู้ใช้เริ่มต้น: **admin / admin1234** (เปลี่ยนรหัสผ่านก่อนใช้งานจริง)

## ฟีเจอร์ปัจจุบัน (เฟส 1 — MVP)
- เข้าสู่ระบบ / ออกจากระบบ (ป้องกันทุกหน้าใน `proxy.ts`)
- ภาพรวม: จำนวนห้อง, ห้องว่าง, รายได้ค่าเช่า/เดือน, สถานะตามชั้น
- ห้องพัก: รายการ + กรองตามชั้น/สถานะ, แก้ค่าเช่า/อัตราค่าน้ำไฟ/บัญชีรับเงิน
- ผู้เช่า: ค้นหา, แก้ข้อมูล, เพิ่มผู้เช่าเข้าห้อง, ย้ายออก, ประวัติการเช่า

## โครงสร้างฐานข้อมูล
schema รองรับเฟสถัดไปไว้แล้ว: `MeterReading`, `Invoice`, `InvoiceLine`,
`Payment`, `BankAccount`, `BillingProfile` (โหมดเบิกได้/เลขผู้เสียภาษี)

## เฟสถัดไป
- เฟส 2: กรอกมิเตอร์รายเดือน → ออกใบแจ้งหนี้ + PDF + QR PromptPay, ติดตามการชำระ (อัปโหลดสลิป)
- เฟส 3: พอร์ทัลผู้เช่า, ส่งบิลเข้า LINE, OCR อ่านมิเตอร์, รายงานภาษี

## Deploy
ตั้ง `provider = "postgresql"` ใน `prisma/schema.prisma`, ตั้ง `DATABASE_URL`
ไปยัง PostgreSQL (เช่น Neon/Supabase) แล้ว deploy บน Vercel
(`npx prisma migrate deploy` ตอน build)
