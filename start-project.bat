@echo off
setlocal EnableExtensions DisableDelayedExpansion
title Chat AI - Launcher
cd /d "%~dp0"

if /i "%~1"=="--check" goto prerequisites
if not "%~1"=="" (
  echo Usage: start-project.bat [--check]
  exit /b 1
)

:prerequisites
where node.exe >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Install Node.js 22.12+ in the 22.x series, or Node.js 24+.
  goto failure
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found. Reinstall Node.js with npm and reopen this launcher.
  goto failure
)
node -e "const [major,minor]=process.versions.node.split('.').map(Number); process.exit((major===22 && minor>=12) || major>=24 ? 0 : 1)"
if errorlevel 1 (
  echo [ERROR] Unsupported Node.js version. Use Node.js 22.12+ in the 22.x series, or Node.js 24+.
  goto failure
)
if not exist "backend\package-lock.json" goto missing_project
if not exist "frontend\package-lock.json" goto missing_project
if not exist "backend\vendor\sprintf-js\sprintf.cjs" goto missing_project
if not exist "scripts\start-project.mjs" goto missing_project
if /i "%~1"=="--check" goto check_configuration

if not exist "backend\node_modules\dotenv\package.json" goto install_backend
if not exist "backend\node_modules\sequelize\package.json" goto install_backend
goto backend_ready
:install_backend
echo [SETUP] Installing backend dependencies...
pushd "backend"
call npm.cmd ci
if errorlevel 1 (
  popd
  goto failure
)
popd
:backend_ready
if exist "frontend\node_modules\.bin\vite.cmd" goto frontend_ready
echo [SETUP] Installing frontend dependencies...
pushd "frontend"
call npm.cmd ci
if errorlevel 1 (
  popd
  goto failure
)
popd
:frontend_ready
if not exist "frontend\.env" (
  copy /y "frontend\.env.example" "frontend\.env" >nul
  if errorlevel 1 goto failure
)
if not exist "backend\.env" (
  copy /y "backend\.env.example" "backend\.env" >nul
  echo [SETUP] Created backend\.env. Fill in SQL Server, JWT and AI provider settings, then run again.
  goto failure
)

:check_configuration
if not exist "backend\node_modules\dotenv\package.json" goto missing_dependencies
if not exist "backend\node_modules\sequelize\package.json" goto missing_dependencies
if not exist "frontend\node_modules\.bin\vite.cmd" goto missing_dependencies
if not exist "backend\.env" (
  echo [ERROR] backend\.env is missing. Copy backend\.env.example and fill in your settings.
  goto failure
)
set "CHAT_AI_BACKEND_PORT="
for /f "delims=" %%P in ('node -e "require('./backend/node_modules/dotenv').config({path:'./backend/.env'}); const p=Number(process.env.PORT || 5000); const missing=['DB_HOST','DB_NAME','DB_USER','DB_PASSWORD','JWT_SECRET'].filter(k=>!process.env[k]); if(missing.length) {console.error('[ERROR] Missing backend settings: '+missing.join(', ')); process.exit(1)} if(!Number.isInteger(p) || p<1 || p>65535 || p===5173) {console.error('[ERROR] Invalid backend PORT, or it conflicts with frontend port 5173.'); process.exit(1)} console.log(p)"') do set "CHAT_AI_BACKEND_PORT=%%P"
if not defined CHAT_AI_BACKEND_PORT goto failure
echo [OK] Node.js, dependencies and backend configuration are ready.
if /i "%~1"=="--check" exit /b 0

rem Refuse occupied ports so a second click does not start duplicate servers.
node -e "const net=require('node:net'); async function check(port) {await new Promise((resolve,reject)=>{const server=net.createServer(); server.once('error',reject); server.listen(port,()=>server.close(resolve))})} (async()=>{for(const port of [Number(process.env.CHAT_AI_BACKEND_PORT),5173]) {try {await check(port)} catch {console.error('[ERROR] Port '+port+' is already in use. Close existing project terminals or the application using that port.'); process.exitCode=1; return}}})().catch(()=>{process.exitCode=1})"
if errorlevel 1 goto failure

node "scripts\start-project.mjs"
if errorlevel 1 goto failure
exit /b 0

:missing_project
echo [ERROR] Keep this launcher in the project root, alongside backend and frontend.
goto failure

:missing_dependencies
echo [ERROR] Dependencies are missing. Run start-project.bat without --check to install them.
goto failure

:failure
echo.
echo Project startup did not complete. See the error above.
if /i "%~1"=="--check" exit /b 1
pause
exit /b 1
