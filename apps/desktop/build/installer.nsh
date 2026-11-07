!macro customUnInstall
  ReadRegStr $0 SHCTX "Software\Classes\eternal\shell\open\command" ""
  StrCmp $0 '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" "%1"' 0 +2
  DeleteRegKey SHCTX "Software\Classes\eternal"
!macroend
