# PROGRESS

ไฟล์นี้คือสถานะงานล่าสุด เมื่อเริ่ม session ใหม่หรือเปลี่ยนโมเดล ให้อ่านไฟล์นี้และ `git log` ก่อนทำต่อ
main agent (ไม่ว่าโมเดลไหน) ทำหน้าที่ประสานงานตามแผนนี้ต่อ ไม่ต้องเริ่มใหม่

งานทั้งหมดอยู่บน branch `feat/site` (ยังไม่ merge เข้า `main` และยังไม่ push)

## แผนที่ตกลงกันแล้ว

1. วางแผน (เสร็จ) 2. สัญญากลาง (เสร็จ) 3. agents ทำงานขนาน 4. main รวมงาน 5. รีวิวข้ามโมดูล + test + build + ตรวจหน้าตา 6. README และ commit

- **progress** = day / 25: ก่อน 1 ธ.ค. day = 0 (เมล็ด + นับถอยหลังถึง 1 ธ.ค.), 1 ถึง 25 ธ.ค. day = วันที่, 26 ถึง 31 ธ.ค. ค้างที่ 25, 1 ม.ค. กลับเป็นเมล็ด
- **ต้นไม้**: รูปทรงมาจาก `getTreeShape(day)` (pure) ของตกแต่งทุกชิ้นมีตำแหน่งตายตัวจาก seed และปรากฏตามจำนวนใน `core/growth.ts` ของเก่าไม่ขยับ
- **ของใหม่ทุกวัน**: ความสูงเพิ่มทุกวัน, ไฟเริ่มวันที่ 3 (+2/วัน), ลูกบอลเริ่มวันที่ 6, ริบบิ้นเริ่มวันที่ 12, ชั้นใบเพิ่มทุก 4 วัน, ดาววันที่ 25
- **ของขวัญ**: กล่องแรกวันที่ 10 เพิ่มวันละกล่อง (วันที่ 25 = 16 กล่อง) ตำแหน่ง/สี/ขนาดของกล่อง index เดิมคงที่
- **Deploy**: Cloudflare Workers Static Assets + Workers Builds (ไม่ใช้ Pages) `wrangler.jsonc` มีแค่ `assets.directory` ไม่มี `main` ไม่มี `run_worker_first`

## การตัดสินใจด้านดีไซน์ (ผู้ใช้เลือกแล้ว)

| เรื่อง | ที่เลือก |
|---|---|
| ซานต้า | นั่งเลื่อนบินผ่านท้องฟ้าพร้อมกวางเรนเดียร์ทั่วไป (ไม่มีรูดอล์ฟจมูกแดง) |
| พาเลตต์ | คลาสสิกอบอุ่น (`src/palette.ts`) |
| ขนาด pixel | logical สูงราว 180px, กว้างขั้นต่ำ 120px, integer scaling ตาม device pixel |

## สัญญากลาง

| ไฟล์ | เนื้อหา |
|---|---|
| `src/types.ts` | `SceneParams`, `SceneLayer`, `TreeShape`, `Gift`, `DaylightState`, `IAudioManager`, `AppController`, `AppState`, `UI` |
| `src/config.ts` | seed, ขนาดฉาก, ช่วงเวลาของวัน, `SANTA_WINDOW`, ช่วงสุ่มซานต้า |
| `src/palette.ts` | สีทั้งหมด |
| `src/core/date.ts` | `getDay`, `getProgress`, นับถอยหลัง, `parseSimulatedNow` |
| `src/core/growth.ts` | `getTreeShape`, `halfWidthAt`, `lightCount`, `ornamentCount`, `ribbonCount`, `giftCount`, `hasStar` |
| `src/core/rng.ts`, `src/core/draw.ts` | ตัวสุ่มมี seed, ตัวช่วยวาด pixel |
| `src/main.ts` | game loop, integer scaling, ลำดับ layer: sky, snow.far, santa, gifts.behind, tree, lights, gifts.front, snow.near |

## สถานะโมดูล

| Agent | ไฟล์ | โมเดล | สถานะ |
|---|---|---|---|
| main | สัญญากลางด้านบน | - | เสร็จ |
| tree | `src/scene/tree.ts` | inherit | เสร็จ รีวิวแล้ว |
| effects | `src/core/daylight.ts`, `src/scene/sky.ts`, `snow.ts`, `lights.ts` | inherit | เสร็จ รีวิวแล้ว |
| gifts | `src/scene/gifts.ts` | inherit | เสร็จ รีวิวแล้ว |
| easter-egg | `src/core/santaSchedule.ts`, `src/scene/santa.ts` | inherit | เสร็จ รีวิวแล้ว |
| ui | `src/ui/*`, `src/audio/*`, `index.html`, `src/style.css` | inherit | เสร็จ รีวิวแล้ว |
| tests | `tests/*` (86 tests) | Sonnet 5.5 | เสร็จ รีวิวแล้ว |
| deploy | `wrangler.jsonc`, `README.md`, `CREDITS.md` | Sonnet 5.5 | เสร็จ รีวิวแล้ว |

## ขั้นที่เสร็จแล้ว

- [x] แจกงานให้ 7 agents และรวมงาน
- [x] `npm test` (86/86) และ `npm run build` ผ่าน
- [x] รีวิวข้ามโมดูล 2 รอบ (ฉาก, UI/ซานต้า/เสียง/tests/deploy) และแก้ตามที่พบ
- [x] ตรวจหน้าตาในเบราว์เซอร์: ก่อน 1 ธ.ค., วันที่ 1, 10, 12, 20, 25 กลางวัน/กลางคืน/พลบค่ำ, `?santa=now`, clean view, เต็มจอ, จอแนวตั้ง

## สิ่งที่แก้หลังรีวิว

- `halfWidthAt` ไม่นับแถว `bottomY` (ตรงกับที่ต้นไม้วาดจริง) ของตกแต่งและไฟจึงไม่ลอยนอกใบ
- ไฟประดับใช้จำนวนซิกแซกคงที่ หลอดเดิมไม่สลับข้างเมื่อต้นโต และซ่อนไฟระหว่างเอฟเฟกต์ต้นโต
- สไลเดอร์ debug, ปุ่มลอยตอนโฟกัสคีย์บอร์ด, Esc หลัง H+F, ป้ายชื่อ canvas, test ยืนยันค่าช่วงเวลาซานต้า

## สิ่งที่ยังไม่ได้ทำ / ต้องให้เจ้าของตัดสินใจ

- [ ] merge `feat/site` เข้า `main` แล้ว push (ยังไม่ได้ push อะไรเลย)
- [ ] ต่อ repo กับ Cloudflare Workers Builds ใน dashboard ตามขั้นตอนใน README
- [ ] ยังไม่ได้ดูด้วยตา: ซานต้าโผล่เองตามตัวจับเวลา, F11 ของเบราว์เซอร์, เครื่องมือถือจริง, prefers-reduced-motion
- [ ] เลือกไฟล์เสียง (พื้นหลังวนซ้ำ และ "โฮ่ โฮ่ โฮ่") แล้วใส่ใน `AudioManager` พร้อมจด license ใน `CREDITS.md`
- รู้อยู่แล้ว: สายไฟสีเขียวเข้มวาดทับลูกบอลบางลูก (ถ้าไม่ชอบ ให้แยกชั้นของตกแต่งไปวาดหลังไฟ)
- รู้อยู่แล้ว: wrangler ไม่ได้อยู่ใน devDependencies (Workers Builds เรียกผ่าน `npx`) ถ้าอยากตรึงเวอร์ชันให้เพิ่มเอง

## รอบที่ 2 (อัปเดตล่าสุด): ต้นใหญ่ขึ้น หน้าหลักไม่มี UI หน้า debug แยก ของตกแต่งเพิ่ม

การตัดสินใจของเจ้าของ (แทนที่ของเดิมเมื่อขัดกัน):
- **สไตล์**: คง pixel art แบบเดิม (ดู preview แบบนุ่ม/papercut/low-poly/pixel ละเอียดแล้วไม่เลือก) ฉากสูง logical 180 เท่าเดิม
- **ขนาดต้น**: วันที่ 1 สูง 25% ของจอ วันที่ 25 สูง 80% (รวมดาวราว 85%) ค่าอยู่ใน `src/config.ts` จอแนวตั้งจำกัดด้วยความกว้าง
- **หน้าหลัก**: มีแค่ `<canvas>` เต็มจอด้วย F / ดับเบิลคลิก / F11 ซ่อนเคอร์เซอร์หลัง 3 วินาที คลิกแรกปลดล็อกเสียง ปุ่ม M สลับ mute
- **หน้า debug**: `debug.html` (deploy แล้วเข้าที่ `/debug` ได้เอง ตามค่า default `html_handling` ของ Cloudflare) ใช้ `createApp()` ตัวเดียวกับหน้าหลัก
- **ของตกแต่ง**: แบ่ง 2 รอบ
- **Agents**: subagent ทุกตัวใช้ `model: sonnet`
- ตัดออก: parallax และ offscreen cache (ผูกกับลุคที่ไม่ใช่ pixel และฉาก pixel วาดเร็วพออยู่แล้ว)

สัญญากลางที่เปลี่ยน: `src/app.ts` (`createApp`), `src/core/growthAnim.ts`, `treeHeight(day, max)` / `getTreeShape(day, max)`, `tinselCount`, `hasSkirt`, `SceneParams.treeMax/scale/giftScale/growT`
ลำดับ layer: sky, background, snow.far, santa, gifts.behind, tree, lights, decor, ground, gifts.front, fairylights, snow.near

เสร็จแล้ว (commit แยกตามโมดูล, test 135/135 และ build ผ่าน):
- [x] tree, scene (กระท่อม ต้นสน fairy lights แสงเหนือ หิมะระยิบ), festive-decor รอบ 1 (tinsel ลูกบอลหลายขนาด โบว์ ดาว ผ้ารองโคน), gifts-santa, ui-debug, tests
- [x] ตรวจด้วยตา 1 ภาพ: วันที่ 25 กลางคืน จอกว้าง พร้อม `?santa=now` ภาพออกมาถูกต้อง

เสร็จเพิ่มหลังจากนั้น:
- [x] ของตกแต่งรอบ 2: ไม้เท้าลูกกวาด กระดิ่ง ดาวเล็ก เกล็ดหิมะบนต้น (`trinketCount`), ของวางรอบโคนต้น 7 ชิ้น (`groundItemCount`: โคม ถุงเท้า ไม้เท้าลูกกวาด ขนม เทียน), พลุเล็กวันที่ 25 (`scene/celebration.ts`), มนุษย์หิมะและโคมถนนในฉากหลัง
- [x] ตรวจด้วยตาในเบราว์เซอร์: ก่อน 1 ธ.ค., วันที่ 1, 10, 12, 14, 20, 24, 25 กลางวัน/กลางคืน/พลบค่ำ บนจอกว้าง; วันที่ 1, 10, 18, 25 บนจอแนวตั้ง (400px); หน้า debug (ปุ่มข้ามวัน สลับกลางวัน เรียกซานต้า ตัวเลขสถานะ); เต็มจอด้วย F
- [x] หน้าหลักไม่มี DOM ของ UI: โค้ดไม่สร้าง element เลย (`<div>` ที่เคยเห็นมาจาก extension ของเบราว์เซอร์ที่ใช้ทดสอบ)
- [x] README อัปเดตแล้ว (หน้า debug, การควบคุมที่มองไม่เห็น, ทดสอบผ่าน URL)
- [x] test 135/135 และ build ผ่าน (ออกทั้ง `dist/index.html` และ `dist/debug.html`)

ยังไม่ได้ทำ / ยังไม่ได้ยืนยัน:
- [ ] merge `feat/site` เข้า `main` แล้ว push และต่อ Cloudflare Workers Builds (เจ้าของทำเอง)
- [ ] ยังไม่ได้ดูด้วยตา: การซ่อนเคอร์เซอร์ (เบราว์เซอร์ทดสอบส่ง event เมาส์ตลอด), ดับเบิลคลิกเต็มจอ, F11, ซานต้าโผล่เองตามตัวจับเวลา, animation ต้นโต/กล่องเด้ง/พลุ แบบเคลื่อนไหว, prefers-reduced-motion, เครื่องมือถือจริง
- [ ] ยังไม่มี unit test ของ `trinketCount` และ `groundItemCount`
- [ ] เลือกไฟล์เสียงแล้วใส่ใน `AudioManager` พร้อมจด license ใน `CREDITS.md`