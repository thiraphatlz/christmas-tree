# Christmas Tree

เว็บต้นคริสต์มาส pixel art ที่วาดด้วยโค้ดทั้งหมด ต้นไม้โตขึ้นทุกวันตั้งแต่ 1 ธ.ค. และโตเต็มที่วันที่ 25 ธ.ค.

- หน้าหลักมีแค่ฉากเต็มจอ ไม่มีปุ่มหรือข้อความ ตัวควบคุมทั้งหมดอยู่ที่หน้า debug
- ต้นไม้สูง 25% ของจอในวันที่ 1 และ 80% ในวันที่ 25 (รวมดาวประมาณ 85%) จอแนวตั้งจำกัดด้วยความกว้าง ค่าอยู่ใน `src/config.ts`
- ของตกแต่งทยอยมาตามวัน: ไฟประดับ ลูกบอล tinsel โบว์ ไม้เท้าลูกกวาด กระดิ่ง ผ้ารองโคนต้น กล่องของขวัญ (เริ่มวันที่ 10) และดาวยอดต้นในวันที่ 25 ตำแหน่งมาจาก seed คงที่ ชิ้นเดิมไม่ย้ายที่
- ฉากหลัง: กระท่อมหน้าต่างสว่าง ต้นสนเล็ก fairy lights หิมะตก กลางคืนมีดาว พระจันทร์ และแสงเหนือ
- กลางวัน/กลางคืนเปลี่ยนตามเวลาในเครื่องผู้ดู
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
| `?santa=now` | ให้ซานต้าบินทันที |

ใช้ได้ทั้งหน้าหลักและหน้า debug ตัวอย่าง (ต้องรัน `npm run dev` ก่อน):

- http://localhost:5173/?date=2026-12-10&time=21:00
- http://localhost:5173/?date=2026-12-25&time=12:00
- http://localhost:5173/?date=2026-12-24&time=20:00 (อยู่ในช่วง Easter egg)
- http://localhost:5173/?date=2026-11-20 (ก่อน 1 ธ.ค. เป็นฉากเมล็ด)

## หน้า debug

- ในเครื่อง: http://localhost:5173/debug.html
- หลัง deploy: `https://<โดเมน>/debug` (Cloudflare เสิร์ฟ `debug.html` ที่ `/debug` ให้เอง)

หน้านี้ใช้ตัวเรนเดอร์เดียวกับหน้าหลัก (`createApp` ใน `src/app.ts`) และมี:

- สไลเดอร์วันที่ (25 พ.ย. ถึง 31 ธ.ค.) และเวลา พร้อมปุ่มข้ามไปวันสำคัญ
- สลับกลางวัน/กลางคืนเอง (อัตโนมัติ / กลางวัน / กลางคืน)
- ปุ่มเรียกซานต้า ปุ่มเต็มจอเฉพาะฉาก ปุ่มเปิด/ปิดเสียง
- สถานะ: วันเวลาจำลอง, วันที่ X จาก 25, progress, ช่วงเวลาของวัน, อยู่ในช่วงซานต้าหรือไม่, จำนวนของตกแต่งและของขวัญ

ถ้าเปิดหน้า debug นอกช่วง 25 พ.ย. ถึง 31 ธ.ค. วันที่จำลองจะถูกปัดเข้าช่วงของสไลเดอร์ทันที

## หน้าหลัก: การควบคุมที่มองไม่เห็น

| การกระทำ | ผล |
|---|---|
| ปุ่ม `F` หรือดับเบิลคลิก/แตะสองครั้ง | เปิด/ปิดเต็มจอ |
| F11 ของเบราว์เซอร์ | เต็มจอได้เหมือนกัน |
| `Esc` | ออกจากเต็มจอ |
| ปุ่ม `M` | เปิด/ปิดเสียง (ยังไม่มีเสียงจริง) |
| เมาส์นิ่งประมาณ 3 วินาที | เคอร์เซอร์ถูกซ่อน ขยับแล้วกลับมา |
| คลิกหรือแตะครั้งแรก | ปลดล็อกระบบเสียงตามข้อจำกัด autoplay ของเบราว์เซอร์ |

## Easter egg ซานต้า

ซานต้าและเลื่อนจะโผล่ตั้งแต่ 24 ธ.ค. 18:00 ถึง 26 ธ.ค. 00:00 ตามเวลาท้องถิ่น ครั้งแรกภายใน 30 ถึง 120 วินาทีหลังเปิดหน้าเว็บ จากนั้นทุก 5 ถึง 10 นาที ช่วงเวลาและช่วงสุ่มทั้งหมดเป็นค่าคงที่ใน `src/config.ts` (`SANTA_WINDOW`, `SANTA_FIRST_DELAY_MS`, `SANTA_INTERVAL_MS`)

## เสียง

ตอนนี้ยังไม่มีเสียงเล่นจริง `AudioManager` เป็น stub และเริ่มต้นแบบปิดเสียง วางแผนไว้แค่สองเสียง คือเพลงบรรยากาศวนซ้ำ และเสียง "ho ho ho" ของซานต้า ไฟล์เสียงในอนาคตต้องทำเอง หรือเป็น royalty-free / CC0 ที่มีใบอนุญาตชัดเจน และบันทึกใน `CREDITS.md`

## โครงสร้างโปรเจกต์

```
src/
  app.ts             ตัวเรนเดอร์ร่วม: game loop, integer scaling, ลำดับ layer
  main.ts            หน้าหลัก (index.html): ฉากอย่างเดียว
  debug.ts           หน้า debug (debug.html): ตัวควบคุมทั้งหมด
  types.ts           type กลาง (SceneParams, TreeShape, AppController ฯลฯ)
  config.ts          ค่าคงที่ปรับได้ (seed, ขนาดฉาก, ช่วงซานต้า)
  palette.ts         สีทั้งหมด
  core/
    date.ts          วัน/progress, นับถอยหลัง, parseSimulatedNow
    growth.ts        รูปทรงต้นไม้และจำนวนของตกแต่งตามวัน
    growthAnim.ts    เอฟเฟกต์ตอนต้นโตขึ้นขั้นใหม่
    rng.ts           ตัวสุ่มมี seed
    draw.ts          ตัวช่วยวาด pixel
    daylight.ts      คำนวณกลางวัน/กลางคืน
    santaSchedule.ts ตารางเวลาซานต้า
  scene/             sky, background, snow, celebration, santa, gifts, tree, lights, decor, ground, fairylights
  ui/                immersive.ts (เต็มจอ ซ่อนเคอร์เซอร์ ปลดล็อกเสียง), info.ts (ข้อความสถานะของหน้า debug)
  audio/             AudioManager (stub)
tests/               unit test (Vitest)
```

## Deploy ขึ้น Cloudflare

ใช้ Cloudflare Workers Static Assets ไม่ใช้ Pages เพราะเอกสารของ Cloudflare แนะนำ Workers Static Assets สำหรับเว็บ static ของโปรเจกต์ใหม่ ฟีเจอร์ใหม่โฟกัสที่ Workers และ request ที่ไปยัง static assets ฟรีไม่จำกัด ตั้งค่าอยู่ใน `wrangler.jsonc` (ไม่มี Worker script)

เว็บมี 2 หน้า (`index.html` และ `debug.html`) Vite build ออกมาทั้งคู่ใน `dist/` และ Cloudflare เสิร์ฟได้โดยไม่ต้องตั้งค่าเพิ่ม: ค่า default ของ `html_handling` คือ `auto-trailing-slash` ซึ่งเสิร์ฟ `debug.html` ที่ `/debug`

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
