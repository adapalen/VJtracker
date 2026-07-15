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
      
      const parseText = (text) => {
        let carrier = 'Unknown';
        if (text.includes('Vietjet')) carrier = 'Vietjet';
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

      return listItems.map(item => {
        const text = item.innerText || '';
        return parseText(text);
      });
    });

    console.log("--- PARSED FLIGHTS V3 ---");
    console.log(JSON.stringify(flights, null, 2));

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
