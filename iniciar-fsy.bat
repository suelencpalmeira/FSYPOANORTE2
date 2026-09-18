@echo off
title FSY 2027
cd /d "%~dp0"
if not exist "%~dp0fsy-server.exe" (
  echo Compilando o servidor local...
  "%SystemRoot%\Microsoft.NET\Framework64\v4.0.30319\csc.exe" /nologo /out:"%~dp0fsy-server.exe" "%~dp0tools\FsyServer.cs"
  if errorlevel 1 (
    echo Nao foi possivel criar o servidor.
    pause
    exit /b 1
  )
)
echo Nao feche esta janela enquanto usar o FSY, inclusive no login com Gmail.
"%~dp0fsy-server.exe"
pause
