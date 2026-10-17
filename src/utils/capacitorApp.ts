import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';

/**
 * Initializes native Capacitor configuration on Android devices.
 * Sets status bar background color and icon style based on light/dark mode.
 */
export async function initCapacitorApp(darkMode: boolean = true): Promise<void> {
  if (!Capacitor.isNativePlatform()) {
    return;
  }

  try {
    // 1. Disable web content extending under status bar
    await StatusBar.setOverlaysWebView({ overlay: false });

    // 2. Set background color matching active theme
    const bgHex = darkMode ? '#0E0F14' : '#F3F0F5';
    await StatusBar.setBackgroundColor({ color: bgHex });

    // 3. Set status bar icons:
    // Style.Dark: light/white icons (for dark status bar)
    // Style.Light: dark/black icons (for light status bar)
    await StatusBar.setStyle({
      style: darkMode ? Style.Dark : Style.Light,
    });
  } catch (err) {
    console.warn('[Capacitor] StatusBar initialization warning:', err);
  }
}
