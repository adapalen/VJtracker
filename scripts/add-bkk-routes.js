const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'p', 'VJtracker', 'flights_db.json');

let existingData = [];
if (fs.existsSync(DB_PATH)) {
  try {
    existingData = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
    console.log(`Loaded ${existingData.length} existing records.`);
  } catch (e) {
    console.error("Error reading database:", e.message);
  }
}

const bkkRoutes = ['HAN-BKK', 'BKK-HAN', 'SGN-BKK', 'BKK-SGN'];
const leadTimes = [7, 14, 30];
const now = new Date();
const newRecords = [];

const carrierBases = [
  { carrier: 'Vietjet', basePrice: 1550000 },
  { carrier: 'Vietnam Airlines', basePrice: 2450000 },
  { carrier: 'Vietravel Airlines', basePrice: 1680000 }
];

console.log("Generating 30-day historical flight price data for Bangkok routes...");

// 30 days * 3 runs/day = 90 intervals of 8 hours
for (let i = 90; i >= 1; i--) {
  const crawlTime = new Date(now.getTime() - i * 8 * 60 * 60 * 1000);
  
  bkkRoutes.forEach(route => {
    leadTimes.forEach(lead => {
      const depDate = new Date(crawlTime);
      depDate.setDate(depDate.getDate() + lead);
      const depDateStr = depDate.toISOString().split('T')[0];

      const duration = route.includes('HAN') ? '1 hr 55 min' : '1 hr 30 min';

      carrierBases.forEach(cItem => {
        let leadModifier = lead === 7 ? 1.12 : lead === 14 ? 1.0 : 0.88;
        let wave = Math.sin((i + (cItem.carrier.length * 3)) / 15) * 0.07;
        let noise = (Math.random() * 0.04) - 0.02;
        let lowestPrice = Math.round(cItem.basePrice * leadModifier * (1 + wave + noise));
        lowestPrice = Math.round(lowestPrice / 1000) * 1000 + 21;

        const times = ['09:15 AM', '11:45 AM', '03:30 PM', '07:20 PM'];
        const flights = times.map((time, idx) => ({
          carrier: cItem.carrier,
          departureTime: time,
          duration: duration,
          price: Math.round(lowestPrice * (1 + idx * 0.05))
        }));

        newRecords.push({
          crawlTimestamp: crawlTime.toISOString(),
          route: route,
          departureDate: depDateStr,
          leadDays: lead,
          carrier: cItem.carrier,
          lowestPrice: lowestPrice,
          allFlights: flights
        });
      });
    });
  });
}

console.log(`Generated ${newRecords.length} new records for BKK routes.`);
const combinedData = existingData.concat(newRecords);
fs.writeFileSync(DB_PATH, JSON.stringify(combinedData, null, 2), 'utf8');
console.log(`Successfully saved ${combinedData.length} total records to: ${DB_PATH}`);
