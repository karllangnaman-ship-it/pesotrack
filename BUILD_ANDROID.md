# PesoTrack Offline — Android Studio & Windows Build Guide

This document provides instructions for exporting, extracting, and building the **PesoTrack Offline** Android APK on a Windows laptop using Android Studio or the automated `build-apk.bat` script.

---

## 1. Prerequisites on Windows

Before building the APK, verify that your Windows machine has:

1. **Node.js** (v18, v20, or v22 LTS recommended)
   - Download from: [https://nodejs.org/](https://nodejs.org/)
   - Verify in PowerShell:
     ```powershell
     node -v
     npm -v
     ```

2. **Android Studio** (Ladybug / Hedgehog / Jellyfish or newer)
   - Download from: [https://developer.android.com/studio](https://developer.android.com/studio)
   - When installing Android Studio, ensure the following components are selected in the SDK Manager:
     - **Android SDK Platform 34 or 35/36**
     - **Android SDK Build-Tools**
     - **Android SDK Command-line Tools**
   - Android Studio comes bundled with a compatible Java Development Kit (JDK 17 or JDK 21 in `jbr`).

3. **Environment Variables (Recommended)**
   - Set `JAVA_HOME` to your JDK path (for example: `C:\Program Files\Android\Android Studio\jbr`).
   - Set `ANDROID_HOME` to your Android SDK path (typically: `%LOCALAPPDATA%\Android\Sdk`).

---

## 2. Option A: 1-Click Automated Build (`build-apk.bat`)

Double-click `build-apk.bat` in the root folder, or run it from Command Prompt / PowerShell:

```cmd
.\build-apk.bat
```

What `build-apk.bat` does automatically:
1. Checks for Node.js, npm, and Java/Android build environment.
2. Runs `npm.cmd install` if dependencies are not yet installed.
3. Runs the production web build (`npm.cmd run build`), creating optimized files in `dist/`.
4. Synchronizes web assets and plugins to the Android project (`npx.cmd cap sync android`).
5. Executes the included Gradle wrapper (`gradlew.bat assembleDebug`).
6. Verifies and displays the exact output location of the generated APK:
   ```
   android\app\build\outputs\apk\debug\app-debug.apk
   ```

---

## 3. Option B: Manual Commands in Windows PowerShell

Open Windows PowerShell in the project root directory and execute:

```powershell
# 1. Install dependencies
npm.cmd install

# 2. Compile production web bundle
npm.cmd run build

# 3. Synchronize Capacitor Android project
npx.cmd cap sync android

# 4. Open in Android Studio
npx.cmd cap open android
```

Once Android Studio opens:
1. Allow Gradle to finish syncing (takes 1–2 minutes on first run while downloading plugins).
2. Go to **Build** menu > **Build Bundle(s) / APK(s)** > **Build APK(s)**.
3. Once completed, a pop-up appears in the bottom right corner with a **locate** link pointing to:
   ```
   android\app\build\outputs\apk\debug\app-debug.apk
   ```

Alternatively, to build the debug APK directly from PowerShell without opening the IDE:
```powershell
cd android
.\gradlew.bat assembleDebug
cd ..
```

---

## 4. Transferring & Installing the APK on Android Phone

### Via USB / Direct Transfer:
1. Copy `android\app\build\outputs\apk\debug\app-debug.apk` to your phone via USB cable, Google Drive, or local storage.
2. On your Android phone, tap the `.apk` file in your **Files** / **Downloads** app.
3. If prompted, toggle "Allow install from unknown sources" for your file manager.
4. Tap **Install** and launch **PesoTrack Offline**.

### Via ADB (Developer Mode):
```powershell
adb install -r android\app\build\outputs\apk\debug\app-debug.apk
```

---

## 5. Key Architecture & Features

- **Offline-First Storage**: Zero cloud dependency or remote databases. All accounts, transactions, budgets, recurring activities, categories, and settings are saved in device `localStorage` with native file import/export support.
- **Credit & Loan Accounting**:
  - Independent credit and approved loan limits per account (limits are never shared across accounts).
  - Multi-transaction support: Record multiple purchases/drawdowns under a single account with distinct start dates, interest rates, installment terms, payment schedules, and repayment histories.
  - Dedicated **Pay Credit Bill** modal with full/partial payments, source account deduction, and automated allocation across active purchases.
  - Dedicated **Record Payment** modal for individual purchases, borrowings, and overall loan repayments with principal/interest tracking and completion detection.
- **Android Status Bar & Safe Area Integration**:
  - Native dark theme (`#0E0F14`) applied to status bar and navigation bar.
  - `MainActivity.java` dynamically calculates and consumes `WindowInsetsCompat.Type.systemBars()` on root view so app content never overlaps camera cutouts, system clocks, or gesture bars on any Android version (including Android 15 edge-to-edge).
- **Offline Backup & Restore**:
  - Full JSON export and transaction ledger CSV export with Android system share sheet (`Share.share`) and browser file download fallback.
  - Safe import validation: inspects backup structure and prompts for merge or replace confirmation before touching active data.
