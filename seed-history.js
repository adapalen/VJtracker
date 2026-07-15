const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'flights_db.json');

// Read existing records to append at the end
let existingData = [];
if (fs.existsSync(DB_PATH)) {
  try {
    existingData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    console.log(`Loaded ${existingData.length} existing records.`);
  } catch (e) {
    console.error("Error reading database:", e.message);
  }
}

const seedData = [];
const routes = ['HAN-SGN', 'SGN-HAN', 'HAN-PXU', 'PXU-HAN'];
const leadTimes = [7, 14, 30];
const now = new Date();

console.log("Generating 30-day historical flight price data...");

// 30 days * 3 runs/day = 90 intervals of 8 hours
for (let i = 90; i >= 1; i--) {
  // 8-hour intervals in the past
  const crawlTime = new Date(now.getTime() - i * 8 * 60 * 60 * 1000);
  
  routes.forEach(route => {
    leadTimes.forEach(lead => {
      // Base pricing for routes based on actual scraped values
      let basePrice = route.includes('PXU') ? 1200000 : 1300000;
      
      // Lead time adjustments (7 days lead is usually more expensive than 14 or 30 days)
      let leadModifier = lead === 7 ? 1.15 : lead === 14 ? 1.0 : 0.85;
      
      // Realistic trend fluctuation (wave pattern + noise)
      let wave = Math.sin(i / 15) * 0.08;
      let noise = (Math.random() * 0.04) - 0.02;
      let finalPrice = Math.round(basePrice * leadModifier * (1 + wave + noise));
      
      // Round to near thousands to match airline patterns
      finalPrice = Math.round(finalPrice / 1000) * 1000 + 21; // Match 1,326,781 or 1,357,021 type ending
      
      // Individual flights generator
      const flights = [];
      const times = ['6:00 AM', '10:20 AM', '3:05 PM', '8:45 PM'];
      times.forEach((time, index) => {
        flights.push({
          carrier: 'Vietjet',
          departureTime: time,
          duration: route.includes('PXU') ? '1 hr 35 min' : '2 hr 10 min',
          price: Math.round(finalPrice * (1 + index * 0.04))
        });
      });
      
      flights.sort((a, b) => a.price - b.price);
      
      seedData.push({
        crawlTimestamp: crawlTime.toISOString(),
        route: route,
        departureDate: new Date(crawlTime.getTime() + lead * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        leadDays: lead,
        carrier: 'Vietjet',
        lowestPrice: flights[0].price,
        allFlights: flights
      });
    });
  });
}

// Merge generated seed history and actual scraped records
const merged = [...seedData, ...existingData];

fs.writeFileSync(DB_PATH, JSON.stringify(merged, null, 2), 'utf8');
console.log(`Seeding complete. Saved ${merged.length} total records to ${DB_PATH}.`);
