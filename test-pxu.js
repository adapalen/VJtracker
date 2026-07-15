const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching browser for Google Flights PXU...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Google Flights search...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    
    const url = 'https://www.google.com/travel/flights?q=Flights%20from%20HAN%20to%20PXU%20on%202026-07-25%20oneway';
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });
    
    console.log("Waiting for results to load...");
    await new Promise(r => setTimeout(r, 10000)); // Wait 10s
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '30_google_flights_pxu.png') });
    console.log("Screenshot 30 saved.");

    const pageText = await page.evaluate(() => {
      return document.body.innerText ? document.body.innerText.substring(0, 1500) : 'No text';
    });
    
    console.log("Google Flights PXU page snippet:");
    console.log(pageText);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
