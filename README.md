# VietJet Flight Price Tracker

A flight price tracking system that crawls flight prices for VietJet Air routes, logs them to a database thrice daily, and provides a premium local analytics dashboard showing recommendations and historical trends.

---

## 1. Project Directory Structure
Key files:
1. **`scraper.js`**: Puppeteer script that scrapes VietJet prices from Google Flights. Upgraded with 42 popular domestic routes and a concurrent worker pool (2 workers) that scrapes pages in parallel.
2. **`flights_db.json`**: Local database containing captured price history (over 11,000 runs spanning the last 30 days for all routes).
3. **`run-scraper.bat`**: Batch file to run the scraper and log console outputs.
4. **`setup-schedule.ps1`**: PowerShell script that registers the background task in Windows Task Scheduler.
5. **`server.js`**: Zero-dependency local web server to host the dashboard.
6. **`run-dashboard.bat`**: Batch file that launches the server and opens the dashboard in your default browser.
7. **`index.html`, `style.css`, `app.js`**: The premium dark-mode visual dashboard layout and interactive analytics charting. Supports Vietnamese translation, light/dark mode toggling, dynamic stats card rendering based on the selected route, and separated Departure/Arrival selectors.
8. **`.github/workflows/scrape.yml`**: GitHub Actions workflow that runs the scraper 3x/day automatically in the cloud.

---

## 2. Visual Features

### Dashboard Overview
- **Visual Excellence**: Deep purple radial gradient background with glassmorphism card overlays, custom HSL styling, and Outfit typography.
- **Dynamic Stats Cards**: Updates average prices, historic minimums, latest price, and buying recommendations dynamically based on the selected route.
- **Separated Route Selectors**: Split dropdown menu for Departure and Arrival destinations. The Arrival dropdown dynamically shortlists based on the selected Departure airport to prevent invalid route selections.
- **Interactive Analytics**: Interactive line charts using Chart.js to track price changes over the past 30 days.
- **Diagnostics FAQs**: Drop-down accordion menus containing raw flight log data and helpful configuration information.

---

## 3. How to Run & Verify

### Step 1: Query Flight Prices Manually
To execute a manual scrape run and append data to the database:
```powershell
node scraper.js
```

### Step 2: Launch the Analytics Dashboard
To start the dashboard HTTP server and view the charts:
1. Double-click the **`run-dashboard.bat`** batch script.
2. It will open `http://localhost:3000` in your default web browser automatically.

### Step 3: Register Background 3x/Daily Scrapes
To ensure the scraper runs automatically three times a day (at 8:00 AM, 2:00 PM, and 8:00 PM local time):
1. Open PowerShell as Administrator.
2. Navigate to the folder and run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File setup-schedule.ps1
   ```

---

## 4. GitHub Actions Cloud Deployment
The repository is configured to scrape flight data completely in the cloud using GitHub Actions. To deploy:
1. Push your code to your GitHub repository.
2. On GitHub, navigate to **Settings** &rarr; **Actions** &rarr; **General** and verify **Workflow permissions** is set to **Read and write permissions**.
3. Enable **GitHub Pages** pointing to the `main` branch root folder `/` in **Settings** &rarr; **Pages**.
4. The workflow will run thrice daily, updating your database, and rebuilding the site automatically!
