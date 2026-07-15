# PowerShell script to register the VietJet flight tracker task in Windows Task Scheduler
# It runs thrice daily: 8:00 AM, 2:00 PM, and 8:00 PM.

$TaskName = "VietJetFlightTracker"
$BatchPath = "C:\Users\adapalen\.gemini\antigravity\scratch\vietjet-flight-tracker\run-scraper.bat"

Write-Host "Registering scheduled task '$TaskName' via schtasks..."

# Register daily task starting at 08:00 AM, repeating every 360 minutes (6 hours) for a duration of 12 hours (3 runs: 08:00, 14:00, 20:00)
schtasks.exe /create /tn $TaskName /tr $BatchPath /sc daily /st 08:00 /ri 360 /du 12:00 /f

Write-Host "Task registration completed."
