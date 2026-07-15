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

    // Select Origin HAN first (since To input might be disabled or hidden until From is selected)
    console.log("Selecting Origin HAN...");
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.click(originSelector);
    await new Promise(r => setTimeout(r, 500));
    await page.type(originSelector, 'HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      const opt = divs.find(d => d.innerText && d.innerText.includes('Hanoi') && d.innerText.includes('HAN'));
      if (opt) opt.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Now click destination input and type SGN
    console.log("Clicking Destination input...");
    await page.click('#arrivalPlaceDesktop');
    await new Promise(r => setTimeout(r, 500));
    
    console.log("Typing 'SGN'...");
    await page.type('#arrivalPlaceDesktop', 'SGN', { delay: 100 });
    await new Promise(r => setTimeout(r, 2000));

    await page.screenshot({ path: path.join(ARTIFACT_DIR, '11_sgn_typed.png') });
    console.log("Screenshot 11 saved.");

    // Dump dropdown elements
    const elements = await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      return divs
        .map(d => ({
          tagName: d.tagName,
          className: d.className,
          innerText: d.innerText || ''
        }))
        .filter(d => d.innerText.includes('SGN') || d.innerText.includes('Chi Minh') || d.innerText.includes('Pleiku') || d.innerText.includes('PXU'))
        .slice(0, 30);
    });
    console.log("Found SGN/PXU elements:", elements);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
