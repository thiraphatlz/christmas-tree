import { describe, expect, it } from 'vitest';
import { formatCountdown, infoText } from '../src/ui/info';

describe('formatCountdown', () => {
  it('pads hours, minutes and seconds', () => {
    const ms = ((3 * 24 + 4) * 3600 + 5 * 60 + 6) * 1000;
    expect(formatCountdown(ms)).toBe('อีก 3 วัน 04 ชม. 05 นาที 06 วินาที');
  });
});

describe('infoText', () => {
  it('day 0 waits for 1 December', () => {
    const r = infoText(0, new Date(2026, 10, 30, 12, 0));
    expect(r.title).toContain('1 ธันวาคม');
    expect(r.count).toContain('เริ่มงอกอีก 0 วัน 12 ชม.');
  });
  it('mid-December shows day and countdown to Christmas', () => {
    const r = infoText(10, new Date(2026, 11, 10, 12, 0));
    expect(r.title).toBe('วันที่ 10 จาก 25');
    expect(r.count).toContain('ถึงคริสต์มาส');
  });
  it('day 25 is the celebration', () => {
    const r = infoText(25, new Date(2026, 11, 25, 9, 0));
    expect(r.title).toBe('สุขสันต์วันคริสต์มาส!');
    expect(r.count).toContain('25 จาก 25');
  });
});
