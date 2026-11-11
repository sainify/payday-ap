import fs from "node:fs";
import path from "node:path";

const root = path.resolve("android/app/src/main");
const javaDir = path.join(root, "java/com/sainify/payday");
const resDir = path.join(root, "res");
fs.mkdirSync(javaDir, { recursive: true });
fs.mkdirSync(path.join(resDir, "xml"), { recursive: true });
fs.mkdirSync(path.join(resDir, "layout"), { recursive: true });
fs.mkdirSync(path.join(resDir, "drawable"), { recursive: true });

fs.writeFileSync(path.join(javaDir, "PaydayNativePlugin.java"), `package com.sainify.payday;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.SharedPreferences;
import androidx.biometric.BiometricManager;
import androidx.biometric.BiometricPrompt;
import androidx.core.content.ContextCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import android.widget.RemoteViews;

@CapacitorPlugin(name = "PaydayNative")
public class PaydayNativePlugin extends Plugin {
  @PluginMethod
  public void authenticate(PluginCall call) {
    final int authenticators = BiometricManager.Authenticators.BIOMETRIC_STRONG | BiometricManager.Authenticators.DEVICE_CREDENTIAL;
    BiometricManager manager = BiometricManager.from(getContext());
    if (manager.canAuthenticate(authenticators) != BiometricManager.BIOMETRIC_SUCCESS) {
      call.reject("Fingerprint or device authentication is not available on this device.");
      return;
    }
    BiometricPrompt prompt = new BiometricPrompt(getActivity(), ContextCompat.getMainExecutor(getContext()), new BiometricPrompt.AuthenticationCallback() {
      @Override public void onAuthenticationSucceeded(BiometricPrompt.AuthenticationResult result) { call.resolve(); }
      @Override public void onAuthenticationError(int code, CharSequence message) { call.reject(message.toString()); }
    });
    BiometricPrompt.PromptInfo info = new BiometricPrompt.PromptInfo.Builder()
      .setTitle("Unlock PAYDAY")
      .setSubtitle("Verify your identity to view your finances")
      .setAllowedAuthenticators(authenticators)
      .build();
    prompt.authenticate(info);
  }

  @PluginMethod
  public void updateWidget(PluginCall call) {
    String balance = call.getString("balance");
    String spent = call.getString("spent");
    if (balance == null) balance = "Open PAYDAY";
    if (spent == null) spent = "—";
    SharedPreferences prefs = getContext().getSharedPreferences("payday_widget", Context.MODE_PRIVATE);
    prefs.edit().putString("balance", balance).putString("spent", spent).apply();
    AppWidgetManager manager = AppWidgetManager.getInstance(getContext());
    ComponentName provider = new ComponentName(getContext(), PaydayWidgetProvider.class);
    int[] ids = manager.getAppWidgetIds(provider);
    for (int id : ids) PaydayWidgetProvider.updateAppWidget(getContext(), manager, id);
    call.resolve();
  }
}
`);

fs.writeFileSync(path.join(javaDir, "PaydayWidgetProvider.java"), `package com.sainify.payday;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.widget.RemoteViews;

public class PaydayWidgetProvider extends AppWidgetProvider {
  static void updateAppWidget(Context context, AppWidgetManager manager, int widgetId) {
    SharedPreferences prefs = context.getSharedPreferences("payday_widget", Context.MODE_PRIVATE);
    RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.payday_widget);
    views.setTextViewText(R.id.payday_widget_balance, prefs.getString("balance", "Open PAYDAY"));
    views.setTextViewText(R.id.payday_widget_spent, "Spent this cycle: " + prefs.getString("spent", "—"));
    Intent launch = new Intent(context, MainActivity.class);
    PendingIntent pending = PendingIntent.getActivity(context, 0, launch, PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    views.setOnClickPendingIntent(R.id.payday_widget_root, pending);
    manager.updateAppWidget(widgetId, views);
  }

  @Override public void onUpdate(Context context, AppWidgetManager manager, int[] ids) {
    for (int id : ids) updateAppWidget(context, manager, id);
  }
}
`);

fs.writeFileSync(path.join(resDir, "layout/payday_widget.xml"), `<?xml version="1.0" encoding="utf-8"?>
<LinearLayout xmlns:android="http://schemas.android.com/apk/res/android"
  android:id="@+id/payday_widget_root"
  android:layout_width="match_parent"
  android:layout_height="match_parent"
  android:orientation="vertical"
  android:padding="16dp"
  android:background="@drawable/payday_widget_background">
  <TextView android:layout_width="wrap_content" android:layout_height="wrap_content" android:text="PAYDAY • AVAILABLE BALANCE" android:textStyle="bold" android:textSize="11sp" android:textColor="#6565A8"/>
  <TextView android:id="@+id/payday_widget_balance" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="Open PAYDAY" android:textStyle="bold" android:textSize="24sp" android:textColor="#202033" android:layout_marginTop="8dp"/>
  <TextView android:id="@+id/payday_widget_spent" android:layout_width="match_parent" android:layout_height="wrap_content" android:text="Spent this cycle: —" android:textSize="12sp" android:textColor="#656575" android:layout_marginTop="5dp"/>
</LinearLayout>
`);

fs.writeFileSync(path.join(resDir, "drawable/payday_widget_background.xml"), `<?xml version="1.0" encoding="utf-8"?>
<shape xmlns:android="http://schemas.android.com/apk/res/android"><solid android:color="#F7F6F2"/><corners android:radius="20dp"/><stroke android:width="1dp" android:color="#E4E2EF"/></shape>
`);

fs.writeFileSync(path.join(resDir, "xml/payday_widget_info.xml"), `<?xml version="1.0" encoding="utf-8"?>
<appwidget-provider xmlns:android="http://schemas.android.com/apk/res/android"
  android:minWidth="250dp"
  android:minHeight="110dp"
  android:updatePeriodMillis="0"
  android:initialLayout="@layout/payday_widget"
  android:resizeMode="horizontal|vertical"
  android:widgetCategory="home_screen"/>
`);

const mainActivity = path.join(javaDir, "MainActivity.java");
fs.writeFileSync(mainActivity, `package com.sainify.payday;

import android.os.Bundle;
import android.webkit.CookieManager;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
  @Override
  public void onCreate(Bundle savedInstanceState) {
    registerPlugin(PaydayNativePlugin.class);
    super.onCreate(savedInstanceState);
    CookieManager cookies = CookieManager.getInstance();
    cookies.setAcceptCookie(true);
    cookies.setAcceptThirdPartyCookies(getBridge().getWebView(), true);
  }
}
`);

const gradlePath = path.resolve("android/app/build.gradle");
let gradle = fs.readFileSync(gradlePath, "utf8");
if (!gradle.includes("androidx.biometric:biometric")) {
  gradle = gradle.replace(/dependencies\s*\{/, 'dependencies {\n    implementation "androidx.biometric:biometric:1.1.0"');
  fs.writeFileSync(gradlePath, gradle);
}

const manifestPath = path.resolve("android/app/src/main/AndroidManifest.xml");
let manifest = fs.readFileSync(manifestPath, "utf8");
if (!manifest.includes("PaydayWidgetProvider")) {
  manifest = manifest.replace("</application>", `    <receiver android:name=".PaydayWidgetProvider" android:exported="true">
      <intent-filter><action android:name="android.appwidget.action.APPWIDGET_UPDATE"/></intent-filter>
      <meta-data android:name="android.appwidget.provider" android:resource="@xml/payday_widget_info"/>
    </receiver>
  </application>`);
  fs.writeFileSync(manifestPath, manifest);
}
console.log("PAYDAY biometric and launcher widget native components installed.");
