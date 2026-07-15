const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching browser for Traveloka...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Traveloka flight search...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    // July 25, 2026 search
    const url = 'https://www.traveloka.com/en-vn/flight/search?ap=HAN.SGN&dt=25-7-2026.NA&ps=1.0.0&sc=ECONOMY';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Waiting for results to load...");
    await new Promise(r => setTimeout(r, 15000)); // Wait 15s for flights to load
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '27_traveloka_results.png') });
    console.log("Screenshot 27 saved.");

    const pageText = await page.evaluate(() => {
      return document.body.innerText ? document.body.innerText.substring(0, 2000) : 'No text';
    });
    
    console.log("Traveloka page snippet:");
    console.log(pageText);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
