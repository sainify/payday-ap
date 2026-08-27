import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.sainify.payday",
  appName: "PAYDAY",
  webDir: "dist",

  server: {
    url: "https://payday-ap.pages.dev",
    androidScheme: "https",
    cleartext: false
  }
};

export default config;
