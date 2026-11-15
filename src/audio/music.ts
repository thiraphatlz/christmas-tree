// เพลงพื้นหลัง: "We Wish You a Merry Christmas" (เพลงพื้นบ้านอังกฤษ สาธารณสมบัติ) เสียงกล่องดนตรี
// สังเคราะห์ด้วย Web Audio ทั้งหมด ไม่มีไฟล์เสียง

const SEMITONE: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/** ความถี่ (Hz) ของชื่อโน้ต เช่น 'F#4', 'Bb3' */
export function noteHz(name: string): number {
  const m = /^([A-G])(#|b)?(\d)$/.exec(name);
  if (!m) throw new Error(`bad note: ${name}`);
  const midi = 12 * (Number(m[3]) + 1) + SEMITONE[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}

export interface NoteEvent {
  /** ชื่อโน้ต หรือ 'R' = หยุด */
  note: string;
  /** จังหวะที่เริ่ม นับจากต้น loop */
  beat: number;
  /** ความยาวเป็นจังหวะ */
  beats: number;
}

export const SONG = {
  bpm: 150,
  beatsPerBar: 3,
  /** จังหวะยกก่อนห้องแรก */
  pickup: 1,
  melody:
    'D4:1 ' +
    'G4:1 G4:.5 A4:.5 G4:.5 F#4:.5 E4:1 E4:1 E4:1 A4:1 A4:.5 B4:.5 A4:.5 G4:.5 F#4:1 D4:1 D4:1 ' +
    'B4:1 B4:.5 C5:.5 B4:.5 A4:.5 G4:1 E4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:2 D4:1 ' +
    'G4:1 G4:1 G4:1 F#4:2 F#4:1 G4:1 F#4:1 E4:1 D4:2 A4:1 ' +
    'B4:1 A4:1 G4:1 D5:1 D4:1 D4:.5 D4:.5 E4:1 A4:1 F#4:1 G4:2',
  /** โน้ตรากของเบสแต่ละห้อง */
  bass: 'G C A D B E D G G D E D G D D G',
} as const;

/** แปลงสตริงทำนองเป็นรายการโน้ตพร้อมตำแหน่งจังหวะ */
export function parseMelody(melody: string): NoteEvent[] {
  let beat = 0;
  return melody
    .trim()
    .split(/\s+/)
    .map((token) => {
      const [note, len] = token.split(':');
      const ev = { note, beat, beats: Number(len) };
      beat += ev.beats;
      return ev;
    });
}

const MELODY = parseMelody(SONG.melody);
const ROOTS = SONG.bass.split(' ');
/** ความยาว loop เป็นจังหวะ */
export const LOOP_BEATS = MELODY.reduce((sum, ev) => sum + ev.beats, 0);

function pluck(ctx: AudioContext, out: AudioNode, hz: number, at: number, peak: number, decay: number): void {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.value = hz;
  gain.gain.setValueAtTime(0.0001, at);
  gain.gain.exponentialRampToValueAtTime(peak, at + 0.008);
  gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
  osc.connect(gain);
  gain.connect(out);
  osc.start(at);
  osc.stop(at + decay + 0.02);
}

/** จองเสียงของ loop หนึ่งรอบเริ่มที่เวลา t0 (วินาทีของ AudioContext) คืนความยาวรอบเป็นวินาที */
export function scheduleLoop(ctx: AudioContext, out: AudioNode, t0: number): number {
  const beat = 60 / SONG.bpm;
  for (const ev of MELODY) {
    if (ev.note === 'R') continue;
    const at = t0 + ev.beat * beat;
    const hz = noteHz(ev.note);
    const len = ev.beats * beat;
    pluck(ctx, out, hz * 2, at, 0.22, Math.max(0.5, len * 1.6)); // เสียงหลักของกล่องดนตรี
    pluck(ctx, out, hz * 4, at, 0.05, 0.35); // ประกายตอนดีด
  }
  ROOTS.forEach((root, bar) => {
    const at = t0 + ((SONG.pickup + bar * SONG.beatsPerBar) % LOOP_BEATS) * beat;
    pluck(ctx, out, noteHz(`${root}3`), at, 0.12, beat * 2.2);
  });
  return LOOP_BEATS * beat;
}
