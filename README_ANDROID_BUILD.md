# PesoTrack Offline – Android Studio APK Build Guide (Windows)

This guide provides step-by-step instructions to import and build the **PesoTrack Offline** Android APK using Android Studio on Windows 10/11.

---

## 1. Prerequisites on Windows

1. **Node.js & npm**
   - Node.js version: **v20 LTS** or **v22 LTS** (recommended)
   - Download from: [https://nodejs.org/](https://nodejs.org/)
   - Verify in PowerShell / Command Prompt:
     ```powershell
     node -v
     npm -v
     ```

2. **Java Development Kit (JDK)**
   - Recommended: **JDK 17** or **JDK 21** (Temurin / Oracle / OpenJDK / Android Studio Embedded JBR)
   - Ensure `JAVA_HOME` environment variable is set to your JDK path (e.g., `C:\Program Files\Android\Android Studio\jbr` or `C:\Program Files\Eclipse Adoptium\jdk-17...`).
   - Verify in PowerShell:
     ```powershell
     java -version
     ```

3. **Android Studio**
   - Download: [https://developer.android.com/studio](https://developer.android.com/studio) (Android Studio Ladybug / Koala / Hedgehog)
   - During install, ensure **Android SDK**, **Android SDK Command-line Tools**, and **Android SDK Build-Tools** are installed.
   - Recommended SDK platform: **API Level 34 / 35**. Minimum supported: **API Level 22 (Android 5.1)**.

---

## 2. Windows Setup & Preparation

1. Extract the downloaded ZIP archive into a clean directory on Windows without spaces in the path (e.g. `C:\Projects\pesotrack`).
2. Open PowerShell or Command Prompt in the extracted folder:
   ```powershell
   cd C:\Projects\pesotrack
   ```
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Build the web production assets:
   ```powershell
   npm run build
   ```
5. Sync assets with the Android native project:
   ```powershell
   npx cap sync android
   ```

---

## 3. Opening in Android Studio

1. Launch **Android Studio**.
2. Select **Open** (or `File > Open...`).
3. Browse to and select the `android` folder inside the project (e.g. `C:\Projects\pesotrack\android`).
4. Wait for Android Studio to initialize Gradle sync and index dependencies.
   - If prompted to update Android Gradle Plugin or accept SDK licenses, choose **Accept / Sync Now**.

---

## 4. Building the Android APK

### Option A: From Android Studio GUI
1. In the top menu, click **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
2. Once the build finishes, a notification appears in the bottom-right corner:
   - Click the blue link: **locate**.
   - Your APK file is located at:
     ```text
     android\app\build\outputs\apk\debug\app-debug.apk
     ```

### Option B: From Command Line (Windows PowerShell)
Run inside the `android` folder:
```powershell
cd android
.\gradlew.bat assembleDebug
```
The resulting APK will be at:
`android\app\build\outputs\apk\debug\app-debug.apk`

---

## 5. Installing on an Android Device or Emulator

1. Connect your Android phone via USB and enable **USB Debugging** (in Developer Options).
2. Either click the green **Run (Shift+F10)** button in Android Studio, or install via ADB:
   ```powershell
   adb install -r android\app\build\outputs\apk\debug\app-debug.apk
   ```

---

## 6. Common Windows Troubleshooting

- **Gradle sync fails with "JAVA_HOME is not set"**:
  - In Android Studio: Go to **File > Settings > Build, Execution, Deployment > Build Tools > Gradle**.
  - Under **Gradle JDK**, select **Embedded JDK (JBR)** or your installed JDK 17/21.
- **"SDK location not found" error**:
  - Create a file named `android/local.properties` with:
    ```properties
    sdk.dir=C:\\Users\\<YourUsername>\\AppData\\Local\\Android\\Sdk
    ```
- **Execution failed for task ':app:processDebugGoogleServices'**:
  - Google Services is conditionally loaded; no `google-services.json` is required for offline use.
- **Port 3000 / WebView White Screen**:
  - All web assets are bundled inside `android/app/src/main/assets/public/` so the app runs 100% offline without needing any dev server.
