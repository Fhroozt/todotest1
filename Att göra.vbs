Option Explicit

Dim shell, fso, folder, command, code
Set shell = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
folder = fso.GetParentFolderName(WScript.ScriptFullName)
command = "powershell.exe -NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File """ & folder & "\start.ps1"""
code = shell.Run(command, 0, True)

If code <> 0 Then
  MsgBox "Kunde inte starta. Se start-log.txt i mappen.", 16, "Att gora"
End If
