import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.pesotrack.offline',
  appName: 'PesoTrack Offline',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
  },
  plugins: {
    StatusBar: {
      overlaysWebView: false,
      style: 'DARK',
      backgroundColor: '#0E0F14',
    },
    LocalNotifications: {
      smallIcon: 'ic_launcher_round',
      iconColor: '#0E0F14',
    },
  },
};

export default config;
