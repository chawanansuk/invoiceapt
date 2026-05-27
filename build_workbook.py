#!/usr/bin/env python3
"""สร้างไฟล์ระบบใบแจ้งหนี้/ใบเสร็จ (Excel) ของอพาร์ทเม้นท์มั่งมีทวีสุข จาก room_data.json

วิธีรัน:  python3 build_workbook.py
ผลลัพธ์:  ระบบใบแจ้งหนี้-มั่งมีทวีสุข.xlsx

ชีต: วิธีใช้ | ตั้งค่า | บันทึกค่าน้ำไฟ | ใบแจ้งหนี้ | ใบเสร็จรับเงิน | ผู้เช่า

กฎการคิดเงิน (ดึงจากไฟล์เดิมทั้ง 5 ชั้น):
  ค่าไฟ  = (เลขใหม่-เลขเก่า) x เรทค่าไฟ                       (มาตรฐาน 8 บ./หน่วย)
  ค่าน้ำ = MAX((เลขใหม่-เลขเก่า) x เรทค่าน้ำ, ค่าน้ำขั้นต่ำ)   (มาตรฐาน 20 บ., ขั้นต่ำ 100; ปีกเรท15 ไม่มีขั้นต่ำ)
  รวม    = ค่าเช่า+ค่าเฟอร์+ค่าไฟ+ค่าน้ำ+ค่าส่วนกลาง+ค่าขยะ+อื่นๆ

รายละเอียดที่รองรับ:
  - บัญชีธนาคารต่างกันตามชั้น/ห้อง (เก็บต่อห้องในชีตผู้เช่า)
  - ใบเสร็จสลับโหมด "เบิกได้ (มีเลขภาษี)" ใช้ชื่อ/ที่อยู่/เลขผู้เสียภาษีจากชีตตั้งค่า
  - วันที่แบบ พ.ศ. ไทย, เลขที่ INV/ใบเสร็จ รูปแบบ running-ห้อง-ปีพ.ศ.
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

HEAD   = PatternFill("solid", fgColor="2F5496")
INPUT  = PatternFill("solid", fgColor="FFF2CC")
CARRY  = PatternFill("solid", fgColor="FFF9E6")
AUTO   = PatternFill("solid", fgColor="F2F2F2")
TOT    = PatternFill("solid", fgColor="E2EFDA")
BANNER = PatternFill("solid", fgColor="FCE4D6")
SET    = PatternFill("solid", fgColor="DDEBF7")
MONEY  = "#,##0"

wb = openpyxl.Workbook()

# ============================================================ ตั้งค่า (settings)
st = wb.active
st.title = "ตั้งค่า"
st.sheet_view.showGridLines = False
st.column_dimensions["A"].width = 3
st.column_dimensions["B"].width = 34
st.column_dimensions["C"].width = 62
st["B2"] = "ตั้งค่าข้อมูลกิจการ (แก้ที่นี่ที่เดียว ใบแจ้งหนี้/ใบเสร็จจะเปลี่ยนตาม)"
st["B2"].font = F(14, True, "2F5496")

def setrow(row, label, value, note=""):
    st[f"B{row}"] = label; st[f"B{row}"].font = F(11, True); st[f"B{row}"].alignment = L
    st[f"C{row}"] = value;  st[f"C{row}"].font = F(11); st[f"C{row}"].alignment = L
    st[f"C{row}"].fill = INPUT; st[f"C{row}"].border = box
    if note:
        st[f"D{row}"] = note; st[f"D{row}"].font = F(9, False, "808080"); st[f"D{row}"].alignment = L

st["B4"] = "ก) ใบแจ้งหนี้ / ใบเสร็จปกติ"; st["B4"].font = F(12, True, "C00000"); st["B4"].fill = BANNER
setrow(5, "ชื่อกิจการ", "อพาร์ทเม้นท์ มั่งมีทวีสุข")
setrow(6, "ที่อยู่ บรรทัด 1", "558/1 ถนนท่าดินแดง 16 แขวงคลองสาน")
setrow(7, "ที่อยู่ บรรทัด 2", "เขตคลองสาน กรุงเทพฯ 10600")

st["B9"] = "ข) ใบเสร็จแบบ \"เบิกได้\" (มีเลขผู้เสียภาษี)"; st["B9"].font = F(12, True, "C00000"); st["B9"].fill = BANNER
setrow(10, "ชื่อกิจการ", "อพาร์ทเม้นท์ บ้านแห่งความสุข")
setrow(11, "ที่อยู่ บรรทัด 1", "576 ถนนท่าดินแดง 16 แขวงคลองสาน โทร 099-441-9465")
setrow(12, "ที่อยู่ บรรทัด 2", "เขตคลองสาน กรุงเทพฯ 10600")
setrow(13, "เลขประจำตัวผู้เสียภาษี", "129900358828")

st["B15"] = "ค) ข้อความท้ายเอกสาร"; st["B15"].font = F(12, True, "C00000"); st["B15"].fill = BANNER
setrow(16, "เงื่อนไขการชำระ", "กรุณาชำระภายในวันที่ 5 ของเดือนถัดไป (ชำระหลังวันที่ 5 คิดค่าธรรมเนียมล่าช้าวันละ 200 บาท)")
setrow(17, "แจ้งโอน", "โอนแล้วกรุณาแจ้งผ่าน LINE ID : MT.Apartment  (หากไม่แจ้ง ทางเราจะถือว่ายังไม่ได้รับเงินค่ะ)")

st["B19"] = "ง) บัญชีธนาคารแยกตามชั้น (อ้างอิง — ค่าจริงอยู่ในชีตผู้เช่า รายห้อง)"; st["B19"].font = F(12, True, "C00000"); st["B19"].fill = BANNER
banks_ref = [
    ("ชั้น 2-3", "ธนาคารเกียรตินาคินภัทร  20-0208389-2  นายชวนันท์ สุขพรชัยรัก"),
    ("ชั้น 4-5", "ธนาคารกรุงศรีอยุธยา สาขาท่าดินแดง  112-1-33961-7"),
    ("ชั้น 6", "ธนาคารกรุงไทย สาขาราชวงศ์  043-0-24123-2"),
    ("ห้อง 218/318/418/518", "ธนาคารกรุงไทย สาขาราชวงศ์  043-0-24123-2 (เฉพาะห้อง)"),
]
rr = 20
for fl, bk in banks_ref:
    st[f"B{rr}"] = fl; st[f"B{rr}"].font = F(10); st[f"B{rr}"].alignment = L
    st[f"C{rr}"] = bk; st[f"C{rr}"].font = F(10); st[f"C{rr}"].alignment = L
    rr += 1

# refs to settings cells
NAME1, A1a, A1b = "ตั้งค่า!$C$5", "ตั้งค่า!$C$6", "ตั้งค่า!$C$7"
NAME2, A2a, A2b, TAXID = "ตั้งค่า!$C$10", "ตั้งค่า!$C$11", "ตั้งค่า!$C$12", "ตั้งค่า!$C$13"
FOOT1, FOOT2 = "ตั้งค่า!$C$16", "ตั้งค่า!$C$17"

# ============================================================ ผู้เช่า (master)
ws = wb.create_sheet("ผู้เช่า")
ws.sheet_view.showGridLines = False
headers = ["ห้อง", "ชื่อผู้เช่า", "ที่อยู่", "เบอร์โทร", "ค่าเช่า/เดือน", "ค่าเฟอร์/เดือน",
           "ค่าส่วนกลาง", "ค่าขยะ", "เรทค่าไฟ/หน่วย", "เรทค่าน้ำ/หน่วย",
           "เลขที่สัญญา", "วันเข้าอยู่", "สถานะ/หมายเหตุ", "ค่าน้ำขั้นต่ำ", "บัญชีธนาคารที่รับชำระ"]
ws.append(headers)
for c in range(1, len(headers) + 1):
    cell = ws.cell(1, c)
    cell.font = F(11, True, "FFFFFF"); cell.fill = HEAD; cell.alignment = C; cell.border = box
for r in rooms:
    ws.append([r["room"], r["name"], r["address"], r["phone"], r["rent"], r["furniture"],
               r["common"], r["garbage"], r["elec_rate"], r["water_rate"],
               r["contract"], r["movein"], r["note"], r["water_min"], r["bank"]])
for row in range(2, N + 2):
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row, c); cell.font = F(10); cell.border = box
        cell.alignment = L if c in (2, 3, 11, 12, 13, 15) else C
for i, w in enumerate([7, 26, 38, 13, 10, 11, 10, 8, 11, 11, 14, 11, 22, 10, 52], 1):
    ws.column_dimensions[get_column_letter(i)].width = w
ws.freeze_panes = "B2"
MASTER = "ผู้เช่า!$A:$O"

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
LAST = first + N - 1
# totals row
trow = LAST + 1
wm.cell(trow, 2, "รวมทั้งตึก").font = F(10, True)
wm.cell(trow, 2).alignment = Rg
for col in (3, 4, 8, 12, 13, 14, 15, 16):
    cl = get_column_letter(col)
    cell = wm.cell(trow, col)
    cell.value = f"=SUM({cl}{first}:{cl}{LAST})"
    cell.font = F(10, True, "375623"); cell.number_format = MONEY; cell.fill = TOT; cell.border = box; cell.alignment = C
for i, w in enumerate([7, 24, 9, 9, 11, 11, 8, 9, 11, 11, 8, 9, 9, 8, 9, 12], 1):
    wm.column_dimensions[get_column_letter(i)].width = w
wm.freeze_panes = f"C{first}"

# ===================================================== helpers for documents
def THDATE(cell):
    return (f'=DAY({cell})&" "&CHOOSE(MONTH({cell}),"มกราคม","กุมภาพันธ์","มีนาคม","เมษายน",'
            f'"พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม")'
            f'&" "&(YEAR({cell})+543)')

def MB(col): return f"VLOOKUP($J$2,'บันทึกค่าน้ำไฟ'!$A:$P,{col},0)"
def MT(col): return f"VLOOKUP($J$2,{MASTER},{col},0)"

def make_doc(sheet_title, doc_label, numlabel, is_receipt):
    iv = wb.create_sheet(sheet_title)
    iv.sheet_view.showGridLines = False
    for i, w in enumerate([5, 14, 16, 11, 9, 13, 13, 13], 1):
        iv.column_dimensions[get_column_letter(i)].width = w
    iv.column_dimensions["J"].width = 16

    # control panel (outside print area)
    iv["J1"] = "เลือกห้อง:"; iv["J1"].font = F(11, True, "C00000"); iv["J1"].alignment = C
    iv["J2"] = rooms[0]["room"]; iv["J2"].font = F(16, True, "C00000"); iv["J2"].fill = INPUT; iv["J2"].alignment = C; iv["J2"].border = box
    dv = DataValidation(type="list", formula1=f"='บันทึกค่าน้ำไฟ'!$A${first}:$A${LAST}", allow_blank=False)
    iv.add_data_validation(dv); dv.add(iv["J2"])
    iv["J3"] = "← เลือกห้อง"; iv["J3"].font = F(9, False, "C00000"); iv["J3"].alignment = C
    iv["I5"] = "วันที่ :"; iv["I5"].font = F(9, True); iv["I5"].alignment = Rg
    iv["J5"] = "=TODAY()"; iv["J5"].number_format = "d/m/yyyy"; iv["J5"].fill = INPUT; iv["J5"].border = box; iv["J5"].alignment = C; iv["J5"].font = F(10)
    iv["I6"] = "เลขรันนิ่ง :"; iv["I6"].font = F(9, True); iv["I6"].alignment = Rg
    iv["J6"] = 1; iv["J6"].fill = INPUT; iv["J6"].border = box; iv["J6"].alignment = C; iv["J6"].font = F(10)
    if is_receipt:
        iv["I7"] = "แบบเอกสาร :"; iv["I7"].font = F(9, True); iv["I7"].alignment = Rg
        iv["J7"] = "ปกติ"; iv["J7"].fill = INPUT; iv["J7"].border = box; iv["J7"].alignment = C; iv["J7"].font = F(10, True, "C00000")
        dv2 = DataValidation(type="list", formula1='"ปกติ,เบิกได้ (มีเลขภาษี)"', allow_blank=False)
        iv.add_data_validation(dv2); dv2.add(iv["J7"])

    def merge_set(rng, val, font, align, fill=None, border=False, numfmt=None):
        iv.merge_cells(rng); c = iv[rng.split(":")[0]]
        c.value = val; c.font = font; c.alignment = align
        if fill: c.fill = fill
        if numfmt: c.number_format = numfmt
        if border:
            x1, y1, x2, y2 = range_boundaries(rng)
            for r_ in range(y1, y2 + 1):
                for c_ in range(x1, x2 + 1):
                    iv.cell(r_, c_).border = box

    # title + entity header (entity switches on receipt)
    merge_set("A1:H1", doc_label, F(22, True), C); iv.row_dimensions[1].height = 30
    if is_receipt:
        cond = '$J$7="เบิกได้ (มีเลขภาษี)"'
        merge_set("A2:H2", f"=IF({cond},{NAME2},{NAME1})", F(13, True), C)
        merge_set("A3:H3", f"=IF({cond},{A2a},{A1a})", F(10), C)
        merge_set("A4:H4", f'=IF({cond},{A2b}&"   เลขประจำตัวผู้เสียภาษี "&{TAXID},{A1b})', F(10), C)
        body0 = 6
    else:
        merge_set("A2:H2", f"={NAME1}", F(13, True), C)
        merge_set("A3:H3", f"={A1a}", F(10), C)
        merge_set("A4:H4", f"={A1b}", F(10), C)
        body0 = 6

    # customer block + meta
    iv[f"A{body0}"] = "ชื่อลูกค้า :"; iv[f"A{body0}"].font = F(10, True); iv[f"A{body0}"].alignment = Rg
    merge_set(f"B{body0}:D{body0}", f'=IFERROR({MT(2)},"")', F(11, True), L)
    iv[f"A{body0+1}"] = "ที่อยู่ :"; iv[f"A{body0+1}"].font = F(10, True); iv[f"A{body0+1}"].alignment = Rg
    merge_set(f"B{body0+1}:D{body0+1}", f'=IFERROR({MT(3)},"")', F(9), L)
    iv[f"F{body0}"] = "ห้อง :"; iv[f"F{body0}"].font = F(10, True); iv[f"F{body0}"].alignment = Rg
    iv[f"G{body0}"] = "=$J$2"; iv[f"G{body0}"].font = F(12, True); iv[f"G{body0}"].alignment = C
    iv[f"F{body0+1}"] = f"{numlabel} :"; iv[f"F{body0+1}"].font = F(10, True); iv[f"F{body0+1}"].alignment = Rg
    iv[f"G{body0+1}"] = '=TEXT($J$6,"000000")&"-"&$J$2&"-"&(YEAR($J$5)+543)'; iv[f"G{body0+1}"].font = F(9); iv[f"G{body0+1}"].alignment = C
    iv[f"F{body0+2}"] = "วันที่ :"; iv[f"F{body0+2}"].font = F(10, True); iv[f"F{body0+2}"].alignment = Rg
    iv[f"G{body0+2}"] = THDATE("$J$5"); iv[f"G{body0+2}"].font = F(10); iv[f"G{body0+2}"].alignment = C

    hr = body0 + 4
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

    b = hr + 1
    item(b+0, 1, "ค่าเช่าห้อง", 1, "ห้อง", f"=IFERROR({MB(3)},0)", f"=IFERROR({MB(3)},0)")
    item(b+1, 2, "ค่าเช่าเฟอร์นิเจอร์", 1, "ชุด", f"=IFERROR({MB(4)},0)", f"=IFERROR({MB(4)},0)")
    item(b+2, 3, f'="ค่าไฟฟ้า  (เลขเก่า "&IFERROR({MB(5)},"")&"  ถึง  "&IFERROR({MB(6)},"")&")"',
         f"=IFERROR({MB(7)},0)", "ยูนิต", f"=IFERROR({MT(9)},0)", f"=IFERROR({MB(8)},0)")
    item(b+3, 4, f'="ค่าน้ำประปา  (เลขเก่า "&IFERROR({MB(9)},"")&"  ถึง  "&IFERROR({MB(10)},"")&")"',
         f"=IFERROR({MB(11)},0)", "ยูนิต", f"=IFERROR({MT(10)},0)", f"=IFERROR({MB(12)},0)")
    item(b+4, 5, "ค่าส่วนกลาง", 1, "เดือน", f"=IFERROR({MB(13)},0)", f"=IFERROR({MB(13)},0)")
    item(b+5, 6, "ค่าขยะ", 1, "เดือน", f"=IFERROR({MB(14)},0)", f"=IFERROR({MB(14)},0)")
    item(b+6, 7, "อื่นๆ", "", "", "", f"=IFERROR({MB(15)},0)")

    note = b + 7
    merge_set(f"A{note}:F{note}",
              '="หมายเหตุ : ค่าเช่าห้องเดือน "&\'บันทึกค่าน้ำไฟ\'!$D$1&"   /   ค่าน้ำ-ค่าไฟเดือน "&\'บันทึกค่าน้ำไฟ\'!$D$2',
              F(9, False, "595959"), L)
    tline = note + 1
    iv.merge_cells(f"A{tline}:E{tline}")
    iv[f"F{tline}"] = "รวมทั้งสิ้น (บาท)"; iv[f"F{tline}"].font = F(11, True); iv[f"F{tline}"].alignment = C; iv[f"F{tline}"].fill = TOT; iv[f"F{tline}"].border = box
    iv.merge_cells(f"G{tline}:H{tline}")
    iv[f"G{tline}"] = f"=IFERROR({MB(16)},0)"; iv[f"G{tline}"].font = F(13, True, "375623"); iv[f"G{tline}"].alignment = Rg
    iv[f"G{tline}"].number_format = MONEY; iv[f"G{tline}"].fill = TOT; iv[f"G{tline}"].border = box; iv[f"H{tline}"].border = box
    bahtrow = tline + 1
    merge_set(f"A{bahtrow}:H{bahtrow}", f'="(ตัวอักษร)  "&IFERROR(BAHTTEXT(IFERROR({MB(16)},0)),"")',
              F(10, True, "375623"), C, fill=TOT, border=True)

    foot = bahtrow + 2
    if is_receipt:
        merge_set(f"A{foot}:H{foot}", "ได้รับเงินตามรายการข้างต้นเรียบร้อยแล้ว", F(9, False, "595959"), L)
        merge_set(f"B{foot+3}:D{foot+3}", "ผู้รับเงิน ...................................", F(10), C)
        merge_set(f"F{foot+3}:H{foot+3}", "วันที่ ...................................", F(10), C)
        last_row = foot + 4
    else:
        merge_set(f"A{foot}:H{foot}", f'="ชำระเงินผ่าน : "&IFERROR({MT(15)},"")', F(10, True), L)
        merge_set(f"A{foot+1}:H{foot+1}", f"={FOOT1}", F(9, False, "C00000"), L)
        merge_set(f"A{foot+2}:H{foot+2}", f"={FOOT2}", F(9), L)
        merge_set(f"F{foot+4}:H{foot+4}", "ผู้จัดทำ ...................................", F(10), C)
        last_row = foot + 5

    iv.print_area = f"A1:H{last_row}"
    iv.page_setup.orientation = "portrait"; iv.page_setup.paperSize = 9
    iv.page_setup.fitToWidth = 1; iv.page_setup.fitToHeight = 1
    iv.sheet_properties.pageSetUpPr = PageSetupProperties(fitToPage=True)
    iv.page_margins.left = iv.page_margins.right = 0.4
    iv.page_margins.top = iv.page_margins.bottom = 0.5
    return iv

make_doc("ใบแจ้งหนี้", "ใบแจ้งหนี้", "เลขที่ INV", is_receipt=False)
make_doc("ใบเสร็จรับเงิน", "ใบเสร็จรับเงิน", "เลขที่", is_receipt=True)

# ================================================================== วิธีใช้
gd = wb.create_sheet("วิธีใช้")
gd.sheet_view.showGridLines = False
gd.column_dimensions["A"].width = 3; gd.column_dimensions["B"].width = 116
gd["B2"] = "วิธีใช้ระบบออกใบแจ้งหนี้ / ใบเสร็จ  (อพาร์ทเม้นท์ มั่งมีทวีสุข)"; gd["B2"].font = F(16, True, "2F5496")
guide = [
    ("ทำทุกเดือน — 3 ขั้นตอน", F(13, True, "C00000"), BANNER),
    ('ขั้นที่ 1   ชีต "บันทึกค่าน้ำไฟ"  →  กรอกเฉพาะช่องสีเหลือง คือ  ไฟ-เลขใหม่  และ  น้ำ-เลขใหม่  ของแต่ละห้อง', F(12), None),
    ("              (ค่าไฟ/ค่าน้ำ/ยอดรวม คำนวณให้เอง รวมค่าน้ำขั้นต่ำ 100 บาท — ไม่ต้องคิดเลข)", F(10, False, "595959"), None),
    ('ขั้นที่ 2   แก้ "เดือนที่แจ้งหนี้" และ "เดือนค่าน้ำ-ไฟ" ที่มุมบนของชีตให้ตรงเดือน', F(12), None),
    ('ขั้นที่ 3   ชีต "ใบแจ้งหนี้" หรือ "ใบเสร็จรับเงิน"  →  เลือกห้องช่องสีเหลือง  →  ใส่วันที่/เลขรันนิ่ง  →  กด Ctrl+P พิมพ์/บันทึก PDF', F(12), None),
    ("", F(8), None),
    ("ใบเสร็จแบบ \"เบิกได้\" (ลูกค้าเบิกบริษัท)", F(13, True, "C00000"), BANNER),
    ('ในชีต "ใบเสร็จรับเงิน" ช่อง "แบบเอกสาร" เลือก "เบิกได้ (มีเลขภาษี)"  →  หัวเอกสารจะเปลี่ยนเป็นชื่อกิจการที่มีเลขผู้เสียภาษีอัตโนมัติ', F(11), None),
    ("", F(8), None),
    ("เรื่องบัญชีธนาคาร (สำคัญ)", F(13, True, "C00000"), BANNER),
    ("บัญชีรับเงินต่างกันตามชั้น (ชั้น2-3 เกียรตินาคิน, ชั้น4-5 กรุงศรี, ชั้น6 กรุงไทย, ห้อง x18 กรุงไทย) ระบบเลือกให้เองตามห้อง", F(11), None),
    ('ถ้าต้องการเปลี่ยนบัญชีของห้องใด แก้คอลัมน์ "บัญชีธนาคารที่รับชำระ" ในชีต "ผู้เช่า"', F(10, False, "595959"), None),
    ("", F(8), None),
    ("สิ้นเดือน (เริ่มเดือนใหม่)", F(13, True, "C00000"), BANNER),
    ('ชีต "บันทึกค่าน้ำไฟ" : เลือกตัวเลขคอลัมน์ "เลขใหม่" (ไฟและน้ำ) → Copy → คลิกขวาที่ "เลขเก่า" → วางแบบ "ค่า (Values)" → แล้วลบ "เลขใหม่"', F(11), None),
    ("", F(8), None),
    ("ข้อควรรู้", F(13, True, "C00000"), BANNER),
    ("• สีเหลือง = กรอกเอง    สีเทา = ระบบคำนวณ (ห้ามแก้)", F(11), None),
    ('• ชื่อกิจการ / เลขภาษี / ข้อความท้ายเอกสาร แก้ได้ที่ชีต "ตั้งค่า"', F(11), None),
    ('• ข้อมูลผู้เช่า/ค่าเช่า/เรท/บัญชี แก้ได้ที่ชีต "ผู้เช่า" — เพิ่มห้องใหม่ให้เพิ่มแถวทั้งในผู้เช่าและบันทึกค่าน้ำไฟ (ก๊อปสูตรจากแถวบน)', F(11), None),
    ("• กรณีเปลี่ยนมิเตอร์ (เลขใหม่ < เลขเก่า): ปรับเลขเก่าให้ถูก หรือใส่ยอดผ่านช่อง \"อื่นๆ\"", F(10, False, "595959"), None),
    ("• ตัวหนังสือ \"บาทถ้วน\" และวันที่ พ.ศ. ใช้ได้กับ Excel ภาษาไทย (ถ้าขึ้น #NAME? แปลว่าไม่ใช่ Excel ไทย)", F(10, False, "595959"), None),
    ("• ยังไม่ได้ทำเวอร์ชันอังกฤษ/จีน (มีในไฟล์เดิม) — แจ้งได้ถ้าต้องการเพิ่ม", F(10, False, "808080"), None),
]
r = 4
for txt, font, fill in guide:
    c = gd[f"B{r}"]; c.value = txt; c.font = font; c.alignment = L
    if fill: c.fill = fill
    gd.row_dimensions[r].height = 23 if txt else 7
    r += 1

# ลำดับชีต
order = ["วิธีใช้", "ตั้งค่า", "บันทึกค่าน้ำไฟ", "ใบแจ้งหนี้", "ใบเสร็จรับเงิน", "ผู้เช่า"]
wb._sheets.sort(key=lambda s: order.index(s.title))
wb.active = 0
wb.calculation.fullCalcOnLoad = True
wb.save(OUT)
print("saved", OUT)
print("sheets:", wb.sheetnames)
print("rooms:", N, "| meter rows", first, "-", LAST)
