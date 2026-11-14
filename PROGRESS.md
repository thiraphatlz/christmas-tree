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
| tree | `src/scene/tree.ts` | inherit | ยังไม่เริ่ม |
| effects | `src/core/daylight.ts`, `src/scene/sky.ts`, `snow.ts`, `lights.ts` | inherit | ยังไม่เริ่ม |
| gifts | `src/scene/gifts.ts` | inherit | ยังไม่เริ่ม |
| easter-egg | `src/core/santaSchedule.ts`, `src/scene/santa.ts` | inherit | ยังไม่เริ่ม |
| ui | `src/ui/*`, `src/audio/*`, `index.html`, `src/style.css` | inherit | ยังไม่เริ่ม |
| tests | `tests/*` | Sonnet 5.5 | ยังไม่เริ่ม |
| deploy | `wrangler.jsonc`, `README.md`, `CREDITS.md` | Sonnet 5.5 | ยังไม่เริ่ม |

## สิ่งที่ต้องทำต่อ

- [ ] แจกงานให้ 7 agents (ทำงานขนาน แต่ละตัวแตะเฉพาะไฟล์ของตัวเอง ไม่ commit เอง)
- [ ] รวมงาน รัน `npm test` และ `npm run build`
- [ ] รีวิวข้ามโมดูล
- [ ] ตรวจหน้าตาที่วันที่ 1, 10, 20, 25 ธ.ค. กลางวัน/กลางคืน, ช่วงซานต้า, โหมดเต็มจอ
