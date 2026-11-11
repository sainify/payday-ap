import { Capacitor, registerPlugin } from "@capacitor/core";

interface PaydayNativePlugin {
  authenticate(): Promise<void>;
  updateWidget(options: { balance: string; spent: string }): Promise<void>;
}
export const PaydayNative = registerPlugin<PaydayNativePlugin>("PaydayNative");
export const isNativePayday = () => Capacitor.isNativePlatform();
export const BIOMETRIC_KEY = "payday:biometric-unlock";
