const puppeteer = require('puppeteer');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/thanh/.gemini/antigravity/brain/abb313f0-e6c8-411b-9c3d-f6ffe373bb1e';

(async () => {
  console.log("Launching browser...");
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1280, height: 800 }
  });
  
  try {
    const page = await browser.newPage();
    console.log("Navigating to Vietjet...");
    await page.setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36");
    await page.goto('https://www.vietjetair.com/en', { waitUntil: 'networkidle2', timeout: 60000 });
    
    // 1. Accept cookies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) agree.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // 2. Click "Later" on the offer popup if it exists
    const closedOffer = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, button, span, p'));
      const later = divs.find(d => d.innerText === 'Later');
      if (later) {
        later.click();
        return true;
      }
      return false;
    });
    console.log("Closed offer popup:", closedOffer);
    await new Promise(r => setTimeout(r, 1000));
    
    // Select One-Way
    await page.evaluate(() => {
      const inputs = Array.from(document.querySelectorAll('input[type="radio"]'));
      const oneway = inputs.find(i => i.value === 'oneway');
      if (oneway) {
        oneway.click();
        oneway.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
    await new Promise(r => setTimeout(r, 1000));

    // Click Origin Input
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.click(originSelector);
    await new Promise(r => setTimeout(r, 1000));
    
    // Clear and type "HAN"
    console.log("Typing 'HAN'...");
    await page.type(originSelector, 'HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 2000)); // wait for dropdown to filter
    
    await page.screenshot({ path: path.join(ARTIFACT_DIR, '09_han_typed.png') });
    console.log("Screenshot 9 saved.");

    // Dump dropdown contents
    const dropdownContents = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      return divs
        .map(d => ({
          tagName: d.tagName,
          className: d.className,
          innerText: d.innerText || ''
        }))
        .filter(d => d.innerText.includes('Hanoi') || d.innerText.includes('HAN'))
        .slice(0, 20);
    });
    console.log("Dropdown elements containing HAN/Hanoi:", dropdownContents);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
