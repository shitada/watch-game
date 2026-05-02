export const GameSettings = {
  CLOCK_RADIUS: 2.5,
  CLOCK_DEPTH: 0.3,
  HOUR_HAND_LENGTH: 1.4,
  MINUTE_HAND_LENGTH: 2.0,
  SECOND_HAND_LENGTH: 2.1,
  HAND_WIDTH_HOUR: 0.15,
  HAND_WIDTH_MINUTE: 0.1,
  HAND_WIDTH_SECOND: 0.03,
  COLORS: {
    clockFace: 0xFFF8E7,
    clockRim: 0x8B7355,
    hourHand: 0xE74C3C,
    minuteHand: 0x3498DB,
    secondHand: 0x2C3E50,
    numbers: 0x2C3E50,
    tickMajor: 0x2C3E50,
    tickMinor: 0xBDC3C7,
    center: 0xE74C3C,
    background: 0x87CEEB,
  },

  // Numbers texture sizing for different devices. Base is the logical size and
  // MAX_NUMBERS_TEXTURE_SIZE caps the actual texture size (in pixels) to avoid
  // excessive GPU memory on high-DPR devices (e.g. iPad).
  NUMBERS_TEXTURE_BASE: 256,
  MAX_NUMBERS_TEXTURE_SIZE: 512,

  QUIZ_QUESTIONS_PER_LEVEL: 5,
  DAILY_TOLERANCE_MINUTES: 15,
  HINT_DELAY_MS: 8000,
} as const;
