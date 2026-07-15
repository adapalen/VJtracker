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
    
    // Accept cookies
    await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'));
      const agree = buttons.find(b => b.innerText.includes('Agree') || b.innerText.includes('Accept'));
      if (agree) agree.click();
    });
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

    // Select Origin
    const originSelector = 'input:not(#arrivalPlaceDesktop).MuiInputBase-input.MuiOutlinedInput-input';
    await page.click(originSelector);
    await new Promise(r => setTimeout(r, 500));
    await page.type(originSelector, 'HAN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      const hanoiOpt = divs.find(d => d.innerText && d.innerText.includes('Hanoi') && d.innerText.includes('HAN'));
      if (hanoiOpt) hanoiOpt.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Select Destination
    await page.click('#arrivalPlaceDesktop');
    await new Promise(r => setTimeout(r, 500));
    await page.type('#arrivalPlaceDesktop', 'SGN', { delay: 100 });
    await new Promise(r => setTimeout(r, 1500));
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, li, p, span'));
      const sgnOpt = divs.find(d => d.innerText && d.innerText.includes('Ho Chi Minh') && d.innerText.includes('SGN'));
      if (sgnOpt) sgnOpt.click();
    });
    await new Promise(r => setTimeout(r, 1000));

    // Open date picker
    await page.evaluate(() => {
      const divs = Array.from(document.querySelectorAll('div, p, span'));
      const deptDateEl = divs.find(d => d.innerText === 'Departure date');
      if (deptDateEl) deptDateEl.click();
    });
    await new Promise(r => setTimeout(r, 1500));

    // Dump days structure inside rdrCalendarWrapper
    const daysInfo = await page.evaluate(() => {
      const calendar = document.querySelector('.rdrCalendarWrapper');
      if (!calendar) return "No calendar wrapper found";
      
      // Let's get all buttons or elements with day-like classes inside calendar
      const dayElements = Array.from(calendar.querySelectorAll('button, .rdrDay, .rdrDayNumber'));
      return dayElements.map(el => ({
        tagName: el.tagName,
        className: el.className,
        innerText: el.innerText,
        disabled: el.disabled || false,
        ariaLabel: el.getAttribute('aria-label') || ''
      })).slice(0, 40);
    });
    
    console.log("Days info in calendar:", daysInfo);

  } catch (err) {
    console.error("Error occurred:", err);
  } finally {
    await browser.close();
    console.log("Browser closed.");
  }
})();
