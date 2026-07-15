const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const DB_PATH = path.join(__dirname, 'flights_db.json');

// Helper to format date as YYYY-MM-DD
function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

(async () => {
  const startTime = new Date();
  console.log(`Starting crawl at: ${startTime.toISOString()}`);

  // Generate target dates (7, 14, 30 days out)
  const leadTimes = [7, 14, 30];
  const targets = leadTimes.map(days => {
    const d = new Date(startTime);
    d.setDate(d.getDate() + days);
    return {
      leadDays: days,
      dateStr: formatDate(d)
    };
  });

  console.log("Target dates to query:");
  targets.forEach(t => console.log(`  - In ${t.leadDays} days: ${t.dateStr}`));

  const routes = [
    { from: 'HAN', to: 'SGN' },
    { from: 'SGN', to: 'HAN' },
    { from: 'HAN', to: 'PXU' },
    { from: 'PXU', to: 'HAN' }
  ];

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });

  const page = await browser.newPage();
  await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");

  const records = [];

  for (const route of routes) {
    for (const target of targets) {
      const routeStr = `${route.from}-${route.to}`;
      console.log(`\nQuerying ${routeStr} for date ${target.dateStr}...`);
      
      const url = `https://www.google.com/travel/flights?q=Flights%20from%20${route.from}%20to%20${route.to}%20on%20${target.dateStr}%20oneway`;
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 8000)); // Wait 8s for lazy loading content

        const flights = await page.evaluate(() => {
          const listItems = Array.from(document.querySelectorAll('li.pIav2d'));
          
          const parseText = (text) => {
            let carrier = 'Unknown';
            if (text.includes('Vietjet') || text.includes('VietJet')) carrier = 'Vietjet';
            else if (text.includes('Vietnam Airlines')) carrier = 'Vietnam Airlines';
            else if (text.includes('Vietravel')) carrier = 'Vietravel Airlines';
            else if (text.includes('Bamboo')) carrier = 'Bamboo Airways';
            
            // Match price like ₫1,326,781 or 1,326,781
            const priceMatch = text.match(/₫\s*([0-9,.]+)/) || text.match(/([0-9,.]+)\s*₫/);
            let priceVal = null;
            if (priceMatch) {
              priceVal = parseInt(priceMatch[1].replace(/[,.]/g, ''), 10);
            }
            
            // Match departure time from start of string
            const depTimeMatch = text.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM| AM| PM)?)/i);
            const depTime = depTimeMatch ? depTimeMatch[1].replace(/\s+/g, ' ').trim() : '';
            
            // Match duration (e.g., "1 hr 35 min")
            const durMatch = text.match(/(\d+\s*hr\s*\d+\s*min|\d+\s*hr|\d+\s*min)/);
            const duration = durMatch ? durMatch[1] : '';
            
            return {
              carrier,
              departureTime: depTime,
              duration,
              price: priceVal
            };
          };

          return listItems.map(item => parseText(item.innerText || ''));
        });

        // Deduplicate flights
        const uniqueFlights = [];
        const seen = new Set();
        for (const f of flights) {
          const key = `${f.carrier}_${f.departureTime}_${f.price}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueFlights.push(f);
          }
        }

        // Filter for VietJet flights
        const vietjetFlights = uniqueFlights.filter(f => f.carrier === 'Vietjet' && f.price !== null);
        console.log(`Found ${uniqueFlights.length} total flights, including ${vietjetFlights.length} Vietjet flights.`);

        if (vietjetFlights.length > 0) {
          // Find lowest VietJet price
          vietjetFlights.sort((a, b) => a.price - b.price);
          const lowestPrice = vietjetFlights[0].price;

          const record = {
            crawlTimestamp: startTime.toISOString(),
            route: routeStr,
            departureDate: target.dateStr,
            leadDays: target.leadDays,
            carrier: 'Vietjet',
            lowestPrice: lowestPrice,
            allFlights: vietjetFlights
          };

          records.push(record);
          console.log(`Lowest Vietjet price: ₫${lowestPrice.toLocaleString()}`);
        } else {
          console.log("No Vietjet flights found with valid pricing.");
          records.push({
            crawlTimestamp: startTime.toISOString(),
            route: routeStr,
            departureDate: target.dateStr,
            leadDays: target.leadDays,
            carrier: 'Vietjet',
            lowestPrice: null,
            allFlights: []
          });
        }

      } catch (err) {
        console.error(`Error crawling ${routeStr} for ${target.dateStr}:`, err.message);
      }
    }
  }

  await browser.close();
  console.log("\nCrawl complete. Saving data...");

  // Read existing database if it exists
  let dbData = [];
  if (fs.existsSync(DB_PATH)) {
    try {
      const raw = fs.readFileSync(DB_PATH, 'utf8');
      dbData = JSON.parse(raw);
    } catch (e) {
      console.error("Error reading database file, starting fresh:", e.message);
    }
  }

  // Append new records
  dbData.push(...records);

  // Write back to database
  fs.writeFileSync(DB_PATH, JSON.stringify(dbData, null, 2), 'utf8');
  console.log(`Added ${records.length} records to ${DB_PATH}.`);

})();
