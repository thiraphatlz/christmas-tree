// พาเลตต์ "คลาสสิกอบอุ่น" (ออกแบบเอง) ทุกโมดูลใช้สีจากที่นี่

export const PALETTE = {
  // ต้นไม้
  leafDark: '#0f3d2e',
  leafMid: '#1b5e3c',
  leaf: '#2a7d4a',
  leafLight: '#48a35e',
  trunkDark: '#4a2c1a',
  trunk: '#6e4324',
  soil: '#5a3a22',
  seed: '#c9a063',

  // ของตกแต่ง
  red: '#c8322b',
  redDark: '#8f1f1f',
  gold: '#f2c14e',
  goldDark: '#b9862b',
  white: '#fbf7ee',
  star: '#ffe27a',
  starGlow: '#fff4c2',

  // ไฟประดับ
  lights: ['#ff4d4d', '#ffd23f', '#4dc3ff', '#5fe36a', '#ff8ad1'],

  // ของขวัญ
  giftColors: ['#c8322b', '#1f6f8b', '#2a7d4a', '#f2c14e', '#8e4fa8', '#e07a3f'],
  ribbonColors: ['#fbf7ee', '#f2c14e', '#c8322b', '#1b5e3c'],

  // หิมะและพื้น
  snow: '#f4f8ff',
  snowShade: '#cfdcf2',
  snowNight: '#8fa3cc',

  // ท้องฟ้า (บน, ล่าง) ของแต่ละช่วง
  skyNight: ['#0b1030', '#1b2452'],
  skyDawn: ['#3b3f7a', '#f2a67a'],
  skyDay: ['#84c0ec', '#fde2c8'],
  skyDusk: ['#2c2a5e', '#e8784f'],
  moon: '#f6f1d5',
  sun: '#ffe9a8',
  skyStar: '#e8ecff',

  // ฉากหลังและของตกแต่ง
  aurora: ['#35d6a6', '#4c8cf0'],
  cabinWall: '#8a5b3c',
  cabinWallDark: '#5e3b27',
  cabinRoof: '#4a2f22',
  windowGlow: '#ffd879',
  windowDay: '#f4dc9a',
  smoke: '#c9d2e6',
  pine: '#2f6b55',
  pineDark: '#1d4a3f',
  tinsel: ['#fff2b0', '#f2c14e', '#b9862b'],
  candyRed: '#d8362f',

  // ซานต้า
  santaRed: '#c8322b',
  santaSkin: '#f2c9a0',
  sleigh: '#7a2a1c',
  reindeer: '#8a5a34',
  reindeerDark: '#5c3a20',
} as const;
