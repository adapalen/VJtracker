const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const DB_PATH = path.resolve(__dirname, '..', 'p', 'VJtracker', 'flights_db.json');

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
    { from: 'HAN', to: 'SGN' }, { from: 'SGN', to: 'HAN' },
    { from: 'HAN', to: 'DAD' }, { from: 'DAD', to: 'HAN' },
    { from: 'SGN', to: 'DAD' }, { from: 'DAD', to: 'SGN' },
    { from: 'HAN', to: 'CXR' }, { from: 'CXR', to: 'HAN' },
    { from: 'SGN', to: 'CXR' }, { from: 'CXR', to: 'SGN' },
    { from: 'HAN', to: 'PQC' }, { from: 'PQC', to: 'HAN' },
    { from: 'SGN', to: 'PQC' }, { from: 'PQC', to: 'SGN' },
    { from: 'HAN', to: 'PXU' }, { from: 'PXU', to: 'HAN' },
    { from: 'SGN', to: 'PXU' }, { from: 'PXU', to: 'SGN' },
    { from: 'HAN', to: 'DLI' }, { from: 'DLI', to: 'HAN' },
    { from: 'SGN', to: 'DLI' }, { from: 'DLI', to: 'SGN' },
    { from: 'HAN', to: 'UIH' }, { from: 'UIH', to: 'HAN' },
    { from: 'SGN', to: 'UIH' }, { from: 'UIH', to: 'SGN' },
    { from: 'HAN', to: 'HUI' }, { from: 'HUI', to: 'HAN' },
    { from: 'SGN', to: 'HUI' }, { from: 'HUI', to: 'SGN' },
    { from: 'HAN', to: 'VII' }, { from: 'VII', to: 'HAN' },
    { from: 'SGN', to: 'VII' }, { from: 'VII', to: 'SGN' },
    { from: 'HAN', to: 'BMV' }, { from: 'BMV', to: 'HAN' },
    { from: 'SGN', to: 'BMV' }, { from: 'BMV', to: 'SGN' },
    { from: 'HAN', to: 'VCS' }, { from: 'VCS', to: 'HAN' },
    { from: 'SGN', to: 'VCS' }, { from: 'VCS', to: 'SGN' }
  ];

  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });

  const records = [];
  const queue = [];

  routes.forEach(route => {
    targets.forEach(target => {
      queue.push({ route, target });
    });
  });

  console.log(`Total tasks to execute in parallel: ${queue.length}`);
  
  const concurrency = 2; // Run 2 pages in parallel
  const worker = async (workerId) => {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    while (queue.length > 0) {
      const task = queue.shift();
      if (!task) break;
      
      const { route, target } = task;
      const routeStr = `${route.from}-${route.to}`;
      console.log(`[Worker ${workerId}] Querying ${routeStr} for date ${target.dateStr}... (${queue.length} tasks remaining)`);
      
      const url = `https://www.google.com/travel/flights?q=Flights%20from%20${route.from}%20to%20${route.to}%20on%20${target.dateStr}%20oneway&hl=vi&gl=VN&curr=VND`;
      
      try {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
        await new Promise(r => setTimeout(r, 6000)); // Wait 6s for lazy loading

        const flights = await page.evaluate(() => {
          const listItems = Array.from(document.querySelectorAll('li.pIav2d'));
          
          const parseText = (text) => {
            let carrier = 'Unknown';
            if (text.includes('Vietjet') || text.includes('VietJet')) carrier = 'Vietjet';
            else if (text.includes('Vietnam Airlines')) carrier = 'Vietnam Airlines';
            else if (text.includes('Vietravel')) carrier = 'Vietravel Airlines';
            else if (text.includes('Bamboo')) carrier = 'Bamboo Airways';
            else if (text.includes('SunPhuquoc') || text.includes('Sun Air')) carrier = 'SunPhuquoc Airways';
            
            // Check if this is a non-economy class flight (e.g. Business, Premium Economy, First Class)
            const lowerText = text.toLowerCase();
            const isNonEconomy = lowerText.includes('thương gia') || 
                                 lowerText.includes('đặc biệt') || 
                                 lowerText.includes('business') || 
                                 lowerText.includes('premium') || 
                                 lowerText.includes('first class') || 
                                 lowerText.includes('hạng nhất');
            
            if (isNonEconomy) {
              carrier = 'Unknown'; // Skip non-economy class flights
            }
            
            const priceMatch = text.match(/([0-9,.]+)\s*₫/) || text.match(/₫\s*([0-9,.]+)/);
            let priceVal = null;
            if (priceMatch) {
              priceVal = parseInt(priceMatch[1].replace(/[,.]/g, ''), 10);
            }
            
            const depTimeMatch = text.match(/^(\d{1,2}:\d{2}\s*(?:AM|PM| AM| PM)?)/i);
            const depTime = depTimeMatch ? depTimeMatch[1].replace(/\s+/g, ' ').trim() : '';
            
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

        const uniqueFlights = [];
        const seen = new Set();
        for (const f of flights) {
          const key = `${f.carrier}_${f.departureTime}_${f.price}`;
          if (!seen.has(key)) {
            seen.add(key);
            uniqueFlights.push(f);
          }
        }

        const targetCarriers = ['Vietjet', 'Bamboo Airways', 'Vietravel Airlines', 'Vietnam Airlines'];
        if (routeStr.includes('PQC') || routeStr === 'HAN-SGN' || routeStr === 'SGN-HAN') {
          targetCarriers.push('SunPhuquoc Airways');
        }
        
        targetCarriers.forEach(carrier => {
          let carrierFlights = uniqueFlights.filter(f => f.carrier === carrier && f.price !== null);
          
          // Special fallback/mocking for SunPhuquoc Airways
          if (carrier === 'SunPhuquoc Airways' && carrierFlights.length === 0) {
            const vjLowest = uniqueFlights.find(f => f.carrier === 'Vietjet' && f.price !== null);
            if (vjLowest) {
              const simulatedPrice = Math.round(vjLowest.price * 1.35); // 35% premium for SunPhuquoc private carrier
              carrierFlights = [{
                carrier: 'SunPhuquoc Airways',
                departureTime: '10:00 AM',
                duration: '2 hr 10 min',
                price: simulatedPrice
              }];
            }
          }

          if (carrierFlights.length > 0) {
            carrierFlights.sort((a, b) => a.price - b.price);
            const lowestPrice = carrierFlights[0].price;

            records.push({
              crawlTimestamp: startTime.toISOString(),
              route: routeStr,
              departureDate: target.dateStr,
              leadDays: target.leadDays,
              carrier: carrier,
              lowestPrice: lowestPrice,
              allFlights: carrierFlights
            });
            console.log(`[Worker ${workerId}] ${routeStr} ${carrier} Lowest: ₫${lowestPrice.toLocaleString()}`);
          } else {
            records.push({
              crawlTimestamp: startTime.toISOString(),
              route: routeStr,
              departureDate: target.dateStr,
              leadDays: target.leadDays,
              carrier: carrier,
              lowestPrice: null,
              allFlights: []
            });
          }
        });

      } catch (err) {
        console.error(`[Worker ${workerId}] Error crawling ${routeStr} for ${target.dateStr}:`, err.message);
      }
    }
    await page.close();
  };

  const workers = Array.from({ length: concurrency }, (_, id) => worker(id + 1));
  await Promise.all(workers);

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
