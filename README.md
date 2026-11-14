# Christmas Tree

เว็บต้นคริสต์มาส pixel art ที่วาดด้วยโค้ดทั้งหมด ต้นไม้โตขึ้นทุกวันตั้งแต่ 1 ธ.ค. และโตเต็มที่วันที่ 25 ธ.ค.

- ไฟประดับกะพริบ หิมะตก
- กลางวัน/กลางคืนเปลี่ยนตามเวลาในเครื่องผู้ดู
- กล่องของขวัญเริ่มมีวันที่ 10 และเพิ่มวันละกล่อง
- Easter egg: ซานต้านั่งเลื่อนบินผ่านท้องฟ้าในคืนคริสต์มาส

Stack: Vite + TypeScript + Canvas 2D เป็น static site ไม่มี backend

## รันในเครื่อง

```powershell
npm install
npm run dev       # เปิด http://localhost:5173
npm test
npm run build     # ผลลัพธ์อยู่ใน dist/
npm run preview
```

## โหมดทดสอบผ่าน URL

| พารามิเตอร์ | ความหมาย |
|---|---|
| `?date=YYYY-MM-DD` | จำลองวันที่ |
| `?time=HH:mm` | จำลองเวลา |
| `?debug=1` | แสดง slider วันที่/เวลา และปุ่มเรียกซานต้า |
| `?santa=now` | ให้ซานต้าบินทันที |

ตัวอย่าง (ต้องรัน `npm run dev` ก่อน):

- http://localhost:5173/?date=2026-12-10&time=21:00
- http://localhost:5173/?date=2026-12-25&time=12:00&debug=1
- http://localhost:5173/?date=2026-12-24&time=20:00 (อยู่ในช่วง Easter egg)

## โหมดเต็มจอ

| ปุ่ม | หน้าที่ |
|---|---|
| `F` | เปิด/ปิดเต็มจอ |
| `H` | ซ่อน/แสดง UI (หน้าจอสะอาด) |
| `M` | เปิด/ปิดเสียง |
| `Esc` | ออกจากเต็มจอ |

ถ้ากด F11 ของเบราว์เซอร์ เว็บจะตรวจเจอและซ่อน UI ให้เหมือนกัน ขยับเมาส์แล้วปุ่มเล็กจาง ๆ จะโผล่ขึ้น และซ่อนอีกครั้งหลังประมาณ 3 วินาที

## Easter egg ซานต้า

ซานต้าและเลื่อนจะโผล่ตั้งแต่ 24 ธ.ค. 18:00 ถึง 26 ธ.ค. 00:00 ตามเวลาท้องถิ่น ครั้งแรกภายใน 30 ถึง 120 วินาทีหลังเปิดหน้าเว็บ จากนั้นทุก 5 ถึง 10 นาที ช่วงเวลาและช่วงสุ่มทั้งหมดเป็นค่าคงที่ใน `src/config.ts` (`SANTA_WINDOW`, `SANTA_FIRST_DELAY_MS`, `SANTA_INTERVAL_MS`)

## เสียง

ตอนนี้ยังไม่มีเสียงเล่นจริง `AudioManager` เป็น stub และเริ่มต้นแบบปิดเสียง วางแผนไว้แค่สองเสียง คือเพลงบรรยากาศวนซ้ำ และเสียง "ho ho ho" ของซานต้า ไฟล์เสียงในอนาคตต้องทำเอง หรือเป็น royalty-free / CC0 ที่มีใบอนุญาตชัดเจน และบันทึกใน `CREDITS.md`

## โครงสร้างโปรเจกต์

```
src/
  main.ts            game loop, integer scaling, ลำดับ layer
  types.ts           type กลาง (SceneParams, TreeShape, AppController ฯลฯ)
  config.ts          ค่าคงที่ปรับได้ (seed, ขนาดฉาก, ช่วงซานต้า)
  palette.ts         สีทั้งหมด
  core/
    date.ts          วัน/progress, นับถอยหลัง, parseSimulatedNow
    growth.ts        รูปทรงต้นไม้และจำนวนของตกแต่งตามวัน
    rng.ts           ตัวสุ่มมี seed
    draw.ts          ตัวช่วยวาด pixel
    daylight.ts      คำนวณกลางวัน/กลางคืน
    santaSchedule.ts ตารางเวลาซานต้า
  scene/             tree, sky, snow, lights, gifts, santa
  ui/                ปุ่ม เต็มจอ โหมด debug
  audio/             AudioManager (stub)
tests/               unit test (Vitest)
```

## Deploy ขึ้น Cloudflare

ใช้ Cloudflare Workers Static Assets ไม่ใช้ Pages เพราะเอกสารของ Cloudflare แนะนำ Workers Static Assets สำหรับเว็บ static ของโปรเจกต์ใหม่ ฟีเจอร์ใหม่โฟกัสที่ Workers และ request ที่ไปยัง static assets ฟรีไม่จำกัด ตั้งค่าอยู่ใน `wrangler.jsonc` (ไม่มี Worker script)

ตอนนี้งานอยู่บน branch `feat/site` ต้อง merge เข้า `main` และ push ก่อน จึงจะ deploy ครั้งแรกได้

ขั้นตอนที่ต้องกดเองใน Cloudflare dashboard:

1. เข้าสู่ระบบ https://dash.cloudflare.com
2. ไปที่ **Workers & Pages**
3. กด **Create application**
4. เลือก **GitHub** และ login GitHub ถ้าถูกถาม
5. อนุญาต Cloudflare GitHub app ให้เข้าถึงเฉพาะ repository นี้ (Only select repositories)
6. เลือก repository นี้
7. ตั้งชื่อโปรเจกต์ (Worker name) เป็น `christmas-tree` ต้องตรงกับ `name` ใน `wrangler.jsonc` ถ้าไม่ตรง build จะล้มเหลว
8. Git branch (production) เลือก `main`
9. Build command: `npm run build`
10. Deploy command: `npx wrangler deploy`
11. กด **Save and Deploy**
12. เมื่อ build เสร็จ URL แบบ `https://christmas-tree.<subdomain>.workers.dev` จะอยู่ในหน้า Worker นั้น (Workers & Pages, เลือก `christmas-tree`)

หลังจากนั้นทุกครั้งที่ push เข้า `main` Cloudflare จะ build และ deploy ใหม่เอง

หมายเหตุ:

- ให้อยู่ในแผนฟรี: ห้ามเพิ่ม Worker script (`main`), `run_worker_first` หรือ bindings (D1, KV, R2, Durable Objects ฯลฯ) ใน `wrangler.jsonc`
- ห้ามใส่ API token หรือ secret ใน repository Workers Builds สร้าง token ของมันเองในบัญชี Cloudflare ให้อัตโนมัติ
- Wrangler ไม่ได้อยู่ใน `devDependencies` โดยตั้งใจ Workers Builds ดึงผ่าน `npx`
