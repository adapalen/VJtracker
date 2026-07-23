const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'p', 'VJtracker', 'flights_db.json');

if (!fs.existsSync(DB_PATH)) {
  console.error("Database file not found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
const bkkRoutes = ['HAN-BKK', 'BKK-HAN', 'SGN-BKK', 'BKK-SGN'];

const filteredData = data.filter(item => {
  if (bkkRoutes.includes(item.route) && item.carrier === 'Bamboo Airways') {
    return false;
  }
  return true;
});

console.log(`Removed ${data.length - filteredData.length} invalid Bamboo Airways records for BKK routes.`);
fs.writeFileSync(DB_PATH, JSON.stringify(filteredData, null, 2), 'utf8');
console.log(`Updated database saved with ${filteredData.length} records.`);
