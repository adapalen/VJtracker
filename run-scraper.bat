@echo off
cd /d C:\Users\adapalen\.gemini\antigravity\scratch\vietjet-flight-tracker
echo ========================================== >> scraper_run.log
echo Run Date: %date% %time% >> scraper_run.log
node scraper.js >> scraper_run.log 2>&1
echo Done. >> scraper_run.log
