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
      const listItems = Array.from(document.querySelectorAll('[role="listitem"]'));
      const results = [];
      
      for (const item of listItems) {
        const text = item.innerText || '';
        // Let's filter for items containing Vietjet or other airlines
        if (text.includes('Vietjet') || text.includes('Vietnam Airlines') || text.includes('Vietravel Airlines') || text.includes('Bamboo')) {
          const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
          
          // Try to locate price
          // Prices in VND usually contain "₫" or look like a number with commas
          const priceLine = lines.find(l => l.includes('₫') || l.includes('VND') || /^\d{1,3}(,\d{3})+$/.test(l));
          if (!priceLine) continue;
          
          // Try to locate time line (usually contains a dash like '7:10 AM – 8:45 AM' or '10:20 – 11:55')
          const timeLine = lines.find(l => l.includes('–') || l.includes('-'));
          
          // Find carrier
          const carrier = lines.find(l => l.includes('Vietjet') || l.includes('Vietnam Airlines') || l.includes('Vietravel Airlines') || l.includes('Bamboo'));
          
          results.push({
            carrier,
            time: timeLine || '',
            price: priceLine,
            raw: lines
          });
        }
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
