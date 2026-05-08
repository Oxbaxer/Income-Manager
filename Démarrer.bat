@echo off
title Income Manager
cd /d "%~dp0"

REM ── Charger le PATH utilisateur complet (résout le problème Node.js double-clic)
for /f "tokens=2*" %%a in ('reg query "HKCU\Environment" /v PATH 2^>nul') do set "USER_PATH=%%b"
for /f "tokens=2*" %%a in ('reg query "HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment" /v PATH 2^>nul') do set "SYS_PATH=%%b"
set "PATH=%SYS_PATH%;%USER_PATH%;%PATH%"

echo.
echo  ================================================
echo   Income Manager - Demarrage
echo  ================================================
echo.

REM ── 1. Vérifier que Node.js est installé ─────────────────────────────────
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo  [ERREUR] Node.js n'est pas installe sur cet ordinateur.
    echo.
    echo  Veuillez telecharger et installer Node.js depuis :
    echo  https://nodejs.org  ^(choisir la version "LTS"^)
    echo.
    echo  IMPORTANT : Apres l'installation, REDEMARREZ votre ordinateur
    echo  puis relancez ce fichier.
    echo.
    pause
    exit /b 1
)

for /f %%v in ('node --version') do echo  [OK] Node.js %%v detecte.

REM ── 2. Installer les dépendances si nécessaire ───────────────────────────
if not exist "backend\node_modules" (
    echo.
    echo  [INSTALLATION] Premiere utilisation - installation des composants...
    echo  ^(Cela peut prendre 2 a 3 minutes, merci de patienter^)
    echo.
    call npm run install:all
    if %errorlevel% neq 0 (
        echo.
        echo  [ERREUR] L'installation a echoue. Verifiez votre connexion Internet.
        pause
        exit /b 1
    )
    echo.
    echo  [OK] Installation terminee.
)

REM ── 3. Vérifier le fichier .env ──────────────────────────────────────────
if not exist ".env" (
    echo.
    echo  [ATTENTION] Fichier de configuration manquant.
    echo  Copie du modele .env.example vers .env ...
    copy .env.example .env >nul
    echo.
    echo  IMPORTANT : Ouvrez le fichier .env avec le Bloc-notes et
    echo  remplacez les deux valeurs JWT_SECRET et JWT_REFRESH_SECRET
    echo  par des chaines aleatoires de 32+ caracteres.
    echo.
    echo  Une fois fait, relancez ce fichier.
    pause
    exit /b 1
)

REM ── 4. Lancer l'application ──────────────────────────────────────────────
echo.
echo  [DEMARRAGE] Backend + Frontend en cours...
echo  Ouvrez votre navigateur sur : http://localhost:5173
echo.
npm run dev
pause
