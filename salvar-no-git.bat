@echo off
setlocal
cd /d "%~dp0"

if not exist ".git" (
  echo Esta pasta ainda nao tem um repositorio Git.
  echo Rode primeiro: git init
  pause
  exit /b 1
)

set /p MSG="Descreva rapidamente o que mudou (ex: novo cliente, ajuste no design): "
if "%MSG%"=="" set MSG=Atualizacao sem descricao

git add -A
git commit -m "%MSG%"

echo.
echo Pronto! Historico salvo. Pra ver os commits anteriores: git log --oneline
pause
