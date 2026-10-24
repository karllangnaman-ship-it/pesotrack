@echo off
setlocal enabledelayedexpansion

echo ===================================================
echo   PesoTrack Offline - Android APK Build Tool
echo ===================================================
echo.

:: 1. Check Node.js and npm
echo [1/6] Checking Node.js and npm environment...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not in your system PATH.
    echo Please install Node.js (v18, v20, or v22) from https://nodejs.org/
    pause
    exit /b 1
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] npm is not installed or not in your system PATH.
    echo Please install Node.js which includes npm from https://nodejs.org/
    pause
    exit /b 1
)
call node -v
call npm -v
echo [OK] Node.js and npm detected.
echo.

:: 2. Check Java / JDK
echo [2/6] Checking Java Development Kit (JDK)...
where java >nul 2>nul
if %errorlevel% neq 0 (
    if defined JAVA_HOME (
        set "PATH=%JAVA_HOME%\bin;%PATH%"
    ) else (
        echo [WARNING] 'java' command not directly found in PATH.
        echo Attempting to locate Android Studio bundled JDK...
        if exist "%ProgramFiles%\Android\Android Studio\jbr\bin\java.exe" (
            set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jbr"
            set "PATH=%ProgramFiles%\Android\Android Studio\jbr\bin;%PATH%"
            echo [OK] Using Android Studio JDK: %ProgramFiles%\Android\Android Studio\jbr
        ) else if exist "%ProgramFiles%\Android\Android Studio\jre\bin\java.exe" (
            set "JAVA_HOME=%ProgramFiles%\Android\Android Studio\jre"
            set "PATH=%ProgramFiles%\Android\Android Studio\jre\bin;%PATH%"
            echo [OK] Using Android Studio JRE: %ProgramFiles%\Android\Android Studio\jre
        ) else if exist "%LOCALAPPDATA%\Programs\Android Studio\jbr\bin\java.exe" (
            set "JAVA_HOME=%LOCALAPPDATA%\Programs\Android Studio\jbr"
            set "PATH=%LOCALAPPDATA%\Programs\Android Studio\jbr\bin;%PATH%"
            echo [OK] Using Android Studio JDK: %LOCALAPPDATA%\Programs\Android Studio\jbr
        ) else (
            echo [ERROR] Java Development Kit (JDK 17 or JDK 21) was not found.
            echo Please install Android Studio or JDK from https://adoptium.net/
            echo and ensure JAVA_HOME is configured.
            pause
            exit /b 1
        )
    )
)
call java -version
echo [OK] Java detected.
echo.

:: 3. Check / Install dependencies
echo [3/6] Checking project dependencies...
if not exist "node_modules\" (
    echo Installing npm dependencies...
    call npm.cmd install
    if %errorlevel% neq 0 (
        echo [ERROR] npm install failed. Please check your network connection and npm configuration.
        pause
        exit /b 1
    )
) else (
    echo [OK] node_modules folder exists.
)
echo.

:: 4. Production web build
echo [4/6] Running production Vite build...
call npm.cmd run build
if %errorlevel% neq 0 (
    echo [ERROR] Production Vite build failed!
    echo Please check the error messages above.
    pause
    exit /b 1
)
if not exist "dist\index.html" (
    echo [ERROR] Build output directory 'dist' does not contain index.html!
    pause
    exit /b 1
)
echo [OK] Web build completed successfully in dist/.
echo.

:: 5. Capacitor Sync
echo [5/6] Synchronizing web build with Capacitor Android project...
call npx.cmd cap sync android
if %errorlevel% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b 1
)
echo [OK] Capacitor sync completed.
echo.

:: 6. Build debug APK using Gradle wrapper
echo [6/6] Building debug APK with Gradle wrapper...
if not exist "android\gradlew.bat" (
    echo [ERROR] Gradle wrapper 'android\gradlew.bat' was not found!
    pause
    exit /b 1
)

cd android
call gradlew.bat assembleDebug
set "GRADLE_EXIT=%errorlevel%"
cd ..

if %GRADLE_EXIT% neq 0 (
    echo.
    echo [ERROR] Gradle build failed with exit code %GRADLE_EXIT%!
    echo Common solutions:
    echo 1. Open the project in Android Studio ('npx.cmd cap open android').
    echo    Android Studio will automatically download any missing Android SDK platforms and build tools.
    echo 2. Verify that ANDROID_HOME or ANDROID_SDK_ROOT is set (typically: %LOCALAPPDATA%\Android\Sdk).
    pause
    exit /b %GRADLE_EXIT%
)

set "APK_PATH=android\app\build\outputs\apk\debug\app-debug.apk"

if exist "%APK_PATH%" (
    echo.
    echo ===================================================
    echo   BUILD SUCCESSFUL!
    echo ===================================================
    echo.
    echo Your Android APK is ready:
    echo   %CD%\%APK_PATH%
    echo.
    echo You can transfer this file to your Android phone or install it via adb:
    echo   adb install -r "%APK_PATH%"
    echo.
) else (
    echo.
    echo [WARNING] Gradle finished without error, but the APK was not found at:
    echo   %APK_PATH%
    echo Please check the 'android\app\build\outputs\apk\' directory.
)

pause
exit /b 0
