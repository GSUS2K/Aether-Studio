!macro customInstall
  DetailPrint "Unblocking bundled native binaries..."
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path \\"$INSTDIR\\resources\\app.asar.unpacked\\" -Recurse -File | Unblock-File"'
!macroend

!macro customUnInstall
  MessageBox MB_YESNO|MB_ICONQUESTION "Remove Aether settings, Signal Ledger history, cache, and downloaded app data from this Windows user account?" IDNO keepAetherUserData
  DetailPrint "Removing Aether user data..."
  RMDir /r "$APPDATA\Aether"
  RMDir /r "$LOCALAPPDATA\Aether"
  keepAetherUserData:
!macroend
