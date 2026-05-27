#!/usr/bin/env python3
"""สร้างไฟล์ระบบใบแจ้งหนี้ (Excel) ของอพาร์ทเม้นท์มั่งมีทวีสุข จาก room_data.json

วิธีรัน:  python3 build_workbook.py
ผลลัพธ์:  ระบบใบแจ้งหนี้-มั่งมีทวีสุข.xlsx  (4 ชีต: วิธีใช้, บันทึกค่าน้ำไฟ, ใบแจ้งหนี้, ผู้เช่า)

กฎการคิดเงินที่ดึงมาจากไฟล์เดิมทั้ง 5 ชั้น:
  - ค่าไฟ  = (เลขใหม่ - เลขเก่า) x เรทค่าไฟ      (เรทมาตรฐาน 8 บาท/หน่วย)
  - ค่าน้ำ = MAX((เลขใหม่ - เลขเก่า) x เรทค่าน้ำ, ค่าน้ำขั้นต่ำ)
            เรทมาตรฐาน 20 บาท/หน่วย, ขั้นต่ำ 100 บาท
            (ห้องปีกพิเศษเรท 15 บาท ไม่มีขั้นต่ำ แต่มีค่าส่วนกลาง/ขยะแทน)
  - รวม   = ค่าเช่า + ค่าเฟอร์ + ค่าไฟ + ค่าน้ำ + ค่าส่วนกลาง + ค่าขยะ + อื่นๆ
"""
import json
import openpyxl
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.worksheet.datavalidation import DataValidation
from openpyxl.worksheet.properties import PageSetupProperties
from openpyxl.utils import get_column_letter
from openpyxl.utils.cell import range_boundaries

OUT = "ระบบใบแจ้งหนี้-มั่งมีทวีสุข.xlsx"
rooms = json.load(open("room_data.json"))
rooms.sort(key=lambda r: r["room"])
N = len(rooms)

FONT = "Tahoma"
def F(size=11, bold=False, color="000000"):
    return Font(name=FONT, size=size, bold=bold, color=color)

thin = Side(style="thin", color="888888")
box = Border(left=thin, right=thin, top=thin, bottom=thin)
C  = Alignment(horizontal="center", vertical="center", wrap_text=True)
L  = Alignment(horizontal="left", vertical="center", wrap_text=True)
Rg = Alignment(horizontal="right", vertical="center")

HEAD   = PatternFill("solid", fgColor="2F5496")  # น้ำเงินเข้ม = หัวตาราง
INPUT  = PatternFill("solid", fgColor="FFF2CC")  # เหลือง = พนักงานกรอก
CARRY  = PatternFill("solid", fgColor="FFF9E6")  # เหลืองอ่อน = เลขเก่า (เปลี่ยนตอนขึ้นเดือน)
AUTO   = PatternFill("solid", fgColor="F2F2F2")  # เทา = คำนวณอัตโนมัติ
TOT    = PatternFill("solid", fgColor="E2EFDA")  # เขียว = ยอดรวม
BANNER = PatternFill("solid", fgColor="FCE4D6")
MONEY  = "#,##0"

wb = openpyxl.Workbook()

# ============================================================ ผู้เช่า (master)
ws = wb.active
ws.title = "ผู้เช่า"
ws.sheet_view.showGridLines = False
headers = ["ห้อง", "ชื่อผู้เช่า", "ที่อยู่", "เบอร์โทร", "ค่าเช่า/เดือน", "ค่าเฟอร์/เดือน",
           "ค่าส่วนกลาง", "ค่าขยะ", "เรทค่าไฟ/หน่วย", "เรทค่าน้ำ/หน่วย",
           "เลขที่สัญญา", "วันเข้าอยู่", "สถานะ/หมายเหตุ", "ค่าน้ำขั้นต่ำ"]
ws.append(headers)
for c in range(1, len(headers) + 1):
    cell = ws.cell(1, c)
    cell.font = F(11, True, "FFFFFF"); cell.fill = HEAD; cell.alignment = C; cell.border = box
for r in rooms:
    ws.append([r["room"], r["name"], r["address"], r["phone"], r["rent"], r["furniture"],
               r["common"], r["garbage"], r["elec_rate"], r["water_rate"],
               r["contract"], r["movein"], r["note"], r["water_min"]])
for row in range(2, N + 2):
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row, c); cell.font = F(10); cell.border = box
        cell.alignment = L if c in (2, 3, 11, 12, 13) else C
for i, w in enumerate([7, 26, 40, 14, 11, 12, 11, 9, 12, 12, 15, 12, 24, 11], 1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "A2"
MASTER = "ผู้เช่า!$A:$N"   # ช่วงสำหรับ VLOOKUP

# =================================================== บันทึกค่าน้ำไฟ (monthly)
wm = wb.create_sheet("บันทึกค่าน้ำไฟ")
wm.sheet_view.showGridLines = False
wm["B1"] = "เดือนที่แจ้งหนี้ (ค่าเช่า) :"; wm["B1"].font = F(11, True)
wm["D1"] = "พฤษภาคม 2569"; wm["D1"].font = F(11, True, "C00000"); wm["D1"].fill = INPUT; wm["D1"].border = box; wm["D1"].alignment = C
wm["B2"] = "เดือนค่าน้ำ-ค่าไฟ :"; wm["B2"].font = F(11, True)
wm["D2"] = "เมษายน 2569"; wm["D2"].font = F(11, True, "C00000"); wm["D2"].fill = INPUT; wm["D2"].border = box; wm["D2"].alignment = C
wm["F1"] = "ช่องสีเหลือง = พนักงานกรอก   |   ช่องสีเทา = คำนวณอัตโนมัติ (ห้ามแก้)"
wm["F1"].font = F(10, True, "C00000")

HR = 4
mh = ["ห้อง", "ชื่อผู้เช่า", "ค่าเช่า", "ค่าเฟอร์",
      "ไฟ-เลขเก่า", "ไฟ-เลขใหม่", "หน่วยไฟ", "ค่าไฟ",
      "น้ำ-เลขเก่า", "น้ำ-เลขใหม่", "หน่วยน้ำ", "ค่าน้ำ",
      "ส่วนกลาง", "ขยะ", "อื่นๆ", "รวมทั้งสิ้น"]
for c, h in enumerate(mh, 1):
    cell = wm.cell(HR, c); cell.value = h
    cell.font = F(10, True, "FFFFFF"); cell.fill = HEAD; cell.alignment = C; cell.border = box
first = HR + 1
for idx, r in enumerate(rooms):
    row = first + idx
    wm.cell(row, 1, r["room"])
    wm.cell(row, 2).value  = f'=IFERROR(VLOOKUP(A{row},{MASTER},2,0),"")'
    wm.cell(row, 3).value  = f"=IFERROR(VLOOKUP(A{row},{MASTER},5,0),0)"
    wm.cell(row, 4).value  = f"=IFERROR(VLOOKUP(A{row},{MASTER},6,0),0)"
    wm.cell(row, 5, r["elec_old"])
    wm.cell(row, 6, r["elec_new"])
    wm.cell(row, 7).value  = f'=IF(F{row}="","",F{row}-E{row})'
    wm.cell(row, 8).value  = f'=IF(G{row}="","",G{row}*IFERROR(VLOOKUP(A{row},{MASTER},9,0),0))'
    wm.cell(row, 9, r["water_old"])
    wm.cell(row, 10, r["water_new"])
    wm.cell(row, 11).value = f'=IF(J{row}="","",J{row}-I{row})'
    # ค่าน้ำ = MAX(หน่วย x เรท, ค่าน้ำขั้นต่ำ)
    wm.cell(row, 12).value = (f'=IF(K{row}="","",MAX(K{row}*IFERROR(VLOOKUP(A{row},{MASTER},10,0),0),'
                              f'IFERROR(VLOOKUP(A{row},{MASTER},14,0),0)))')
    wm.cell(row, 13).value = f"=IFERROR(VLOOKUP(A{row},{MASTER},7,0),0)"
    wm.cell(row, 14).value = f"=IFERROR(VLOOKUP(A{row},{MASTER},8,0),0)"
    wm.cell(row, 15, r["other"])
    wm.cell(row, 16).value = f"=SUM(C{row},D{row},H{row},L{row},M{row},N{row},O{row})"
    for c in range(1, 17):
        cell = wm.cell(row, c); cell.border = box; cell.font = F(10)
        cell.alignment = L if c == 2 else C
        if c in (6, 10, 15):      cell.fill = INPUT
        elif c in (5, 9):         cell.fill = CARRY
        elif c in (7, 8, 11, 12, 16): cell.fill = AUTO
        if c == 16: cell.font = F(10, True, "375623")
        if c in (3, 4, 8, 12, 13, 14, 15, 16): cell.number_format = MONEY
for i, w in enumerate([7, 24, 9, 9, 11, 11, 8, 9, 11, 11, 8, 9, 9, 8, 9, 12], 1):
    wm.column_dimensions[get_column_letter(i)].width = w
wm.freeze_panes = f"C{first}"
LAST = first + N - 1

# ============================================================= ใบแจ้งหนี้
def MB(col): return f"VLOOKUP($J$2,'บันทึกค่าน้ำไฟ'!$A:$P,{col},0)"
def MT(col): return f"VLOOKUP($J$2,{MASTER},{col},0)"

iv = wb.create_sheet("ใบแจ้งหนี้")
iv.sheet_view.showGridLines = False
for i, w in enumerate([5, 14, 16, 11, 9, 13, 13, 13], 1):
    iv.column_dimensions[get_column_letter(i)].width = w
iv.column_dimensions["J"].width = 14

iv["J1"] = "เลือกห้อง:"; iv["J1"].font = F(11, True, "C00000"); iv["J1"].alignment = C
iv["J2"] = rooms[0]["room"]; iv["J2"].font = F(16, True, "C00000"); iv["J2"].fill = INPUT; iv["J2"].alignment = C; iv["J2"].border = box
dv = DataValidation(type="list", formula1=f"='บันทึกค่าน้ำไฟ'!$A${first}:$A${LAST}", allow_blank=False)
iv.add_data_validation(dv); dv.add(iv["J2"])
iv["J3"] = "← เลือกห้องที่นี่"; iv["J3"].font = F(9, False, "C00000"); iv["J3"].alignment = C

def merge_set(rng, val, font, align, fill=None, border=False):
    iv.merge_cells(rng); c = iv[rng.split(":")[0]]
    c.value = val; c.font = font; c.alignment = align
    if fill: c.fill = fill
    if border:
        x1, y1, x2, y2 = range_boundaries(rng)
        for rr in range(y1, y2 + 1):
            for cc in range(x1, x2 + 1):
                iv.cell(rr, cc).border = box

merge_set("A1:H1", "ใบแจ้งหนี้", F(22, True), C); iv.row_dimensions[1].height = 30
merge_set("A2:H2", "อพาร์ทเม้นท์ มั่งมีทวีสุข", F(13, True), C)
merge_set("A3:H3", "558/1 ถนนท่าดินแดง 16 แขวงคลองสาน เขตคลองสาน กรุงเทพฯ 10600", F(10), C)

iv["A5"] = "ชื่อลูกค้า :"; iv["A5"].font = F(10, True); iv["A5"].alignment = Rg
merge_set("B5:D5", f'=IFERROR({MT(2)},"")', F(11, True), L)
iv["A6"] = "ที่อยู่ :"; iv["A6"].font = F(10, True); iv["A6"].alignment = Rg
merge_set("B6:D6", f'=IFERROR({MT(3)},"")', F(9), L)
iv["F5"] = "ห้อง :"; iv["F5"].font = F(10, True); iv["F5"].alignment = Rg
iv["G5"] = "=$J$2"; iv["G5"].font = F(12, True); iv["G5"].alignment = C
iv["F6"] = "วันที่ :"; iv["F6"].font = F(10, True); iv["F6"].alignment = Rg
iv["G6"] = '=TEXT(TODAY(),"d/m/yyyy")'; iv["G6"].font = F(10); iv["G6"].alignment = C
iv["F7"] = "เดือนค่าเช่า :"; iv["F7"].font = F(10, True); iv["F7"].alignment = Rg
iv["G7"] = "='บันทึกค่าน้ำไฟ'!$D$1"; iv["G7"].font = F(10); iv["G7"].alignment = C
iv["F8"] = "เดือนน้ำ-ไฟ :"; iv["F8"].font = F(10, True); iv["F8"].alignment = Rg
iv["G8"] = "='บันทึกค่าน้ำไฟ'!$D$2"; iv["G8"].font = F(10); iv["G8"].alignment = C

hr = 10
iv.merge_cells(f"B{hr}:C{hr}"); iv.merge_cells(f"G{hr}:H{hr}")
for col, txt in [("A", "ลำดับ"), ("B", "รายการ"), ("D", "จำนวน"), ("E", "หน่วย"), ("F", "ราคา/หน่วย"), ("G", "จำนวนเงิน")]:
    c = iv[f"{col}{hr}"]; c.value = txt; c.font = F(10, True, "FFFFFF"); c.fill = HEAD; c.alignment = C
for col in "ABCDEFGH":
    iv[f"{col}{hr}"].border = box; iv[f"{col}{hr}"].fill = HEAD

def item(row, no, desc, qty, unit, price, amount):
    iv[f"A{row}"] = no; iv[f"A{row}"].font = F(10); iv[f"A{row}"].alignment = C
    iv.merge_cells(f"B{row}:C{row}"); iv[f"B{row}"] = desc; iv[f"B{row}"].font = F(10); iv[f"B{row}"].alignment = L
    iv[f"D{row}"] = qty; iv[f"D{row}"].font = F(10); iv[f"D{row}"].alignment = C; iv[f"D{row}"].number_format = MONEY
    iv[f"E{row}"] = unit; iv[f"E{row}"].font = F(10); iv[f"E{row}"].alignment = C
    iv[f"F{row}"] = price; iv[f"F{row}"].font = F(10); iv[f"F{row}"].alignment = Rg; iv[f"F{row}"].number_format = MONEY
    iv.merge_cells(f"G{row}:H{row}"); iv[f"G{row}"] = amount; iv[f"G{row}"].font = F(10); iv[f"G{row}"].alignment = Rg; iv[f"G{row}"].number_format = MONEY
    for col in "ABCDEFGH": iv[f"{col}{row}"].border = box

item(11, 1, "ค่าเช่าห้อง", 1, "ห้อง", f"=IFERROR({MB(3)},0)", f"=IFERROR({MB(3)},0)")
item(12, 2, "ค่าเช่าเฟอร์นิเจอร์", 1, "ชุด", f"=IFERROR({MB(4)},0)", f"=IFERROR({MB(4)},0)")
item(13, 3, f'="ค่าไฟฟ้า  (เลขเก่า "&IFERROR({MB(5)},"")&"  ถึง  "&IFERROR({MB(6)},"")&")"',
     f"=IFERROR({MB(7)},0)", "ยูนิต", f"=IFERROR({MT(9)},0)", f"=IFERROR({MB(8)},0)")
item(14, 4, f'="ค่าน้ำประปา  (เลขเก่า "&IFERROR({MB(9)},"")&"  ถึง  "&IFERROR({MB(10)},"")&")"',
     f"=IFERROR({MB(11)},0)", "ยูนิต", f"=IFERROR({MT(10)},0)", f"=IFERROR({MB(12)},0)")
item(15, 5, "ค่าส่วนกลาง", 1, "เดือน", f"=IFERROR({MB(13)},0)", f"=IFERROR({MB(13)},0)")
item(16, 6, "ค่าขยะ", 1, "เดือน", f"=IFERROR({MB(14)},0)", f"=IFERROR({MB(14)},0)")
item(17, 7, "อื่นๆ", "", "", "", f"=IFERROR({MB(15)},0)")

merge_set("A18:F18",
          '="หมายเหตุ : ค่าเช่าห้องเดือน "&\'บันทึกค่าน้ำไฟ\'!$D$1&"   /   ค่าน้ำ-ค่าไฟเดือน "&\'บันทึกค่าน้ำไฟ\'!$D$2',
          F(9, False, "595959"), L)
iv.merge_cells("A19:E19")
iv["F19"] = "รวมทั้งสิ้น (บาท)"; iv["F19"].font = F(11, True); iv["F19"].alignment = C; iv["F19"].fill = TOT; iv["F19"].border = box
iv.merge_cells("G19:H19")
iv["G19"] = f"=IFERROR({MB(16)},0)"; iv["G19"].font = F(13, True, "375623"); iv["G19"].alignment = Rg
iv["G19"].number_format = MONEY; iv["G19"].fill = TOT; iv["G19"].border = box; iv["H19"].border = box
merge_set("A20:H20", f'="(ตัวอักษร)  "&IFERROR(BAHTTEXT(IFERROR({MB(16)},0)),"")',
          F(10, True, "375623"), C, fill=TOT, border=True)

merge_set("A22:H22", "ชำระเงินผ่าน : ธนาคารเกียรตินาคินภัทร  เลขที่บัญชี 20-0208389-2  นายชวนันท์ สุขพรชัยรัก", F(10, True), L)
merge_set("A23:H23", "กรุณาชำระภายในวันที่ 5 ของเดือนถัดไป (ชำระหลังวันที่ 5 คิดค่าธรรมเนียมล่าช้าวันละ 200 บาท)", F(9, False, "C00000"), L)
merge_set("A24:H24", "โอนแล้วกรุณาแจ้งผ่าน LINE ID : MT.Apartment  (หากไม่แจ้ง ทางเราจะถือว่ายังไม่ได้รับเงินค่ะ)", F(9), L)
merge_set("F27:H27", "ผู้จัดทำ ...............................................", F(10), C)

iv.print_area = "A1:H28"
iv.page_setup.orientation = "portrait"; iv.page_setup.paperSize = 9
iv.page_setup.fitToWidth = 1; iv.page_setup.fitToHeight = 1
iv.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
iv.page_margins.left = iv.page_margins.right = 0.4
iv.page_margins.top = iv.page_margins.bottom = 0.5

# ================================================================== วิธีใช้
gd = wb.create_sheet("วิธีใช้")
gd.sheet_view.showGridLines = False
gd.column_dimensions["A"].width = 3; gd.column_dimensions["B"].width = 112
gd["B2"] = "วิธีใช้ระบบออกใบแจ้งหนี้  (อพาร์ทเม้นท์ มั่งมีทวีสุข)"; gd["B2"].font = F(16, True, "2F5496")
guide = [
    ("ทำทุกเดือน — แค่ 3 ขั้นตอน", F(13, True, "C00000"), BANNER),
    ('ขั้นที่ 1   ไปที่ชีต "บันทึกค่าน้ำไฟ"  →  กรอกเฉพาะ "ช่องสีเหลือง" คือ  ไฟ-เลขใหม่  และ  น้ำ-เลขใหม่  ของแต่ละห้อง', F(12), None),
    ("              (ค่าไฟ ค่าน้ำ และยอดรวม ระบบคำนวณให้เองอัตโนมัติ รวมถึงค่าน้ำขั้นต่ำ 100 บาท — ไม่ต้องคิดเลขเอง)", F(10, False, "595959"), None),
    ('ขั้นที่ 2   แก้ "เดือนที่แจ้งหนี้" และ "เดือนค่าน้ำ-ไฟ" ที่มุมบนของชีต ให้ตรงกับเดือนปัจจุบัน', F(12), None),
    ('ขั้นที่ 3   ไปที่ชีต "ใบแจ้งหนี้"  →  เลือกห้องจากช่องสีเหลืองมุมขวา  →  ข้อมูลขึ้นครบทันที  →  กด Ctrl+P เพื่อพิมพ์ หรือบันทึกเป็น PDF', F(12), None),
    ("", F(8), None),
    ("สิ้นเดือน (เริ่มเดือนใหม่)", F(13, True, "C00000"), BANNER),
    ('ในชีต "บันทึกค่าน้ำไฟ" :  เลือกตัวเลขทั้งคอลัมน์ "เลขใหม่" (ทั้งไฟและน้ำ)  →  Copy  →  คลิกขวาที่ "เลขเก่า"  →  วางแบบ "ค่า (Values / 123)"', F(11), None),
    ('จากนั้นลบตัวเลขในคอลัมน์ "เลขใหม่" ออก  เพื่อเริ่มกรอกของเดือนถัดไป', F(11), None),
    ("", F(8), None),
    ("ข้อควรรู้", F(13, True, "C00000"), BANNER),
    ("• สีเหลือง = พนักงานกรอกเอง    สีเทา = ระบบคำนวณอัตโนมัติ (ห้ามแก้ จะทำให้สูตรเสีย)", F(11), None),
    ('• แก้ข้อมูลผู้เช่า / ค่าเช่า / ค่าส่วนกลาง / เรทค่าน้ำ-ไฟ / ค่าน้ำขั้นต่ำ  ได้ที่ชีต "ผู้เช่า"', F(11), None),
    ('• เพิ่มผู้เช่าใหม่: พิมพ์ข้อมูลต่อท้ายในชีต "ผู้เช่า" แล้วเพิ่มแถวห้องนั้นในชีต "บันทึกค่าน้ำไฟ" (ก๊อปสูตรจากแถวบน)', F(11), None),
    ("• กรณีเปลี่ยนมิเตอร์ (เลขใหม่น้อยกว่าเลขเก่า): ให้ใส่จำนวนหน่วยที่ใช้จริงผ่านช่อง \"อื่นๆ\" หรือปรับเลขเก่าให้ถูกต้องเอง", F(10, False, "595959"), None),
    ("• ยอดเงินเป็นตัวหนังสือ (บาทถ้วน) ใช้ฟังก์ชัน BAHTTEXT ของ Excel ภาษาไทย — หากขึ้น #NAME? แปลว่าเครื่องนั้นไม่ใช่ Excel ภาษาไทย", F(10, False, "595959"), None),
]
r = 4
for txt, font, fill in guide:
    c = gd[f"B{r}"]; c.value = txt; c.font = font; c.alignment = L
    if fill: c.fill = fill
    gd.row_dimensions[r].height = 24 if txt else 8
    r += 1

# ลำดับชีต
order = ["วิธีใช้", "บันทึกค่าน้ำไฟ", "ใบแจ้งหนี้", "ผู้เช่า"]
wb._sheets.sort(key=lambda s: order.index(s.title))
wb.active = 0
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print("saved", OUT, "| sheets:", wb.sheetnames, "| rooms:", N)
