export type ThemeColor =
  | 'forest'
  | 'ocean'
  | 'purple'
  | 'teal'
  | 'sunset'
  | 'rose'
  | 'crimson'
  | 'amber'
  | 'monochrome';

export interface ThemeColorDefinition {
  id: ThemeColor;
  name: string;
  tagline: string;
  description: string;
  primary: string; // Base primary color in light mode
  primaryHover: string; // Hover state for buttons
  primaryActive: string; // Active/pressed state
  accent: string; // Vibrant accent for dark mode text/icons
  accentBorder: string; // Border accent in dark mode
  lightBg: string; // Soft container/badge tint in light mode
  darkBg: string; // Subtle container/badge tint in dark mode
  ring: string; // Focus ring color with opacity
  swatchColors: [string, string, string]; // Preview colors
}

export const DEFAULT_THEME_COLOR: ThemeColor = 'forest';

export const THEME_COLOR_LIST: ThemeColorDefinition[] = [
  {
    id: 'forest',
    name: 'Forest Green',
    tagline: 'Classic PesoTrack',
    description: 'Current PesoTrack default theme inspired by pine and wealth.',
    primary: '#174F32',
    primaryHover: '#123E27',
    primaryActive: '#0E2E1D',
    accent: '#83C95B',
    accentBorder: 'rgba(131, 201, 91, 0.4)',
    lightBg: '#E8F3EC',
    darkBg: '#1E382A',
    ring: 'rgba(23, 79, 50, 0.35)',
    swatchColors: ['#174F32', '#4E9D39', '#83C95B'],
  },
  {
    id: 'ocean',
    name: 'Ocean Blue',
    tagline: 'Deep Maritime',
    description: 'Calm and focused blue primary colors with complementary cool accents.',
    primary: '#1D5BB5',
    primaryHover: '#17478E',
    primaryActive: '#12376F',
    accent: '#60A5FA',
    accentBorder: 'rgba(96, 165, 250, 0.4)',
    lightBg: '#EBF3FC',
    darkBg: '#192D47',
    ring: 'rgba(29, 91, 181, 0.35)',
    swatchColors: ['#1D5BB5', '#3B82F6', '#93C5FD'],
  },
  {
    id: 'purple',
    name: 'Purple',
    tagline: 'Royal Elegance',
    description: 'Sophisticated royal purple with refined lavender accents.',
    primary: '#7C3AED',
    primaryHover: '#6D28D9',
    primaryActive: '#5B21B6',
    accent: '#C084FC',
    accentBorder: 'rgba(192, 132, 252, 0.4)',
    lightBg: '#F3E8FF',
    darkBg: '#2E1D45',
    ring: 'rgba(124, 58, 237, 0.35)',
    swatchColors: ['#7C3AED', '#A855F7', '#D8B4FE'],
  },
  {
    id: 'teal',
    name: 'Teal',
    tagline: 'Oceanic Freshness',
    description: 'Crisp teal primary tones balanced with vibrant seafoam highlights.',
    primary: '#0D7B73',
    primaryHover: '#0F6862',
    primaryActive: '#0E524D',
    accent: '#2DD4BF',
    accentBorder: 'rgba(45, 212, 191, 0.4)',
    lightBg: '#E6F7F5',
    darkBg: '#16312E',
    ring: 'rgba(13, 123, 115, 0.35)',
    swatchColors: ['#0D7B73', '#14B8A6', '#5EEAD4'],
  },
  {
    id: 'sunset',
    name: 'Sunset Orange',
    tagline: 'Warm Energy',
    description: 'Warm and vibrant sunset orange accents that bring dynamism to tracking.',
    primary: '#C2410C',
    primaryHover: '#9A3412',
    primaryActive: '#7C2D12',
    accent: '#FB923C',
    accentBorder: 'rgba(251, 146, 60, 0.4)',
    lightBg: '#FFF1EB',
    darkBg: '#3A2017',
    ring: 'rgba(194, 65, 12, 0.35)',
    swatchColors: ['#C2410C', '#EA580C', '#FDBA74'],
  },
  {
    id: 'rose',
    name: 'Rose Pink',
    tagline: 'Modern Chic',
    description: 'Gentle yet punchy rose pink primaries with stylish petal highlights.',
    primary: '#BE185D',
    primaryHover: '#9D174D',
    primaryActive: '#831843',
    accent: '#F472B6',
    accentBorder: 'rgba(244, 114, 182, 0.4)',
    lightBg: '#FDF2F8',
    darkBg: '#3B1A2A',
    ring: 'rgba(190, 24, 93, 0.35)',
    swatchColors: ['#BE185D', '#DB2777', '#F472B6'],
  },
  {
    id: 'crimson',
    name: 'Crimson Red',
    tagline: 'Bold Precision',
    description: 'Deep crimson red accents conveying decisiveness and focus.',
    primary: '#991B1B',
    primaryHover: '#7F1D1D',
    primaryActive: '#651515',
    accent: '#F87171',
    accentBorder: 'rgba(248, 113, 113, 0.4)',
    lightBg: '#FEF2F2',
    darkBg: '#381818',
    ring: 'rgba(153, 27, 27, 0.35)',
    swatchColors: ['#991B1B', '#DC2626', '#FCA5A5'],
  },
  {
    id: 'amber',
    name: 'Amber Gold',
    tagline: 'Warm Prosperity',
    description: 'Golden yellow and bronze amber accents inspired by bullion and coin.',
    primary: '#B45309',
    primaryHover: '#92400E',
    primaryActive: '#78350F',
    accent: '#FBBF24',
    accentBorder: 'rgba(251, 191, 36, 0.4)',
    lightBg: '#FFFBEB',
    darkBg: '#392813',
    ring: 'rgba(180, 83, 9, 0.35)',
    swatchColors: ['#B45309', '#D97706', '#FCD34D'],
  },
  {
    id: 'monochrome',
    name: 'Monochrome',
    tagline: 'Minimal Neutral',
    description: 'Timeless slate, charcoal, and crisp high-contrast black & white tones.',
    primary: '#262626',
    primaryHover: '#171717',
    primaryActive: '#0A0A0A',
    accent: '#E5E5E5',
    accentBorder: 'rgba(229, 229, 229, 0.4)',
    lightBg: '#F5F5F5',
    darkBg: '#2A2A2A',
    ring: 'rgba(38, 38, 38, 0.35)',
    swatchColors: ['#171717', '#525252', '#A3A3A3'],
  },
];

export const THEME_COLOR_MAP: Record<ThemeColor, ThemeColorDefinition> = THEME_COLOR_LIST.reduce(
  (acc, theme) => {
    acc[theme.id] = theme;
    return acc;
  },
  {} as Record<ThemeColor, ThemeColorDefinition>
);

export function getThemeColorDefinition(themeColor?: string | null): ThemeColorDefinition {
  if (themeColor && themeColor in THEME_COLOR_MAP) {
    return THEME_COLOR_MAP[themeColor as ThemeColor];
  }
  return THEME_COLOR_MAP[DEFAULT_THEME_COLOR];
}

export function getSavedThemeColor(): ThemeColor {
  try {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('pesotrack_theme_color');
      if (saved && saved in THEME_COLOR_MAP) {
        return saved as ThemeColor;
      }
    }
  } catch {}
  return DEFAULT_THEME_COLOR;
}

export function applyThemeColorToDom(themeColor?: string | null): void {
  if (typeof document === 'undefined') return;

  const validTheme = getThemeColorDefinition(themeColor);
  const root = document.documentElement;

  // Set the data attribute for CSS selectors
  root.setAttribute('data-theme-color', validTheme.id);

  // Set CSS custom variables directly on documentElement
  root.style.setProperty('--theme-primary', validTheme.primary);
  root.style.setProperty('--theme-primary-hover', validTheme.primaryHover);
  root.style.setProperty('--theme-primary-active', validTheme.primaryActive);
  root.style.setProperty('--theme-accent', validTheme.accent);
  root.style.setProperty('--theme-accent-border', validTheme.accentBorder);
  root.style.setProperty('--theme-light-bg', validTheme.lightBg);
  root.style.setProperty('--theme-dark-bg', validTheme.darkBg);
  root.style.setProperty('--theme-ring', validTheme.ring);

  // Also update --color-forest to point to the active theme primary
  root.style.setProperty('--color-forest', validTheme.primary);

  try {
    localStorage.setItem('pesotrack_theme_color', validTheme.id);
  } catch {}
}
