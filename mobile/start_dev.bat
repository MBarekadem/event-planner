@echo off
adb reverse tcp:5000 tcp:5000
adb reverse tcp:5678 tcp:5678
flutter run
pause