import type { ConfigContext, ExpoConfig } from 'expo/config';

const appJson = require('./app.json') as { expo: ExpoConfig };

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  ...appJson.expo,
});
