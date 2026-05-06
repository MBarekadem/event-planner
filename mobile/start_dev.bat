@echo off
echo Activation ADB reverse...
C:\Users\ADEM\AppData\Local\Android\Sdk\platform-tools\adb.exe reverse tcp:5000 tcp:5000

echo Lancement Flutter...
flutter run
pause