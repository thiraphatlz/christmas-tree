/** ตัวสุ่มแบบมี seed (mulberry32) คืนฟังก์ชันที่ให้ค่า [0, 1) */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * ค่าสุ่ม [0, 1) แบบไม่มี state จาก (seed, index, channel)
 * ใช้เมื่อของชิ้นที่ i ต้องได้ค่าเดิมเสมอ ไม่ขึ้นกับจำนวนชิ้นทั้งหมด
 */
export function hashRand(seed: number, index: number, channel = 0): number {
  return mulberry32((seed ^ Math.imul(index + 1, 0x9e3779b1) ^ Math.imul(channel + 1, 0x85ebca6b)) >>> 0)();
}

/** จำนวนเต็มในช่วง [min, max] จากค่า r ใน [0, 1) */
export function randInt(r: number, min: number, max: number): number {
  return min + Math.floor(r * (max - min + 1));
}
