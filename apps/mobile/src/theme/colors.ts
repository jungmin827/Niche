export const colors = {
  bg: {
    primary: '#FFFFFF',
    secondary: '#F6F6F4',
    tertiary: '#EFEFEA',
  },
  surface: {
    primary: '#FFFFFF',
    inverse: '#111111',
    muted: '#F6F6F4',
  },
  line: {
    primary: '#111111',
    secondary: '#D9D9D4',
  },
  text: {
    primary: '#111111',
    secondary: '#555555',
    tertiary: '#8A8A84',
    inverse: '#FFFFFF',
  },
  overlay: 'rgba(0,0,0,0.4)',
  overlayWhite: 'rgba(255,255,255,0.82)',
  // Dark-background (black screen) token set
  dark: {
    bg: '#000000',
    text: {
      primary: '#FFFFFF',
      secondary: 'rgba(255,255,255,0.65)',
      muted: 'rgba(255,255,255,0.45)',
      placeholder: 'rgba(255,255,255,0.35)',
      hint: 'rgba(255,255,255,0.40)',
    },
    line: {
      strong: 'rgba(255,255,255,0.80)',   // play button active border
      input: 'rgba(255,255,255,0.25)',    // topic input bottom border
      divider: 'rgba(255,255,255,0.10)',  // stepper section divider
      disabled: 'rgba(255,255,255,0.20)', // play button inactive border
    },
  },
} as const;
