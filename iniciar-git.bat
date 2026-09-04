@echo off
setlocal
cd /d "%~dp0"

if exist ".git" (
  echo Esta pasta ja tem um repositorio Git — nada a fazer.
  echo Use o salvar-no-git.bat pra salvar mudancas novas.
  pause
  exit /b 0
)

echo Iniciando o Git nesta pasta...
git init
git add -A
git commit -m "Primeiro commit"

echo.
echo Pronto! Repositorio Git criado com o primeiro commit.
echo A partir de agora, use o salvar-no-git.bat pra salvar as proximas mudancas.
pause
