const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

(async () => {
  console.log("Launching browser for parsing test...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    const url = 'https://www.google.com/travel/flights?q=Flights%20from%20HAN%20to%20PXU%20on%202026-07-25%20oneway';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Waiting for results to load...");
    await new Promise(r => setTimeout(r, 10000));
    
    console.log("Parsing flight elements...");
    const flights = await page.evaluate(() => {
      const listItems = Array.from(document.querySelectorAll('li.pIav2d'));
      const results = [];
      
      for (const item of listItems) {
        const text = item.innerText || '';
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        
        // Find price
        const priceLine = lines.find(l => l.includes('₫') || l.includes('VND') || /^\d{1,3}(,\d{3})+$/.test(l));
        if (!priceLine) continue;
        
        // Find carrier
        const carrierLine = lines.find(l => l.includes('Vietjet') || l.includes('Vietnam Airlines') || l.includes('Vietravel') || l.includes('Bamboo'));
        if (!carrierLine) continue;
        
        // Find route
        const routeLine = lines.find(l => /^[A-Za-z]{3}[–-][A-Za-z]{3}$/.test(l) || l.includes('HAN') || l.includes('PXU') || l.includes('SGN'));
        
        // Find time
        const times = lines.filter(l => l.includes('AM') || l.includes('PM') || /^\d{1,2}:\d{2}/.test(l));
        let timeString = '';
        if (times.length >= 2) {
          timeString = `${times[0]} - ${times[1]}`;
        } else {
          const dashLine = lines.find(l => l.includes('–') || l.includes('-'));
          if (dashLine) timeString = dashLine;
        }
        
        // Find duration
        const durationLine = lines.find(l => l.includes('hr') || l.includes('min'));
        
        const priceVal = parseInt(priceLine.replace(/[^\d]/g, ''), 10);
        
        results.push({
          carrier: carrierLine,
          time: timeString,
          duration: durationLine || '',
          priceText: priceLine,
          priceValue: priceVal,
          route: routeLine || '',
          raw: lines
        });
      }
      return results;
    });

    console.log("--- PARSED FLIGHTS ---");
    console.log(JSON.stringify(flights, null, 2));

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
