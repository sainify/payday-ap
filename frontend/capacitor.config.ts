import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sainify.payday",
  appName: "PAYDAY",
  webDir: "dist",
  server: {
    androidScheme: "https"
  }
};

export default config;
