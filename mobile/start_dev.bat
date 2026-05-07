@echo off
adb reverse tcp:5000 tcp:5000
flutter run
pause