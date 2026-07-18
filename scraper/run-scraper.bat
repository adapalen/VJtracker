@echo off
cd /d "%~dp0"
echo ========================================== >> scraper_run.log
echo Run Date: %date% %time% >> scraper_run.log
node scraper.js >> scraper_run.log 2>&1
echo Done. >> scraper_run.log
