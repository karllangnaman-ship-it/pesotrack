import { ThemeColor, ThemeMode } from '../types/finance';
import { applyThemeColorToDom, getSavedThemeColor } from './themeColors';

export { applyThemeColorToDom, getSavedThemeColor };

/**
 * Resolves whether dark mode should be active based on themeMode preference ('light' | 'dark' | 'system')
 * and system media query, falling back to legacy darkMode boolean if themeMode is unset.
 */
export function resolveIsDarkMode(
  themeMode?: ThemeMode,
  legacyDarkMode?: boolean
): boolean {
  if (themeMode === 'dark') return true;
  if (themeMode === 'light') return false;
  if (themeMode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  }
  return typeof legacyDarkMode === 'boolean' ? legacyDarkMode : false;
}

/**
 * Applies or removes dark theme classes on html and body elements,
 * synchronizes the theme color variables, and updates the meta theme-color tag.
 */
export function applyThemeToDom(isDark: boolean, themeColor?: ThemeColor): void {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const body = document.body;

  if (isDark) {
    root.classList.add('dark', 'dark-theme');
    body.classList.add('dark', 'dark-theme');
    root.style.colorScheme = 'dark';
    if (body) body.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark', 'dark-theme');
    body.classList.remove('dark', 'dark-theme');
    root.style.colorScheme = 'light';
    if (body) body.style.colorScheme = 'light';
  }

  // Apply theme color tokens and CSS variables
  const effectiveThemeColor = themeColor || getSavedThemeColor();
  applyThemeColorToDom(effectiveThemeColor);

  // Update meta theme-color for browser address bars and native webview chrome
  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', isDark ? '#0D1410' : '#F6F4EE');
  }
}
