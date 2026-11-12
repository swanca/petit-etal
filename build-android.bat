@echo off
rem Compile l'APK (installation directe) et l'AAB (Google Play) de Petit Etal.
rem Meme methode que apps\quatre\build-android.bat : le projet est recopie dans D:\b\etal (chemin court,
rem limite Windows de 260 caracteres), outils portables sur D:\dev-tools.
rem   build-android.bat       : APK universel + APK arm64 + AAB
rem   build-android.bat apk   : APK seulement (plus rapide, pour tester sur telephone)
rem Signature : si le fichier signing\etal-signing.properties existe (STORE_FILE, STORE_PASSWORD, KEY_ALIAS,
rem KEY_PASSWORD), le build est signe avec cette cle ; sinon avec la cle de debug (installable, non publiable).
setlocal
set "SRC=%~dp0."
set "BUILD=D:\b\etal"
set "JAVA_HOME=D:\dev-tools\jdk-17.0.20.1+1"
set "ANDROID_HOME=D:\dev-tools\android-sdk"
set "GRADLE_USER_HOME=D:\dev-tools\gradle-home"
set "APP_SIGNING=D:\_Buisness app cloning\signing\etal-signing.properties"
set "NODE_ENV=production"
set "PATH=C:\Users\Swan\tools\node-v22.20.0-win-x64;%JAVA_HOME%\bin;%PATH%"
rem Sans minification R8 : les builds minifies de Cubi ont crashe au lancement sur telephone (deux fois).
rem Ne pas la reactiver sans pouvoir lire le journal du telephone (adb logcat).
set "GRADLE_EXTRA=-Pandroid.enableMinifyInReleaseBuilds=false -Pandroid.enableShrinkResourcesInReleaseBuilds=false"

rem 1. Projet natif a jour avec la configuration (app.json, plugins).
cd /d "%SRC%"
call npx expo prebuild --platform android --clean --no-install
if errorlevel 1 exit /b 1

rem 2. Copie vers le chemin court, sans les dossiers generes.
robocopy "%SRC%" "%BUILD%" /MIR /NFL /NDL /NJH /NJS /NP /XD node_modules .expo dist .git "%SRC%\android\build" "%SRC%\android\app\build" "%SRC%\android\.gradle" "%SRC%\android\app\.cxx" >nul
if errorlevel 8 exit /b 1
> "%BUILD%\android\local.properties" echo cmake.dir=D\:\\dev-tools\\android-sdk\\cmake\\3.31.6

rem 3. Dependances : reinstallees seulement si package-lock.json a change.
cd /d "%BUILD%"
fc /b package-lock.json node_modules\.installed-lock >nul 2>&1
if errorlevel 1 (
  call npm ci --no-audit --no-fund
  if errorlevel 1 exit /b 1
  copy /y package-lock.json node_modules\.installed-lock >nul
)

rem 4. Compilation : APK d'abord (avec les APK par processeur), puis l'AAB a part.
cd /d "%BUILD%\android"
call "%BUILD%\android\gradlew.bat" assembleRelease %GRADLE_EXTRA% -PabiSplits --no-daemon
if errorlevel 1 exit /b 1
if not exist "%SRC%\apk" mkdir "%SRC%\apk"
copy /y "%BUILD%\android\app\build\outputs\apk\release\app-universal-release.apk" "%SRC%\apk\petit-etal.apk" >nul
copy /y "%BUILD%\android\app\build\outputs\apk\release\app-arm64-v8a-release.apk" "%SRC%\apk\petit-etal-arm64.apk" >nul
if /i "%~1"=="apk" (
  echo OK : apk\petit-etal.apk
  exit /b 0
)
call "%BUILD%\android\gradlew.bat" bundleRelease %GRADLE_EXTRA% --no-daemon
if errorlevel 1 exit /b 1
copy /y "%BUILD%\android\app\build\outputs\bundle\release\app-release.aab" "%SRC%\apk\petit-etal.aab" >nul
echo OK : apk\petit-etal.apk et apk\petit-etal.aab
