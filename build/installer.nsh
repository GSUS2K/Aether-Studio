!macro customInstall
  DetailPrint "Unblocking bundled native binaries..."
  nsExec::ExecToLog 'powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-ChildItem -Path \\"$INSTDIR\\resources\\app.asar.unpacked\\" -Recurse -File | Unblock-File"'
!macroend
