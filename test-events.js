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
    
    // Click the row containing HAN using mousedown and click
    const originClicked = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div'));
      const row = divs.find(d => d.innerText && d.innerText.includes('HAN') && d.innerText.includes('Ha Noi') && d.innerText.includes('Airport') && d.className.includes('MuiBox-root'));
      if (row) {
        // Dispatch all mouse events to be sure
        const events = ['mouseenter', 'mouseover', 'mousedown', 'mouseup', 'click'];
        events.forEach(evtName => {
          const e = new MouseEvent(evtName, {
            bubbles: true,
            cancelable: true,
            view: window
          });
          row.dispatchEvent(e);
        });
        return true;
      }
      return false;
    });
    console.log("Origin row mouse events dispatched:", originClicked);
    await new Promise(r => setTimeout(r, 2000));

    // Take screenshot
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '14_origin_events_clicked.png') });
    console.log("Screenshot 14 saved.");

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
