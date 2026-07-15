const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const path = require('path');

puppeteer.use(StealthPlugin());

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching local browser to verify dashboard...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1200, height: 1200 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to http://localhost:3000...");
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle2', timeout: 30000 });
    
    console.log("Waiting for charts to render (5s)...");
    await new Promise(r => setTimeout(r, 5000));
    
    const screenshotPath = path.join(ARTIFACT_DIR, '31_dashboard_preview.png');
    await page.screenshot({ path: screenshotPath });
    console.log(`Screenshot saved to: ${screenshotPath}`);

    const info = await page.evaluate(() => {
      return {
        title: document.title,
        h1: document.querySelector('h1')?.innerText,
        tableRows: document.querySelectorAll('#table-body tr').length,
        canvasVisible: !!document.getElementById('priceChart')
      };
    });

    console.log("Dashboard verification info:");
    console.log(JSON.stringify(info, null, 2));

  } catch (err) {
    console.error("Verification failed:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
