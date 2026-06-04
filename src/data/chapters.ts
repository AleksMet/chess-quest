export interface ChapterTheme {
  boardLight: string;
  boardDark: string;
  boardBorder: string;
  background: string;
  surface: string;
  surfaceRaised: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  accent: string;
  accentDark: string;
  buttonBg: string;
  buttonText: string;
  selectedSquare: string;
  lastMoveSquare: string;
  legalDot: string;
}

// Chapter 0: Forest of Pawns — green/natural
export const FOREST_THEME: ChapterTheme = {
  boardLight:     '#f0f4d8',
  boardDark:      '#7aad6a',
  boardBorder:    '#3d6b35',
  background:     '#0a1a0b',
  surface:        '#122a14',
  surfaceRaised:  '#1c3a1e',
  textPrimary:    '#e8f5e9',
  textSecondary:  '#a5d6a7',
  textMuted:      '#558b57',
  accent:         '#4caf50',
  accentDark:     '#2e7d32',
  buttonBg:       '#2e7d32',
  buttonText:     '#ffffff',
  selectedSquare: '#50c050',
  lastMoveSquare: '#baca2b',
  legalDot:       'rgba(0,0,0,0.22)',
};

// Chapter 1: Valley of Knights — earthy/stone
export const VALLEY_THEME: ChapterTheme = {
  boardLight:     '#f0dab5',
  boardDark:      '#b58863',
  boardBorder:    '#7a5c3a',
  background:     '#1a100a',
  surface:        '#291810',
  surfaceRaised:  '#3a2518',
  textPrimary:    '#f5e8d0',
  textSecondary:  '#d4a85a',
  textMuted:      '#a07840',
  accent:         '#d4a855',
  accentDark:     '#a07840',
  buttonBg:       '#8b6320',
  buttonText:     '#ffffff',
  selectedSquare: '#dcc650',
  lastMoveSquare: '#cac040',
  legalDot:       'rgba(0,0,0,0.22)',
};

export const CHAPTER_THEMES: ChapterTheme[] = [
  FOREST_THEME,
  VALLEY_THEME,
  FOREST_THEME, // placeholder for Chapter 2
  FOREST_THEME, // placeholder for Chapter 3
  FOREST_THEME, // placeholder for Chapter 4
  FOREST_THEME, // placeholder for Chapter 5
];
