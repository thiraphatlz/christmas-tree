// ตัวช่วยวาด pixel art: พิกัดถูกปัดเป็นจำนวนเต็มเสมอเพื่อให้ pixel คม

export function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string): void {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

export function pixel(ctx: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  rect(ctx, x, y, 1, 1, color);
}

/**
 * วาดสไปรต์จากแถวตัวอักษร: แต่ละตัวอักษรคือ 1 pixel, legend แมปตัวอักษรเป็นสี
 * ตัวอักษรที่ไม่อยู่ใน legend (เช่น '.' หรือช่องว่าง) = โปร่งใส
 */
export function drawSprite(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  legend: Readonly<Record<string, string>>,
  x: number,
  y: number,
  flipX = false,
): void {
  const x0 = Math.round(x);
  const y0 = Math.round(y);
  for (let r = 0; r < rows.length; r++) {
    const row = rows[r];
    for (let c = 0; c < row.length; c++) {
      const color = legend[row[c]];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x0 + (flipX ? row.length - 1 - c : c), y0 + r, 1, 1);
    }
  }
}

/** ผสมสี '#rrggbb' สองสี: t=0 ได้ a, t=1 ได้ b */
export function mixColor(a: string, b: string, t: number): string {
  const k = Math.max(0, Math.min(1, t));
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (shift: number) => {
    const va = (pa >> shift) & 255;
    const vb = (pb >> shift) & 255;
    return Math.round(va + (vb - va) * k);
  };
  return '#' + ((1 << 24) | (ch(16) << 16) | (ch(8) << 8) | ch(0)).toString(16).slice(1);
}
