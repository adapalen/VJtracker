const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 1000 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Vietjet...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto('https://www.vietjetair.com/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // Accept cookies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) agree.click();
    });
    await new Promise(r => setTimeout(r, 1000));
    
    // Close modal if exists
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, button, span, p'));
      const later = divs.find(d => d.innerText === 'Later');
      if (later) later.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Select Origin HAN
    console.log("Typing Origin HAN...");
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.click(originSelector);
    await new Promise(r => setTimeout(r, 500));
    await page.type(originSelector, 'HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    
    // Click the exact "HAN" element
    const originClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, li, p, span, button'));
      const hanEl = elements.find(el => el.innerText && el.innerText.trim() === 'HAN');
      if (hanEl) {
        hanEl.click();
        return true;
      }
      return false;
    });
    console.log("Origin HAN clicked:", originClicked);
    await new Promise(r => setTimeout(r, 1500));

    // Now click destination input and type SGN
    console.log("Typing Destination SGN...");
    await page.click('#arrivalPlaceDesktop');
    await new Promise(r => setTimeout(r, 500));
    await page.type('#arrivalPlaceDesktop', 'SGN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));

    // Click the exact "SGN" element
    const destClicked = await page.evaluate(() => {
      const elements = Array.from(document.querySelectorAll('div, li, p, span, button'));
      const sgnEl = elements.find(el => el.innerText && el.innerText.trim() === 'SGN');
      if (sgnEl) {
        sgnEl.click();
        return true;
      }
      return false;
    });
    console.log("Destination SGN clicked:", destClicked);
    await new Promise(r => setTimeout(r, 1500));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '12_select_by_code.png') });
    console.log("Screenshot 12 saved.");

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
