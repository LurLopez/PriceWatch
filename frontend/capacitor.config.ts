import type { CapacitorConfig } from '@capacitor/cli';

const isProduction = process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'cl.pucv.pricewatch',
  appName: 'PriceWatch',
  webDir: 'dist/frontend/browser',
  server: {
    // En desarrollo local se permite HTTP para hablar con 10.0.2.2:3001.
    // En producción se debe usar HTTPS (staging).
    androidScheme: isProduction ? 'https' : 'http',
    cleartext: !isProduction,
  },
};

export default config;
