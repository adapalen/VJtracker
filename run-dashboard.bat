@echo off
cd /d "%~dp0"
echo Launching flight analytics dashboard...
start http://localhost:3000
node server.js
