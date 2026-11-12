@echo off
rem Publie Petit Etal sur GitHub Pages en une commande.
rem   publier.bat https://github.com/TON-COMPTE/petit-etal.git
rem 1. construit le site (dist\) avec le bon chemin de base (le nom du depot) ;
rem 2. envoie le code source sur la branche main ;
rem 3. envoie le site sur la branche gh-pages (celle que GitHub Pages sert).
rem A la premiere utilisation, Git ouvre une fenetre de connexion GitHub : c'est toi qui te connectes.
setlocal
if "%~1"=="" (
  echo Usage : publier.bat https://github.com/TON-COMPTE/NOM-DU-DEPOT.git
  exit /b 1
)
set "URL=%~1"
set "PATH=C:\Users\Swan\tools\node-v22.20.0-win-x64;%PATH%"
cd /d "%~dp0"

rem Nom du depot = dernier morceau de l'adresse, sans .git
for %%A in ("%URL%") do set "REPO=%%~nA"
echo Depot : %REPO%

call node scripts\build-web.js %REPO%
if errorlevel 1 exit /b 1

if not exist .git (
  git init -b main
  if errorlevel 1 exit /b 1
)
git remote remove origin >nul 2>&1
git remote add origin "%URL%"
git add -A
git commit -m "Petit Etal : mise a jour" >nul 2>&1
git push -u origin main
if errorlevel 1 (
  echo Echec de l'envoi du code. Verifie l'adresse du depot et ta connexion GitHub.
  exit /b 1
)

call npx gh-pages --nojekyll -d dist -m "Site : mise a jour"
if errorlevel 1 exit /b 1
echo.
echo OK. Dans GitHub : Settings ^> Pages ^> Source "Deploy from a branch", branche gh-pages, dossier / (root).
echo Le jeu sera en ligne une a deux minutes plus tard a l'adresse https://TON-COMPTE.github.io/%REPO%/
